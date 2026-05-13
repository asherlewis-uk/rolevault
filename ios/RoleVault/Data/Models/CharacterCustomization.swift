import Foundation
import SwiftData

/// Per-user overlay on a shared `Character`.
/// All override fields are optional; when nil the base character value is used.
@Model
final class CharacterCustomization {
    @Attribute(.unique) var id: UUID
    /// Composite unique key derived from `userId` + `characterId`.
    /// Enforces at most one customization row per user/character pair.
    @Attribute(.unique) var compositeKey: String
    var userId: UUID
    var characterId: UUID

    // MARK: - Personality Overrides
    var backstory: String?
    var responseDirective: String?
    var keyMemories: String?
    var exampleMessage: String?
    var greetingMessage: String?
    var avatarDescription: String?
    var faceDetail: String?
    var awayMessage: String?
    var interactionModeRaw: String?
    var dynamism: Double?

    // MARK: - User-Specific State
    var isFavorite: Bool

    // MARK: - Metadata
    var createdAt: Date
    var updatedAt: Date

    init(
        id: UUID = UUID(),
        userId: UUID,
        characterId: UUID,
        backstory: String? = nil,
        responseDirective: String? = nil,
        keyMemories: String? = nil,
        exampleMessage: String? = nil,
        greetingMessage: String? = nil,
        avatarDescription: String? = nil,
        faceDetail: String? = nil,
        awayMessage: String? = nil,
        interactionMode: InteractionMode? = nil,
        dynamism: Double? = nil,
        isFavorite: Bool = false
    ) {
        self.id = id
        self.userId = userId
        self.characterId = characterId
        self.compositeKey = "\(userId.uuidString):\(characterId.uuidString)"
        self.backstory = backstory
        self.responseDirective = responseDirective
        self.keyMemories = keyMemories
        self.exampleMessage = exampleMessage
        self.greetingMessage = greetingMessage
        self.avatarDescription = avatarDescription
        self.faceDetail = faceDetail
        self.awayMessage = awayMessage
        self.interactionModeRaw = interactionMode?.rawValue
        self.dynamism = dynamism
        self.isFavorite = isFavorite
        self.createdAt = Date()
        self.updatedAt = Date()
    }

    func touch() {
        updatedAt = Date()
    }

    /// Computed convenience accessor for `interactionModeRaw`.
    /// ⚠️ Not queryable via SwiftData `#Predicate`; use `interactionModeRaw` in predicates.
    var interactionMode: InteractionMode? {
        get {
            guard let raw = interactionModeRaw else { return nil }
            return InteractionMode(rawValue: raw)
        }
        set {
            interactionModeRaw = newValue?.rawValue
        }
    }
}
