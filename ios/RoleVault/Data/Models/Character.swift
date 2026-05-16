import Foundation
import SwiftData

@Model
final class Character {
    // MARK: - Identity
    @Attribute(.unique) var id: UUID
    var name: String
    var subtitle: String
    var category: CharacterCategory
    var awayMessage: String?
    var avatarData: Data?

    // MARK: - Ownership & Visibility
    /// The user who created this character. Used for edit-permission checks.
    var ownerUserId: UUID?
    /// Typed visibility that replaces ambiguous `ownerUserId == nil` semantics.
    /// `.legacy` is the default for existing rows until `migrateUnscopedData` runs.
    var visibilityRaw: String

    /// Computed accessor for `visibilityRaw`.
    /// ⚠️ Not queryable via SwiftData `#Predicate`; use `visibilityRaw` in predicates.
    var visibility: CharacterVisibility {
        get { CharacterVisibility(rawValue: visibilityRaw) ?? .legacy }
        set { visibilityRaw = newValue.rawValue }
    }

    // MARK: - Personality (deep construction)
    var backstory: String
    var responseDirective: String
    var keyMemories: String
    var exampleMessage: String
    var greetingMessage: String
    var avatarDescription: String
    var faceDetail: String

    // MARK: - Behavior
    var interactionMode: InteractionMode
    var dynamism: Double

    // MARK: - SwiftData Relationships (cascade deletion)
    @Relationship(deleteRule: .cascade, inverse: \JournalEntry.character)
    var journalEntries: [JournalEntry]?

    @Relationship(deleteRule: .cascade, inverse: \GalleryMoment.character)
    var galleryMoments: [GalleryMoment]?

    // MARK: - Metadata
    var createdAt: Date
    var updatedAt: Date

    // MARK: - Validation Constants
    static let backstoryMaxLength = 2500
    static let responseDirectiveMaxLength = 150
    static let keyMemoriesMaxLength = 1000
    static let exampleMessageMaxLength = 750
    static let greetingMessageMaxLength = 750
    static let avatarDescriptionMaxLength = 800
    static let faceDetailMaxLength = 200

    init(
        id: UUID = UUID(),
        name: String,
        subtitle: String = "",
        backstory: String = "",
        responseDirective: String = "",
        keyMemories: String = "",
        exampleMessage: String = "",
        greetingMessage: String = "",
        avatarDescription: String = "",
        faceDetail: String = "",
        interactionMode: InteractionMode = .companion,
        dynamism: Double = 1.0,
        category: CharacterCategory = .assistant,
        ownerUserId: UUID? = nil,
        visibility: CharacterVisibility? = nil,
        awayMessage: String? = nil,
        avatarData: Data? = nil
    ) {
        self.id = id
        self.name = name
        self.subtitle = subtitle
        self.backstory = backstory
        self.responseDirective = responseDirective
        self.keyMemories = keyMemories
        self.exampleMessage = exampleMessage
        self.greetingMessage = greetingMessage
        self.avatarDescription = avatarDescription
        self.faceDetail = faceDetail
        self.interactionMode = interactionMode
        self.dynamism = max(0.0, min(2.0, dynamism))
        self.category = category
        self.ownerUserId = ownerUserId
        self.visibilityRaw = (visibility ?? (ownerUserId != nil ? .owned : .legacy)).rawValue
        self.awayMessage = awayMessage
        self.avatarData = avatarData
        self.createdAt = Date()
        self.updatedAt = Date()
    }

    func touch() {
        updatedAt = Date()
    }

    // MARK: - Computed Prompt (Base Values)

    /// Combines all base personality fields into a single system prompt string.
    /// To get the per-user effective prompt, use `CharacterStore.effectiveSystemPrompt(character:forUser:)`
    /// or construct `MergedCharacterTraits(base:customization:).formattedSystemPrompt`.
    var formattedSystemPrompt: String {
        var parts: [String] = []

        if !backstory.isEmpty {
            parts.append("Backstory:\n\(backstory)")
        }

        if !responseDirective.isEmpty {
            parts.append("Directive:\n\(responseDirective)")
        }

        if !keyMemories.isEmpty {
            parts.append("Key Memories:\n\(keyMemories)")
        }

        if !exampleMessage.isEmpty {
            parts.append("Example Message:\n\(exampleMessage)")
        }

        if !greetingMessage.isEmpty {
            parts.append("Greeting:\n\(greetingMessage)")
        }

        if !avatarDescription.isEmpty {
            parts.append("Appearance:\n\(avatarDescription)")
        }

        if !faceDetail.isEmpty {
            parts.append("Face Detail:\n\(faceDetail)")
        }

        parts.append("Interaction Mode: \(interactionMode.rawValue)")
        parts.append("Dynamism: \(String(format: "%.1f", dynamism))")

        return parts.joined(separator: "\n\n")
    }

    // MARK: - Validation

    func validate() -> [String] {
        var errors: [String] = []
        if name.isEmpty { errors.append("Name is required.") }
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
}

// MARK: - Enums

enum CharacterVisibility: String, Codable, CaseIterable {
    /// Created by a specific user; editable only by that user.
    case owned = "owned"
    /// Globally available to all users; no single owner.
    case shared = "shared"
    /// Pre-scoping data that has not yet been migrated to a user.
    /// Treated as `.owned` by the first logged-in user who triggers migration.
    case legacy = "legacy"
}

enum InteractionMode: String, Codable, CaseIterable {
    case companion = "Companion"
    case roleplay = "Roleplay"
    case narrative = "Narrative"
    case minimal = "Minimal"

    var icon: String {
        switch self {
        case .companion: return "heart.fill"
        case .roleplay: return "theatermasks.fill"
        case .narrative: return "book.fill"
        case .minimal: return "minus.circle.fill"
        }
    }

    var description: String {
        switch self {
        case .companion: return "Warm, daily connection"
        case .roleplay: return "Scenario-driven immersion"
        case .narrative: return "Third-person storytelling"
        case .minimal: return "Low guidance, open-ended"
        }
    }
}

enum CharacterCategory: String, Codable, CaseIterable {
    case scenes = "Scenes"
    case groups = "Groups"
    case anime = "Anime"
    case assistant = "Assistant"
    case creating = "Creating"
    case family = "Family"
    case fantasy = "Fantasy"
    case gaming = "Gaming"
    case history = "History"
    case human = "Human"
    case humor = "Humor"
    case learning = "Learning"
    case lifestyle = "Lifestyle"
    case mafia = "Mafia"
    case powerful = "Powerful"
    case rpg = "RPG"
    case romance = "Romance"
    case school = "School"
    case vampires = "Vampires"
    case werewolves = "Werewolves"
}
