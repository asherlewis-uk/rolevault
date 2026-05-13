import Foundation
import SwiftData

enum SyncStatus: String, Codable {
    case synced
    case pending
    case failed
}

@Model
final class Conversation {
    @Attribute(.unique) var id: UUID
    var remoteId: String
    var title: String
    var characterId: UUID?
    var personaId: UUID?
    var userId: UUID?
    var lastMessagePreview: String
    var lastMessageAt: Date
    var unreadCount: Int
    var isArchived: Bool
    var syncStatus: SyncStatus

    init(
        id: UUID = UUID(),
        remoteId: String,
        title: String = "",
        characterId: UUID? = nil,
        personaId: UUID? = nil,
        userId: UUID? = nil,
        lastMessagePreview: String = "",
        lastMessageAt: Date = Date(),
        unreadCount: Int = 0,
        syncStatus: SyncStatus = .pending
    ) {
        self.id = id
        self.remoteId = remoteId
        self.title = title
        self.characterId = characterId
        self.personaId = personaId
        self.userId = userId
        self.lastMessagePreview = lastMessagePreview
        self.lastMessageAt = lastMessageAt
        self.unreadCount = unreadCount
        self.isArchived = false
        self.syncStatus = syncStatus
    }
}
