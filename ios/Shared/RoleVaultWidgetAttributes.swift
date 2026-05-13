import ActivityKit

public struct RoleVaultWidgetAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        public var isTyping: Bool

        public init(isTyping: Bool) {
            self.isTyping = isTyping
        }
    }

    public var characterName: String
    public var characterId: String

    public init(characterName: String, characterId: String) {
        self.characterName = characterName
        self.characterId = characterId
    }
}
