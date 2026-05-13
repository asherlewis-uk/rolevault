import Foundation
import SwiftData

@Model
final class Persona {
    @Attribute(.unique) var id: UUID
    var name: String
    var gender: String
    var backstory: String
    var avatarData: Data?
    var isActive: Bool
    var userId: UUID?
    var createdAt: Date
    var updatedAt: Date

    init(
        id: UUID = UUID(),
        name: String,
        gender: String = "",
        backstory: String = "",
        avatarData: Data? = nil,
        isActive: Bool = false,
        userId: UUID? = nil
    ) {
        self.id = id
        self.name = name
        self.gender = gender
        self.backstory = backstory
        self.avatarData = avatarData
        self.isActive = isActive
        self.userId = userId
        self.createdAt = Date()
        self.updatedAt = Date()
    }

    func touch() {
        updatedAt = Date()
    }

    /// Formats persona identity into a user-context string injected into chat prompts.
    var formattedUserContext: String {
        var parts: [String] = []
        parts.append("You are \(name).")
        if !gender.isEmpty {
            parts.append("Gender: \(gender).")
        }
        if !backstory.isEmpty {
            parts.append(backstory)
        }
        return parts.joined(separator: " ")
    }
}
