import SwiftUI
import SwiftData

@Observable
final class ChatViewModel {
    var messages: [ChatMessage] = []
    var isTyping = false
    var errorMessage: String?
    var errorBanner: String?
    var currentConversationId: String?
    var currentCharacterId: UUID?
    var currentPersonaId: UUID?

    // MARK: - Conversation Lifecycle

    func loadConversation(character: Character, persona: Persona?) async {
        guard let userId = AuthService.shared.currentUser?.id else {
            currentCharacterId = nil
            currentPersonaId = nil
            messages = []
            return
        }

        currentCharacterId = character.id
        currentPersonaId = persona?.id

        // Ensure a local Conversation record exists
        let localConvo = await ensureLocalConversation(character: character, persona: persona, userId: userId)

        do {
            let convos = try await ChatService.shared.fetchConversations()
            if let convo = convos.first(where: { $0.title?.contains(character.name) == true }) {
                currentConversationId = convo.id
                if let local = localConvo {
                    await updateLocalConversation(local, remoteId: convo.id, title: convo.title ?? character.name)
                }
                let msgs = try await ChatService.shared.fetchMessages(conversationId: convo.id)
                await MainActor.run {
                    self.messages = msgs
                    for msg in msgs {
                        self.cacheMessage(msg, conversationId: convo.id, userId: userId)
                    }
                }
            }
        } catch {
            // Fallback to cached messages if remote fails
            if let local = localConvo {
                let cached = await loadCachedMessages(conversationId: local.remoteId, userId: userId)
                await MainActor.run {
                    self.messages = cached
                }
            }
            errorMessage = error.localizedDescription
            errorBanner = error.localizedDescription
        }
    }

    // MARK: - Message Sending

    func sendMessage(_ text: String, character: Character, persona: Persona?) async {
        guard !text.trimmingCharacters(in: .whitespaces).isEmpty else { return }
        guard let userId = AuthService.shared.currentUser?.id else { return }
        isTyping = true
        defer { isTyping = false }

        let userMessage = ChatMessage(
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
            await cacheMessage(userMessage, conversationId: convoId, userId: userId)
            await updateConversationPreview(conversationId: convoId, preview: text, userId: userId)
        }

        let journals = await triggeredJournalEntries(character: character, userMessage: text, userId: userId)
        let systemPrompt = await buildSystemPrompt(character: character, persona: persona, triggeredJournals: journals, userId: userId)

        let characterName = character.name
        let assistantId = UUID().uuidString
        let placeholder = ChatMessage(
            id: assistantId,
            text: "",
            sender: characterName,
            isCreatedByUser: false,
            createdAt: ISO8601DateFormatter().string(from: Date())
        )
        await MainActor.run {
            messages.append(placeholder)
        }

        // Build conversation history for OpenAI format
        var chatMessages: [ChatCompletionMessage] = []
        chatMessages.append(ChatCompletionMessage(role: "system", content: systemPrompt))
        for msg in messages where msg.isCreatedByUser || msg.id != assistantId {
            chatMessages.append(ChatCompletionMessage(role: msg.isCreatedByUser ? "user" : "assistant", content: msg.text))
        }
        // Ensure the last message is the current user message
        if chatMessages.last?.content != text {
            chatMessages.append(ChatCompletionMessage(role: "user", content: text))
        }

        do {
            let stream = ChatService.shared.sendMessageStream(
                messages: chatMessages
            )

            for try await event in stream {
                switch event {
                case .delta(let deltaText):
                    await MainActor.run {
                        if let index = messages.firstIndex(where: { $0.id == assistantId }) {
                            messages[index] = ChatMessage(
                                id: assistantId,
                                text: deltaText,
                                sender: characterName,
                                isCreatedByUser: false,
                                createdAt: messages[index].createdAt
                            )
                        }
                    }
                case .done:
                    break
                }
            }

            // Cache final assistant message
            if let finalMessage = messages.first(where: { $0.id == assistantId }) {
                if let convoId = currentConversationId {
                    await cacheMessage(finalMessage, conversationId: convoId, userId: userId)
                    await updateConversationPreview(conversationId: convoId, preview: finalMessage.text, userId: userId)
                }
            }
        } catch {
            await MainActor.run {
                errorMessage = error.localizedDescription
                errorBanner = error.localizedDescription
                if let index = messages.firstIndex(where: { $0.id == assistantId }) {
                    messages.remove(at: index)
                }
            }
        }
    }

    // MARK: - Prompt Building

    @MainActor
    private func buildSystemPrompt(character: Character, persona: Persona?, triggeredJournals: [JournalEntry], userId: UUID) -> String {
        var parts: [String] = []
        parts.append(CharacterStore.shared.effectiveSystemPrompt(character: character, userId: userId))

        if let persona = persona {
            parts.append(persona.formattedUserContext)
        }

        for entry in triggeredJournals {
            parts.append("[[MEMORY triggered by '\(entry.triggerKeyphrase)']] \(entry.content)")
        }

        return parts.joined(separator: "\n\n")
    }

    @MainActor
    private func triggeredJournalEntries(character: Character, userMessage: String, userId: UUID) -> [JournalEntry] {
        guard let entries = try? CharacterStore.shared.fetchJournalEntries(characterId: character.id, userId: userId) else { return [] }
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
    func saveGalleryMoment(message: ChatMessage, conversationId: String, character: Character) {
        guard let userId = AuthService.shared.currentUser?.id else { return }
        let moment = GalleryMoment(
            characterId: character.id,
            userId: userId,
            conversationId: conversationId,
            textExcerpt: message.text,
            caption: "Moment with \(character.name)",
            character: character
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
    private func ensureLocalConversation(character: Character, persona: Persona?, userId: UUID) -> Conversation? {
        let context = SwiftDataContainer.shared.context
        let charId: UUID? = character.id
        let descriptor = FetchDescriptor<Conversation>(
            predicate: #Predicate { $0.characterId == charId && $0.userId == userId }
        )
        if let existing = try? context.fetch(descriptor).first {
            return existing
        }

        let convo = Conversation(
            remoteId: "",
            title: character.name,
            characterId: character.id,
            personaId: persona?.id,
            userId: userId,
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
    private func updateConversationPreview(conversationId: String, preview: String, userId: UUID) {
        let context = SwiftDataContainer.shared.context
        let descriptor = FetchDescriptor<Conversation>(
            predicate: #Predicate { $0.remoteId == conversationId && $0.userId == userId }
        )
        if let convo = try? context.fetch(descriptor).first {
            convo.lastMessagePreview = preview
            convo.lastMessageAt = Date()
            try? context.save()
        }
    }

    @MainActor
    private func cacheMessage(_ message: ChatMessage, conversationId: String, userId: UUID) {
        let context = SwiftDataContainer.shared.context
        let descriptor = FetchDescriptor<MessageWrapper>(
            predicate: #Predicate { $0.id == message.id && $0.conversationId == conversationId && $0.userId == userId }
        )
        if (try? context.fetch(descriptor).first) != nil {
            return // Already cached
        }
        let wrapper = MessageWrapper(message: message, conversationId: conversationId, userId: userId)
        context.insert(wrapper)
        try? context.save()
    }

    @MainActor
    private func loadCachedMessages(conversationId: String, userId: UUID) -> [ChatMessage] {
        let context = SwiftDataContainer.shared.context
        let descriptor = FetchDescriptor<MessageWrapper>(
            predicate: #Predicate { $0.conversationId == conversationId && $0.userId == userId },
            sortBy: [SortDescriptor(\.createdAt)]
        )
        guard let wrappers = try? context.fetch(descriptor) else { return [] }
        return wrappers.map {
            ChatMessage(
                id: $0.id,
                text: $0.text,
                sender: $0.sender,
                isCreatedByUser: $0.isCreatedByUser,
                createdAt: ISO8601DateFormatter().string(from: $0.createdAt)
            )
        }
    }
}
