import SwiftUI
import SwiftData
import PhotosUI

@Observable
final class CreateCharacterViewModel {
    var name: String = ""
    var subtitle: String = ""
    var backstory: String = ""
    var responseDirective: String = ""
    var keyMemories: String = ""
    var exampleMessage: String = ""
    var greetingMessage: String = ""
    var avatarDescription: String = ""
    var faceDetail: String = ""
    var interactionMode: InteractionMode = .companion
    var dynamism: Double = 1.0
    var category: CharacterCategory = .assistant
    var journalText: String = ""
    var journalEntries: [JournalEntryDraft] = []
    var avatarData: Data? = nil
    var avatarItem: PhotosPickerItem? = nil
    var errorMessage: String?

    struct JournalEntryDraft: Identifiable {
        let id = UUID()
        var triggerKeyphrase: String
        var memory: String
    }

    // MARK: - Journal

    func addJournalEntry() {
        let parts = journalText.split(separator: ":", maxSplits: 1).map(String.init)
        let trigger = parts.first?.trimmingCharacters(in: .whitespaces) ?? ""
        let memory = parts.count > 1 ? parts[1].trimmingCharacters(in: .whitespaces) : journalText
        guard !trigger.isEmpty, !memory.isEmpty else { return }
        journalEntries.append(JournalEntryDraft(triggerKeyphrase: trigger, memory: memory))
        journalText = ""
    }

    func removeJournalEntry(_ entry: JournalEntryDraft) {
        journalEntries.removeAll { $0.id == entry.id }
    }

    // MARK: - Validation

    func validate() -> [String] {
        var errors: [String] = []
        if name.isEmpty { errors.append("Name is required.") }
        if backstory.isEmpty { errors.append("Backstory is required.") }

        if backstory.count > Character.backstoryMaxLength {
            errors.append("Backstory exceeds \(Character.backstoryMaxLength) characters.")
        }
        if responseDirective.count > Character.responseDirectiveMaxLength {
            errors.append("Response Directive exceeds \(Character.responseDirectiveMaxLength) characters.")
        }
        if keyMemories.count > Character.keyMemoriesMaxLength {
            errors.append("Key Memories exceeds \(Character.keyMemoriesMaxLength) characters.")
        }
        if exampleMessage.count > Character.exampleMessageMaxLength {
            errors.append("Example Message exceeds \(Character.exampleMessageMaxLength) characters.")
        }
        if greetingMessage.count > Character.greetingMessageMaxLength {
            errors.append("Greeting Message exceeds \(Character.greetingMessageMaxLength) characters.")
        }
        if avatarDescription.count > Character.avatarDescriptionMaxLength {
            errors.append("Avatar Description exceeds \(Character.avatarDescriptionMaxLength) characters.")
        }
        if faceDetail.count > Character.faceDetailMaxLength {
            errors.append("Face Detail exceeds \(Character.faceDetailMaxLength) characters.")
        }
        return errors
    }

    var isValid: Bool {
        validate().isEmpty
    }

    // MARK: - Live Preview

    var previewSystemPrompt: String {
        let character = buildCharacter()
        return character.formattedSystemPrompt
    }

    // MARK: - Save

    @MainActor
    func save() async {
        let character = buildCharacter()
        let userId = AuthService.shared.currentUser?.id

        do {
            try await CharacterStore.shared.insert(character)

            // Persist journal entries scoped to the creating user
            if let currentUserId = userId {
                for draft in journalEntries {
                    let entry = JournalEntry(
                        characterId: character.id,
                        userId: currentUserId,
                        triggerKeyphrase: draft.triggerKeyphrase,
                        content: draft.memory,
                        character: character
                    )
                    try CharacterStore.shared.insertJournalEntry(entry)
                }
            }

            clear()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    // MARK: - Private

    private func buildCharacter() -> Character {
        let ownerUserId = AuthService.shared.currentUser?.id
        let character = Character(
            name: name,
            subtitle: subtitle,
            backstory: backstory,
            responseDirective: responseDirective,
            keyMemories: keyMemories,
            exampleMessage: exampleMessage,
            greetingMessage: greetingMessage,
            avatarDescription: avatarDescription,
            faceDetail: faceDetail,
            interactionMode: interactionMode,
            dynamism: dynamism,
            category: category,
            ownerUserId: ownerUserId,
            avatarData: avatarData
        )
        return character
    }

    private func clear() {
        name = ""
        subtitle = ""
        backstory = ""
        responseDirective = ""
        keyMemories = ""
        exampleMessage = ""
        greetingMessage = ""
        avatarDescription = ""
        faceDetail = ""
        interactionMode = .companion
        dynamism = 1.0
        category = .assistant
        journalEntries = []
        avatarData = nil
        avatarItem = nil
        errorMessage = nil
    }
}
