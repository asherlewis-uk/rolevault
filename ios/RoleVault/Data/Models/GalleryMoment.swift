import Foundation
import SwiftData

@Model
final class GalleryMoment {
    @Attribute(.unique) var id: UUID
    var characterId: UUID?
    var conversationId: String
    var imageData: Data?
    var textExcerpt: String
    var caption: String
    var createdAt: Date

    var character: Character?

    init(
        id: UUID = UUID(),
        characterId: UUID? = nil,
        conversationId: String,
        imageData: Data? = nil,
        textExcerpt: String = "",
        caption: String = "",
        character: Character? = nil
    ) {
        self.id = id
        self.characterId = characterId
        self.conversationId = conversationId
        self.imageData = imageData
        self.textExcerpt = textExcerpt
        self.caption = caption
        self.character = character
        self.createdAt = Date()
    }
}
