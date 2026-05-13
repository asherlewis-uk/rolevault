import Foundation
import SwiftData

/// Per-user overlay on a shared `Character`.
/// All override fields are optional; when nil the base character value is used.
@Model
final class CharacterCustomization {
    @Attribute(.unique) var id: UUID
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

// MARK: - Effective Character Merging

extension CharacterCustomization {
    /// Returns the effective value for a field, preferring the override if present.
    func effectiveBackstory(base: String) -> String { backstory ?? base }
    func effectiveResponseDirective(base: String) -> String { responseDirective ?? base }
    func effectiveKeyMemories(base: String) -> String { keyMemories ?? base }
    func effectiveExampleMessage(base: String) -> String { exampleMessage ?? base }
    func effectiveGreetingMessage(base: String) -> String { greetingMessage ?? base }
    func effectiveAvatarDescription(base: String) -> String { avatarDescription ?? base }
    func effectiveFaceDetail(base: String) -> String { faceDetail ?? base }
    func effectiveAwayMessage(base: String?) -> String? { awayMessage ?? base }
    func effectiveInteractionMode(base: InteractionMode) -> InteractionMode { interactionMode ?? base }
    func effectiveDynamism(base: Double) -> Double { dynamism ?? base }
}
