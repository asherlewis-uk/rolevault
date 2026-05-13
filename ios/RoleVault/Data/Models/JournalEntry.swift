import Foundation
import SwiftData

@Model
final class JournalEntry {
    @Attribute(.unique) var id: UUID
    var characterId: UUID?
    var userId: UUID?
    var triggerKeyphrase: String
    var content: String
    var createdAt: Date

    init(
        id: UUID = UUID(),
        characterId: UUID? = nil,
        userId: UUID? = nil,
        triggerKeyphrase: String,
        content: String
    ) {
        self.id = id
        self.characterId = characterId
        self.userId = userId
        self.triggerKeyphrase = triggerKeyphrase.lowercased().trimmingCharacters(in: .whitespaces)
        self.content = content
        self.createdAt = Date()
    }

    /// Checks whether a given user message contains this journal's trigger keyphrase.
    func isTriggered(by message: String) -> Bool {
        message.lowercased().contains(triggerKeyphrase)
    }
}
