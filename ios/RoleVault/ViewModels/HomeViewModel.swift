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

    /// Refreshes local character list from SwiftData.
    /// Characters are the source of truth locally; no remote sync is performed.
    func refresh() async {
        isRefreshing = true
        do {
            _ = try await CharacterStore.shared.fetchAll()
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
        do {
            try CharacterStore.shared.toggleFavorite(character)
        } catch {
            errorMessage = error.localizedDescription
            showError = true
        }
    }

    @MainActor
    func deleteCharacter(_ character: Character) {
        do {
            try CharacterStore.shared.delete(character)
        } catch {
            errorMessage = error.localizedDescription
            showError = true
        }
    }
}
