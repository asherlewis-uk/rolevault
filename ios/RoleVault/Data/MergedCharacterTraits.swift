import Foundation

/// Resolved character traits after merging a base `Character` with an optional
/// `CharacterCustomization` overlay.
///
/// This struct is the single source of truth for prompt building. Adding a new
/// field to `Character` only requires adding it here and in the `init`.
struct MergedCharacterTraits {
    let backstory: String
    let responseDirective: String
    let keyMemories: String
    let exampleMessage: String
    let greetingMessage: String
    let avatarDescription: String
    let faceDetail: String
    let awayMessage: String?
    let interactionMode: InteractionMode
    let dynamism: Double

    init(base: Character, customization: CharacterCustomization?) {
        self.backstory = customization?.backstory ?? base.backstory
        self.responseDirective = customization?.responseDirective ?? base.responseDirective
        self.keyMemories = customization?.keyMemories ?? base.keyMemories
        self.exampleMessage = customization?.exampleMessage ?? base.exampleMessage
        self.greetingMessage = customization?.greetingMessage ?? base.greetingMessage
        self.avatarDescription = customization?.avatarDescription ?? base.avatarDescription
        self.faceDetail = customization?.faceDetail ?? base.faceDetail
        self.awayMessage = customization?.awayMessage ?? base.awayMessage
        self.interactionMode = customization?.interactionMode ?? base.interactionMode
        self.dynamism = customization?.dynamism ?? base.dynamism
    }

    /// Builds the system prompt from resolved traits.
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
}
