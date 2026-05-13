import SwiftUI
import SwiftData

@Observable
final class ChatViewModel {
    var messages: [LibreChatMessage] = []
    var isTyping = false
    var errorMessage: String?
    var currentConversationId: String?
    var currentCharacterId: UUID?
    var currentPersonaId: UUID?

    // MARK: - Conversation Lifecycle

    func loadConversation(character: Character, persona: Persona?) async {
        currentCharacterId = character.id
        currentPersonaId = persona?.id

        // Ensure a local Conversation record exists
        let localConvo = await ensureLocalConversation(character: character, persona: persona)

        do {
            let convos = try await ChatService.shared.fetchConversations()
            if let convo = convos.first(where: { $0.title.contains(character.name) }) {
                currentConversationId = convo.id
                if let local = localConvo {
                    await updateLocalConversation(local, remoteId: convo.id, title: convo.title)
                }
                let msgs = try await ChatService.shared.fetchMessages(conversationId: convo.id)
                await MainActor.run {
                    self.messages = msgs
                    for msg in msgs {
                        self.cacheMessage(msg, conversationId: convo.id)
                    }
                }
            }
        } catch {
            // Fallback to cached messages if remote fails
            if let local = localConvo {
                let cached = await loadCachedMessages(conversationId: local.remoteId)
                await MainActor.run {
                    self.messages = cached
                }
            }
            errorMessage = error.localizedDescription
        }
    }

    // MARK: - Message Sending

    func sendMessage(_ text: String, character: Character, persona: Persona?) async {
        guard !text.trimmingCharacters(in: .whitespaces).isEmpty else { return }
        isTyping = true
        defer { isTyping = false }

        let userMessage = LibreChatMessage(
            id: UUID().uuidString,
            text: text,
            sender: persona?.name ?? "User",
            isCreatedByUser: true,
            createdAt: ISO8601DateFormatter().string(from: Date())
        )
        await MainActor.run {
            messages.append(userMessage)
        }

        // Cache user message locally
        if let convoId = currentConversationId {
            await cacheMessage(userMessage, conversationId: convoId)
            await updateConversationPreview(conversationId: convoId, preview: text)
        }

        let journals = triggeredJournalEntries(character: character, userMessage: text)
        let systemPrompt = buildSystemPrompt(character: character, persona: persona, triggeredJournals: journals)

        let characterName = character.name
        let assistantId = UUID().uuidString
        let placeholder = LibreChatMessage(
            id: assistantId,
            text: "",
            sender: characterName,
            isCreatedByUser: false,
            createdAt: ISO8601DateFormatter().string(from: Date())
        )
        await MainActor.run {
            messages.append(placeholder)
        }

        do {
            let stream = ChatService.shared.sendMessageStream(
                text: text,
                conversationId: currentConversationId,
                instructions: systemPrompt,
                personaName: persona?.name
            )

            for try await event in stream {
                switch event {
                case .delta(let deltaText):
                    await MainActor.run {
                        if let index = messages.firstIndex(where: { $0.id == assistantId }) {
                            messages[index] = LibreChatMessage(
                                id: assistantId,
                                text: deltaText,
                                sender: characterName,
                                isCreatedByUser: false,
                                createdAt: messages[index].createdAt
                            )
                        }
                    }
                case .done(let convoId, _):
                    if let convoId = convoId {
                        currentConversationId = convoId
                    }
                }
            }

            // Cache final assistant message
            if let finalMessage = messages.first(where: { $0.id == assistantId }) {
                if let convoId = currentConversationId {
                    await cacheMessage(finalMessage, conversationId: convoId)
                    await updateConversationPreview(conversationId: convoId, preview: finalMessage.text)
                }
            }
        } catch {
            await MainActor.run {
                errorMessage = error.localizedDescription
                if let index = messages.firstIndex(where: { $0.id == assistantId }) {
                    messages[index] = LibreChatMessage(
                        id: assistantId,
                        text: "[Error: \(error.localizedDescription)]",
                        sender: characterName,
                        isCreatedByUser: false,
                        createdAt: messages[index].createdAt
                    )
                }
            }
        }
    }

    // MARK: - Prompt Building

    private func buildSystemPrompt(character: Character, persona: Persona?, triggeredJournals: [JournalEntry]) -> String {
        var parts: [String] = []
        parts.append(character.formattedSystemPrompt)

        if let persona = persona {
            parts.append(persona.formattedUserContext)
        }

        for entry in triggeredJournals {
            parts.append("[[MEMORY triggered by '\(entry.triggerKeyphrase)']] \(entry.content)")
        }

        return parts.joined(separator: "\n\n")
    }

    private func triggeredJournalEntries(character: Character, userMessage: String) -> [JournalEntry] {
        guard let entries = character.journalEntries else { return [] }
        return entries.filter { $0.isTriggered(by: userMessage) }
    }

    // MARK: - Persona Switch

    func switchPersona(to persona: Persona, character: Character) {
        currentPersonaId = persona.id
        Task {
            await loadConversation(character: character, persona: persona)
        }
    }

    // MARK: - Gallery Moments

    @MainActor
    func saveGalleryMoment(message: LibreChatMessage, conversationId: String, character: Character) {
        let moment = GalleryMoment(
            characterId: character.id,
            conversationId: conversationId,
            textExcerpt: message.text,
            caption: "Moment with \(character.name)"
        )
        SwiftDataContainer.shared.context.insert(moment)
        try? SwiftDataContainer.shared.context.save()
    }

    // MARK: - Refresh

    func refreshChat(for character: Character) {
        currentConversationId = nil
        messages = []
        Task {
            await loadConversation(character: character, persona: nil)
        }
    }

    // MARK: - Character Lookup

    @MainActor
    func characterFor(convo: Conversation) -> Character? {
        guard let characterId = convo.characterId else { return nil }
        return try? CharacterStore.shared.fetch(id: characterId)
    }

    // MARK: - Local Persistence Helpers

    @MainActor
    private func ensureLocalConversation(character: Character, persona: Persona?) -> Conversation? {
        let context = SwiftDataContainer.shared.context
        let charId: UUID? = character.id
        let descriptor = FetchDescriptor<Conversation>(
            predicate: #Predicate { $0.characterId == charId }
        )
        if let existing = try? context.fetch(descriptor).first {
            return existing
        }

        let convo = Conversation(
            remoteId: "",
            title: character.name,
            characterId: character.id,
            personaId: persona?.id,
            syncStatus: .pending
        )
        context.insert(convo)
        try? context.save()
        return convo
    }

    @MainActor
    private func updateLocalConversation(_ convo: Conversation, remoteId: String, title: String) {
        convo.remoteId = remoteId
        convo.title = title
        convo.syncStatus = .synced
        try? SwiftDataContainer.shared.context.save()
    }

    @MainActor
    private func updateConversationPreview(conversationId: String, preview: String) {
        let context = SwiftDataContainer.shared.context
        let descriptor = FetchDescriptor<Conversation>(
            predicate: #Predicate { $0.remoteId == conversationId }
        )
        if let convo = try? context.fetch(descriptor).first {
            convo.lastMessagePreview = preview
            convo.lastMessageAt = Date()
            try? context.save()
        }
    }

    @MainActor
    private func cacheMessage(_ message: LibreChatMessage, conversationId: String) {
        let context = SwiftDataContainer.shared.context
        let descriptor = FetchDescriptor<MessageWrapper>(
            predicate: #Predicate { $0.id == message.id && $0.conversationId == conversationId }
        )
        if (try? context.fetch(descriptor).first) != nil {
            return // Already cached
        }
        let wrapper = MessageWrapper(message: message, conversationId: conversationId)
        context.insert(wrapper)
        try? context.save()
    }

    @MainActor
    private func loadCachedMessages(conversationId: String) -> [LibreChatMessage] {
        let context = SwiftDataContainer.shared.context
        let descriptor = FetchDescriptor<MessageWrapper>(
            predicate: #Predicate { $0.conversationId == conversationId },
            sortBy: [SortDescriptor(\.createdAt)]
        )
        guard let wrappers = try? context.fetch(descriptor) else { return [] }
        return wrappers.map {
            LibreChatMessage(
                id: $0.id,
                text: $0.text,
                sender: $0.sender,
                isCreatedByUser: $0.isCreatedByUser,
                createdAt: ISO8601DateFormatter().string(from: $0.createdAt)
            )
        }
    }
}
