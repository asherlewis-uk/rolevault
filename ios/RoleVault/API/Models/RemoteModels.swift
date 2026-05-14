import Foundation

struct RemoteCharacter: Codable, Identifiable {
    let id: UUID
    let ownerUserId: UUID?
    let name: String
    let visibility: String?
    let category: String?
    let backstory: String?
    let responseDirective: String?
    let keyMemories: String?
    let greetingMessage: String?
    let exampleMessage: String?
    let faceDetail: String?
    let interactionMode: String?
    let dynamism: Double?
    let avatarDescription: String?
    let createdAt: String?
    let updatedAt: String?
    let subtitle: String?
}

struct RemoteCharacterCreate: Codable {
    let name: String
    let subtitle: String?
    let backstory: String?
    let responseDirective: String?
    let keyMemories: String?
    let greetingMessage: String?
    let exampleMessage: String?
    let faceDetail: String?
    let interactionMode: String?
    let dynamism: Double?
    let category: String?
    let avatarDescription: String?

    init(from character: Character) {
        self.name = character.name
        self.subtitle = character.subtitle
        self.backstory = character.backstory
        self.responseDirective = character.responseDirective
        self.keyMemories = character.keyMemories
        self.greetingMessage = character.greetingMessage
        self.exampleMessage = character.exampleMessage
        self.faceDetail = character.faceDetail
        self.interactionMode = character.interactionMode.rawValue
        self.dynamism = character.dynamism
        self.category = character.category.rawValue
        self.avatarDescription = character.avatarDescription
    }
}

struct RemoteCharacterUpdate: Codable {
    let name: String?
    let subtitle: String?
    let backstory: String?
    let responseDirective: String?
    let keyMemories: String?
    let greetingMessage: String?
    let exampleMessage: String?
    let faceDetail: String?
    let interactionMode: String?
    let dynamism: Double?
    let category: String?
    let avatarDescription: String?
    let visibility: String?

    init(from character: Character) {
        self.name = character.name
        self.subtitle = character.subtitle
        self.backstory = character.backstory
        self.responseDirective = character.responseDirective
        self.keyMemories = character.keyMemories
        self.greetingMessage = character.greetingMessage
        self.exampleMessage = character.exampleMessage
        self.faceDetail = character.faceDetail
        self.interactionMode = character.interactionMode.rawValue
        self.dynamism = character.dynamism
        self.category = character.category.rawValue
        self.avatarDescription = character.avatarDescription
        self.visibility = character.visibilityRaw
    }
}
