import Foundation
import SwiftData
import CoreGraphics
import ImageIO
import UniformTypeIdentifiers
import UIKit

@Observable
final class CharacterStore {
    static let shared = CharacterStore()
    private init() {}

    // MARK: - CRUD

    @MainActor
    func fetchAll() throws -> [Character] {
        let descriptor = FetchDescriptor<Character>(sortBy: [SortDescriptor(\.updatedAt, order: .reverse)])
        return try SwiftDataContainer.shared.context.fetch(descriptor)
    }

    @MainActor
    func fetch(id: UUID) throws -> Character? {
        let descriptor = FetchDescriptor<Character>(predicate: #Predicate { $0.id == id })
        return try SwiftDataContainer.shared.context.fetch(descriptor).first
    }

    @MainActor
    func insert(_ character: Character) throws {
        SwiftDataContainer.shared.context.insert(character)
        try SwiftDataContainer.shared.context.save()
    }

    @MainActor
    func update(_ character: Character) throws {
        character.touch()
        try SwiftDataContainer.shared.context.save()
    }

    @MainActor
    func delete(_ character: Character) throws {
        SwiftDataContainer.shared.context.delete(character)
        try SwiftDataContainer.shared.context.save()
    }

    // MARK: - Search / Filter / Sort

    enum SortOption {
        case name
        case recentlyUpdated
        case created
    }

    @MainActor
    func search(query: String = "", category: CharacterCategory? = nil, sort: SortOption = .recentlyUpdated) throws -> [Character] {
        let predicate = buildPredicate(query: query, category: category)
        let sortDescriptors = buildSortDescriptors(option: sort)
        let descriptor = FetchDescriptor<Character>(predicate: predicate, sortBy: sortDescriptors)
        return try SwiftDataContainer.shared.context.fetch(descriptor)
    }

    @MainActor
    func toggleFavorite(_ character: Character) throws {
        character.isFavorite.toggle()
        try update(character)
    }

    // MARK: - Tavern V2 Export

    /// Exports a character to a PNG with embedded Tavern V2 JSON metadata.
    func exportToPNG(character: Character, image: UIImage?) -> Data? {
        let tavernJSON = buildTavernV2JSON(character: character)
        let baseImage = image ?? placeholderImage(letter: String(character.name.prefix(1)))
        guard let pngData = baseImage.pngData() else { return nil }
        return embedPNGMetadata(pngData: pngData, key: "chara", value: tavernJSON)
    }

    /// Imports a character from a PNG with embedded Tavern V2 JSON metadata.
    @MainActor
    func importFromPNG(data: Data) -> Character? {
        guard let jsonString = extractPNGMetadata(pngData: data, key: "chara"),
              let jsonData = jsonString.data(using: .utf8) else { return nil }
        return parseTavernV2JSON(data: jsonData, imageData: data)
    }

    // MARK: - Private Helpers

    private func buildPredicate(query: String, category: CharacterCategory?) -> Predicate<Character> {
        let trimmed = query.trimmingCharacters(in: .whitespaces)
        if let category = category, !trimmed.isEmpty {
            // SwiftData predicates support contains() which maps to SQLite LIKE (case-insensitive for ASCII)
            return #Predicate { $0.category == category && $0.name.contains(trimmed) }
        } else if let category = category {
            return #Predicate { $0.category == category }
        } else if !trimmed.isEmpty {
            return #Predicate { $0.name.contains(trimmed) }
        } else {
            return Predicate<Character>.true
        }
    }

    private func buildSortDescriptors(option: SortOption) -> [SortDescriptor<Character>] {
        switch option {
        case .name:
            return [SortDescriptor(\.name, order: .forward)]
        case .recentlyUpdated:
            return [SortDescriptor(\.updatedAt, order: .reverse)]
        case .created:
            return [SortDescriptor(\.createdAt, order: .reverse)]
        }
    }

    // MARK: - Tavern V2 JSON

    private func buildTavernV2JSON(character: Character) -> String {
        let dict: [String: Any] = [
            "name": character.name,
            "description": character.subtitle,
            "personality": character.backstory,
            "scenario": "",
            "first_mes": character.greetingMessage,
            "mes_example": character.exampleMessage,
            "creatorcomment": "Exported from RoleVault",
            "tags": [character.category.rawValue],
            "creator": "RoleVault",
            "character_version": "1.0",
            "alternate_greetings": [],
            "system_prompt": character.formattedSystemPrompt,
            "post_history_instructions": character.responseDirective,
            "character_book": [
                "entries": (character.journalEntries ?? []).map { entry in
                    [
                        "name": entry.triggerKeyphrase,
                        "content": entry.content,
                        "keys": [entry.triggerKeyphrase]
                    ]
                }
            ]
        ]
        guard let data = try? JSONSerialization.data(withJSONObject: dict, options: .prettyPrinted),
              let string = String(data: data, encoding: .utf8) else { return "{}" }
        return string
    }

    @MainActor
    private func parseTavernV2JSON(data: Data, imageData: Data?) -> Character? {
        guard let dict = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { return nil }

        let name = dict["name"] as? String ?? "Imported Character"
        let subtitle = dict["description"] as? String ?? ""
        let backstory = dict["personality"] as? String ?? ""
        let greeting = dict["first_mes"] as? String ?? ""
        let example = dict["mes_example"] as? String ?? ""
        let systemPrompt = dict["system_prompt"] as? String ?? ""
        let instructions = dict["post_history_instructions"] as? String ?? ""

        let character = Character(
            name: name,
            subtitle: subtitle,
            backstory: backstory.isEmpty ? systemPrompt : backstory,
            responseDirective: instructions,
            exampleMessage: example,
            greetingMessage: greeting,
            avatarData: imageData
        )

        if let book = dict["character_book"] as? [String: Any],
           let entries = book["entries"] as? [[String: Any]] {
            for entry in entries {
                if let key = entry["name"] as? String,
                   let content = entry["content"] as? String {
                    let journal = JournalEntry(characterId: character.id, triggerKeyphrase: key, content: content)
                    character.journalEntries?.append(journal)
                }
            }
        }

        return character
    }

    // MARK: - PNG Metadata

    private func embedPNGMetadata(pngData: Data, key: String, value: String) -> Data? {
        guard let source = CGImageSourceCreateWithData(pngData as CFData, nil),
              let imageRef = CGImageSourceCreateImageAtIndex(source, 0, nil) else { return nil }

        let mutableData = NSMutableData()
        guard let destination = CGImageDestinationCreateWithData(mutableData, UTType.png.identifier as CFString, 1, nil) else { return nil }

        var properties = CGImageSourceCopyPropertiesAtIndex(source, 0, nil) as? [String: Any] ?? [:]
        var pngDict = properties[kCGImagePropertyPNGDictionary as String] as? [String: Any] ?? [:]
        pngDict[key] = value
        properties[kCGImagePropertyPNGDictionary as String] = pngDict

        CGImageDestinationAddImage(destination, imageRef, properties as CFDictionary)
        CGImageDestinationFinalize(destination)
        return mutableData as Data
    }

    private func extractPNGMetadata(pngData: Data, key: String) -> String? {
        guard let source = CGImageSourceCreateWithData(pngData as CFData, nil) else { return nil }
        let properties = CGImageSourceCopyPropertiesAtIndex(source, 0, nil) as? [String: Any]
        let pngDict = properties?[kCGImagePropertyPNGDictionary as String] as? [String: Any]
        return pngDict?[key] as? String
    }

    private func placeholderImage(letter: String) -> UIImage {
        let size = CGSize(width: 200, height: 200)
        let renderer = UIGraphicsImageRenderer(size: size)
        return renderer.image { ctx in
            UIColor.systemGray4.setFill()
            ctx.fill(CGRect(origin: .zero, size: size))
            let attributes: [NSAttributedString.Key: Any] = [
                .font: UIFont.systemFont(ofSize: 80, weight: .bold),
                .foregroundColor: UIColor.systemGray
            ]
            let string = letter as NSString
            let textSize = string.size(withAttributes: attributes)
            let rect = CGRect(x: (size.width - textSize.width) / 2, y: (size.height - textSize.height) / 2, width: textSize.width, height: textSize.height)
            string.draw(in: rect, withAttributes: attributes)
        }
    }
}
