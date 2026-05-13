import Foundation
import SwiftData

/// Centralized referential integrity enforcement for models that use scalar
/// UUID foreign keys instead of SwiftData `@Relationship` cascade rules.
enum CascadeStore {

    /// Deletes a `Conversation` and all associated `MessageWrapper` records.
    @MainActor
    static func deleteConversation(_ conversation: Conversation, context: ModelContext) throws {
        let remoteId = conversation.remoteId
        let msgDesc = FetchDescriptor<MessageWrapper>(
            predicate: #Predicate { $0.conversationId == remoteId }
        )
        if let msgs = try? context.fetch(msgDesc) {
            msgs.forEach(context.delete)
        }
        context.delete(conversation)
        try context.save()
    }

    /// Deletes a `Character` and all associated records that are NOT covered by
    /// SwiftData `@Relationship` cascade (e.g. `CharacterCustomization`, `Conversation`).
    /// Note: `JournalEntry` and `GalleryMoment` are handled automatically via
    /// `@Relationship(deleteRule: .cascade)` on `Character`.
    @MainActor
    static func deleteCharacter(_ character: Character, context: ModelContext) throws {
        let charId = character.id

        // Clean up per-user customizations
        let custDesc = FetchDescriptor<CharacterCustomization>(
            predicate: #Predicate { $0.characterId == charId }
        )
        if let customs = try? context.fetch(custDesc) {
            customs.forEach(context.delete)
        }

        // Clean up conversations and their messages
        let convoDesc = FetchDescriptor<Conversation>(
            predicate: #Predicate { $0.characterId == charId }
        )
        if let convos = try? context.fetch(convoDesc) {
            for convo in convos {
                let remoteId = convo.remoteId
                let msgDesc = FetchDescriptor<MessageWrapper>(
                    predicate: #Predicate { $0.conversationId == remoteId }
                )
                if let msgs = try? context.fetch(msgDesc) {
                    msgs.forEach(context.delete)
                }
                context.delete(convo)
            }
        }

        context.delete(character)
        try context.save()
    }

    /// Deletes all user-scoped data for the given `userId` in a single transaction.
    @MainActor
    static func deleteAllUserData(userId: UUID, context: ModelContext) throws {
        // Conversations
        let convoDesc = FetchDescriptor<Conversation>(
            predicate: #Predicate { $0.userId == userId }
        )
        if let items = try? context.fetch(convoDesc) {
            items.forEach(context.delete)
        }

        // Gallery moments
        let momentDesc = FetchDescriptor<GalleryMoment>(
            predicate: #Predicate { $0.userId == userId }
        )
        if let items = try? context.fetch(momentDesc) {
            items.forEach(context.delete)
        }

        // Owned characters (cascade handles JournalEntry + GalleryMoment)
        let charDesc = FetchDescriptor<Character>(
            predicate: #Predicate { $0.ownerUserId == userId }
        )
        if let chars = try? context.fetch(charDesc) {
            chars.forEach(context.delete)
        }

        // Personas
        let personaDesc = FetchDescriptor<Persona>(
            predicate: #Predicate { $0.userId == userId }
        )
        if let personas = try? context.fetch(personaDesc) {
            personas.forEach(context.delete)
        }

        // Journal entries (for shared characters not owned by this user)
        let journalDesc = FetchDescriptor<JournalEntry>(
            predicate: #Predicate { $0.userId == userId }
        )
        if let journals = try? context.fetch(journalDesc) {
            journals.forEach(context.delete)
        }

        // Messages
        let messageDesc = FetchDescriptor<MessageWrapper>(
            predicate: #Predicate { $0.userId == userId }
        )
        if let messages = try? context.fetch(messageDesc) {
            messages.forEach(context.delete)
        }

        // Customizations
        let customizationDesc = FetchDescriptor<CharacterCustomization>(
            predicate: #Predicate { $0.userId == userId }
        )
        if let customizations = try? context.fetch(customizationDesc) {
            customizations.forEach(context.delete)
        }

        try context.save()
    }
}
