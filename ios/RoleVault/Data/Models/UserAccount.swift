import Foundation
import SwiftData

@Model
final class UserAccount {
    @Attribute(.unique) var id: UUID
    @Attribute(.unique) var remoteId: String
    var email: String
    var name: String
    var username: String
    var avatarUrl: String?
    var isCurrent: Bool
    var lastLoginAt: Date
    var createdAt: Date

    init(
        id: UUID = UUID(),
        remoteId: String,
        email: String,
        name: String,
        username: String,
        avatarUrl: String? = nil,
        isCurrent: Bool = false
    ) {
        self.id = id
        self.remoteId = remoteId
        self.email = email
        self.name = name
        self.username = username
        self.avatarUrl = avatarUrl
        self.isCurrent = isCurrent
        self.lastLoginAt = Date()
        self.createdAt = Date()
    }

    func touchLogin() {
        lastLoginAt = Date()
    }
}
