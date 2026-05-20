import Foundation
import SwiftData
import CoreGraphics
import ImageIO
import UniformTypeIdentifiers
import UIKit

@Observable
final class CharacterStore {
    static let shared = CharacterStore()
    private let api = RoleVaultAPI.shared
    private let decoder = JSONDecoder()
    private let encoder = JSONEncoder()

    private init() {
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        encoder.keyEncodingStrategy = .convertToSnakeCase
    }

    // MARK: - Remote Sync

    @MainActor
    func sync() async throws {
        let remoteCharacters: [RemoteCharacter] = try await api.get(path: "/api/characters")
        let context = SwiftDataContainer.shared.context
        for remote in remoteCharacters {
            let descriptor = FetchDescriptor<Character>(predicate: #Predicate { $0.id == remote.id })
            if let existing = try? context.fetch(descriptor).first {
                existing.name = remote.name
                existing.subtitle = remote.subtitle ?? ""
                existing.backstory = remote.backstory ?? ""
                existing.responseDirective = remote.responseDirective ?? ""
                existing.keyMemories = remote.keyMemories ?? ""
                existing.exampleMessage = remote.exampleMessage ?? ""
                existing.greetingMessage = remote.greetingMessage ?? ""
                existing.avatarDescription = remote.avatarDescription ?? ""
                existing.faceDetail = remote.faceDetail ?? ""
                existing.interactionMode = InteractionMode(rawValue: remote.interactionMode ?? "Companion") ?? .companion
                existing.dynamism = remote.dynamism ?? 1.0
                existing.category = CharacterCategory(rawValue: remote.category ?? "Assistant") ?? .assistant
                existing.visibilityRaw = remote.visibility ?? "owned"
            } else {
                let character = Character(
                    id: remote.id,
                    name: remote.name,
                    subtitle: remote.subtitle ?? "",
                    backstory: remote.backstory ?? "",
                    responseDirective: remote.responseDirective ?? "",
                    keyMemories: remote.keyMemories ?? "",
                    exampleMessage: remote.exampleMessage ?? "",
                    greetingMessage: remote.greetingMessage ?? "",
                    avatarDescription: remote.avatarDescription ?? "",
                    faceDetail: remote.faceDetail ?? "",
                    interactionMode: InteractionMode(rawValue: remote.interactionMode ?? "Companion") ?? .companion,
                    dynamism: remote.dynamism ?? 1.0,
                    category: CharacterCategory(rawValue: remote.category ?? "Assistant") ?? .assistant,
                    ownerUserId: remote.ownerUserId,
                    visibility: CharacterVisibility(rawValue: remote.visibility ?? "owned")
                )
                context.insert(character)
            }
        }
        try context.save()
    }

    // MARK: - Character CRUD

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
    func insert(_ character: Character) async throws {
        SwiftDataContainer.shared.context.insert(character)
        try SwiftDataContainer.shared.context.save()
        let _: RemoteCharacter? = try? await api.post(path: "/api/characters", body: RemoteCharacterCreate(from: character))
    }

    @MainActor
    func update(_ character: Character) async throws {
        character.touch()
        try SwiftDataContainer.shared.context.save()
        let bodyData = try encoder.encode(RemoteCharacterUpdate(from: character))
        _ = try? await api.request(path: "/api/characters/\(character.id)", method: "PUT", body: bodyData)
    }

    @MainActor
    func delete(_ character: Character) async throws {
        try CascadeStore.deleteCharacter(character, context: SwiftDataContainer.shared.context)
        _ = try? await api.delete(path: "/api/characters/\(character.id)")
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

    // MARK: - Character Customizations

    /// Fetches the customization row for a specific user/character pair.
    /// This is the only entry point for customization lookups; callers should use
    /// `effectiveIsFavorite(character:userId:)` or `ensureCustomization(...)` instead.
    @MainActor
    private func fetchCustomization(characterId: UUID, userId: UUID) throws -> CharacterCustomization? {
        let descriptor = FetchDescriptor<CharacterCustomization>(
            predicate: #Predicate { $0.characterId == characterId && $0.userId == userId }
        )
        return try SwiftDataContainer.shared.context.fetch(descriptor).first
    }

    @MainActor
    func fetchAllCustomizations(for userId: UUID) throws -> [CharacterCustomization] {
        let descriptor = FetchDescriptor<CharacterCustomization>(
            predicate: #Predicate { $0.userId == userId }
        )
        return try SwiftDataContainer.shared.context.fetch(descriptor)
    }

    @MainActor
    func ensureCustomization(characterId: UUID, userId: UUID) throws -> CharacterCustomization {
        if let existing = try fetchCustomization(characterId: characterId, userId: userId) {
            return existing
        }
        let customization = CharacterCustomization(userId: userId, characterId: characterId)
        SwiftDataContainer.shared.context.insert(customization)
        try SwiftDataContainer.shared.context.save()
        return customization
    }

    @MainActor
    func updateCustomization(_ customization: CharacterCustomization) throws {
        customization.touch()
        try SwiftDataContainer.shared.context.save()
    }

    @MainActor
    func deleteCustomization(_ customization: CharacterCustomization) throws {
        SwiftDataContainer.shared.context.delete(customization)
        try SwiftDataContainer.shared.context.save()
    }

    @MainActor
    func toggleFavorite(characterId: UUID, userId: UUID) async throws {
        let customization = try ensureCustomization(characterId: characterId, userId: userId)
        customization.isFavorite.toggle()
        try updateCustomization(customization)
    }

    /// Returns the effective favorite state for a character.
    /// `false` when no customization row exists; safe to call from views.
    @MainActor
    func effectiveIsFavorite(character: Character, userId: UUID) -> Bool {
        guard let customization = try? fetchCustomization(characterId: character.id, userId: userId) else {
            return false
        }
        return customization.isFavorite
    }

    // MARK: - Effective Character Prompts

    /// Builds the per-user effective system prompt by merging base `Character` traits
    /// with any `CharacterCustomization` overrides via `MergedCharacterTraits`.
    @MainActor
    func effectiveSystemPrompt(character: Character, userId: UUID) -> String {
        let customization: CharacterCustomization?
        do {
            customization = try fetchCustomization(characterId: character.id, userId: userId)
        } catch {
            print("Warning: failed to fetch character customization for prompt building: \(error)")
            customization = nil
        }
        let merged = MergedCharacterTraits(base: character, customization: customization)
        return merged.formattedSystemPrompt
    }

    // MARK: - Journal Entries (Per-User)

    @MainActor
    func fetchJournalEntries(characterId: UUID, userId: UUID) throws -> [JournalEntry] {
        let descriptor = FetchDescriptor<JournalEntry>(
            predicate: #Predicate { $0.characterId == characterId && $0.userId == userId }
        )
        return try SwiftDataContainer.shared.context.fetch(descriptor)
    }

    @MainActor
    func insertJournalEntry(_ entry: JournalEntry) throws {
        SwiftDataContainer.shared.context.insert(entry)
        try SwiftDataContainer.shared.context.save()
    }

    @MainActor
    func deleteJournalEntry(_ entry: JournalEntry) throws {
        SwiftDataContainer.shared.context.delete(entry)
        try SwiftDataContainer.shared.context.save()
    }

    // MARK: - Private Helpers

    private func buildPredicate(query: String, category: CharacterCategory?) -> Predicate<Character> {
        let trimmed = query.trimmingCharacters(in: .whitespaces)
        if let category = category, !trimmed.isEmpty {
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

    // MARK: - Tavern V2 Export

    /// Exports a character to a PNG with embedded Tavern V2 JSON metadata.
    @MainActor
    func exportToPNG(character: Character, image: UIImage?, userId: UUID? = nil) -> Data? {
        let tavernJSON = buildTavernV2JSON(character: character, userId: userId)
        let baseImage = image ?? placeholderImage(letter: String(character.name.prefix(1)))
        guard let pngData = baseImage.pngData() else { return nil }
        return embedPNGMetadata(pngData: pngData, key: "chara", value: tavernJSON)
    }

    /// Imports a character from a PNG with embedded Tavern V2 JSON metadata.
    @MainActor
    func importFromPNG(data: Data, ownerUserId: UUID? = nil) -> Character? {
        guard let jsonString = extractPNGMetadata(pngData: data, key: "chara"),
              let jsonData = jsonString.data(using: .utf8) else { return nil }
        return parseTavernV2JSON(data: jsonData, imageData: data, ownerUserId: ownerUserId)
    }

    // MARK: - Tavern V2 JSON

    @MainActor
    private func buildTavernV2JSON(character: Character, userId: UUID? = nil) -> String {
        let entries: [[String: Any]]
        if let uid = userId,
           let journalEntries = try? fetchJournalEntries(characterId: character.id, userId: uid) {
            entries = journalEntries.map { entry in
                [
                    "name": entry.triggerKeyphrase,
                    "content": entry.content,
                    "keys": [entry.triggerKeyphrase]
                ]
            }
        } else {
            entries = []
        }

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
                "entries": entries
            ]
        ]
        guard let data = try? JSONSerialization.data(withJSONObject: dict, options: .prettyPrinted),
              let string = String(data: data, encoding: .utf8) else { return "{}" }
        return string
    }

    @MainActor
    private func parseTavernV2JSON(data: Data, imageData: Data?, ownerUserId: UUID?) -> Character? {
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
            ownerUserId: ownerUserId,
            visibility: ownerUserId == nil ? .shared : nil,
            avatarData: imageData
        )

        // Parse journal entries from character_book if present
        if let book = dict["character_book"] as? [String: Any],
           let bookEntries = book["entries"] as? [[String: Any]] {
            for entry in bookEntries {
                if let key = entry["name"] as? String,
                   let content = entry["content"] as? String {
                    let journal = JournalEntry(
                        characterId: character.id,
                        userId: ownerUserId,
                        triggerKeyphrase: key,
                        content: content,
                        character: character
                    )
                    SwiftDataContainer.shared.context.insert(journal)
                }
            }
            try? SwiftDataContainer.shared.context.save()
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
