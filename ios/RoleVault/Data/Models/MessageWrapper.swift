import Foundation
import SwiftData

/// Local SwiftData cache bridge for chat messages.
@Model
final class MessageWrapper {
    @Attribute(.unique) var id: String
    var text: String
    var sender: String
    var isCreatedByUser: Bool
    var createdAt: Date
    var conversationId: String
    var userId: UUID?

    init(message: LibreChatMessage, conversationId: String, userId: UUID? = nil) {
        self.id = message.id
        self.text = message.text
        self.sender = message.sender
        self.isCreatedByUser = message.isCreatedByUser
        self.createdAt = ISO8601DateFormatter().date(from: message.createdAt ?? "") ?? Date()
        self.conversationId = conversationId
        self.userId = userId
    }
}
