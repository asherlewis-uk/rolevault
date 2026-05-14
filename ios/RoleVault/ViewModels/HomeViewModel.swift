import SwiftUI
import SwiftData

@Observable
final class HomeViewModel {
    var selectedCharacter: Character?
    var showNotifications = false
    var errorMessage: String?
    var showError = false
    var isRefreshing = false

    var searchQuery: String = ""
    var selectedCategory: CharacterCategory?
    var sortOption: CharacterStore.SortOption = .recentlyUpdated

    /// Cached favorite character IDs for the current user to avoid O(N) fetches.
    private var favoriteCharacterIds: Set<UUID> = []

    /// Refreshes local character list from SwiftData and reloads favorite cache.
    /// Characters are the source of truth locally; no remote sync is performed.
    func refresh() async {
        isRefreshing = true
        do {
            _ = try await CharacterStore.shared.fetchAll()
            await reloadFavoriteCache()
        } catch {
            await MainActor.run {
                errorMessage = error.localizedDescription
                showError = true
            }
        }
        isRefreshing = false
    }

    @MainActor
    func filteredCharacters() throws -> [Character] {
        return try CharacterStore.shared.search(
            query: searchQuery,
            category: selectedCategory,
            sort: sortOption
        )
    }

    @MainActor
    func toggleFavorite(_ character: Character) {
        guard let userId = AuthService.shared.currentUser?.id else { return }
        Task {
            do {
                try await CharacterStore.shared.toggleFavorite(characterId: character.id, userId: userId)
                // Update local cache immediately
                if favoriteCharacterIds.contains(character.id) {
                    favoriteCharacterIds.remove(character.id)
                } else {
                    favoriteCharacterIds.insert(character.id)
                }
            } catch {
                errorMessage = error.localizedDescription
                showError = true
            }
        }
    }

    @MainActor
    func isFavorite(_ character: Character) -> Bool {
        favoriteCharacterIds.contains(character.id)
    }

    @MainActor
    func deleteCharacter(_ character: Character) {
        Task {
            do {
                try await CharacterStore.shared.delete(character)
                favoriteCharacterIds.remove(character.id)
            } catch {
                errorMessage = error.localizedDescription
                showError = true
            }
        }
    }

    // MARK: - Private

    @MainActor
    private func reloadFavoriteCache() {
        guard let userId = AuthService.shared.currentUser?.id else {
            favoriteCharacterIds.removeAll()
            return
        }
        do {
            let customizations = try CharacterStore.shared.fetchAllCustomizations(for: userId)
            favoriteCharacterIds = Set(customizations.filter { $0.isFavorite }.map(\.characterId))
        } catch {
            favoriteCharacterIds.removeAll()
        }
    }
}
