import SwiftUI
import SwiftData

struct HomeView: View {
    @State private var viewModel = HomeViewModel()
    @Query(sort: \Character.updatedAt, order: .reverse) private var characters: [Character]
    @State private var searchText: String = ""
    @State private var selectedCategory: CharacterCategory? = nil
    @State private var isRefreshing = false

    var filteredCharacters: [Character] {
        characters.filter { character in
            let matchesSearch = searchText.isEmpty
                || character.name.localizedCaseInsensitiveContains(searchText)
            let matchesCategory = selectedCategory == nil
                || character.category == selectedCategory
            return matchesSearch && matchesCategory
        }
    }

    var body: some View {
        ZStack {
            AuroraBackground()

            ScrollView {
                LazyVStack(spacing: 16) {
                    categoryBar
                        .padding(.vertical, 12)

                    ForEach(filteredCharacters) { character in
                        CharacterCard(character: character) {
                            viewModel.selectedCharacter = character
                        }
                        .scrollTransition { content, phase in
                            content
                                .rotation3DEffect(
                                    .degrees(phase.value * 4),
                                    axis: (x: 0, y: 1, z: 0)
                                )
                                .opacity(phase.isIdentity ? 1 : 0.7)
                        }
                    }
                }
                .padding(.horizontal)
                .padding(.bottom, 32)
            }
            .scrollIndicators(.hidden)
            .refreshable {
                isRefreshing = true
                await viewModel.refresh()
                isRefreshing = false
            }
            .overlay(
                Group {
                    if isRefreshing {
                        SparkleTrail()
                            .allowsHitTesting(false)
                    }
                }
            )
        }
        .navigationTitle("RoleVault")
        .navigationBarTitleDisplayMode(.large)
        .searchable(text: $searchText, prompt: "Search characters...")
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button(action: {
                    HapticEngine.impact(.light)
                    viewModel.showNotifications = true
                }) {
                    Image(systemName: "bell.fill")
                        .symbolRenderingMode(.hierarchical)
                        .foregroundStyle(.primary)
                }
            }
        }
        .sheet(isPresented: $viewModel.showNotifications) {
            ActivityCenterView()
        }
        .sheet(item: $viewModel.selectedCharacter) { character in
            NavigationStack {
                ChatDetailView(character: character)
            }
        }
    }

    private var categoryBar: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 10) {
                CategoryPill(
                    title: "All",
                    isSelected: selectedCategory == nil,
                    color: .indigo
                ) {
                    withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                        HapticEngine.selection()
                        selectedCategory = nil
                    }
                }

                ForEach(CharacterCategory.allCases, id: \.self) { category in
                    CategoryPill(
                        title: category.rawValue,
                        isSelected: selectedCategory == category,
                        color: categoryColor(for: category)
                    ) {
                        withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                            HapticEngine.selection()
                            selectedCategory = category
                        }
                    }
                }
            }
            .padding(.horizontal)
        }
    }

    private func categoryColor(for category: CharacterCategory) -> Color {
        switch category {
        case .fantasy, .vampires, .werewolves: return .purple
        case .romance: return .pink
        case .gaming, .rpg, .powerful, .mafia: return .orange
        case .assistant, .learning, .creating: return .blue
        case .family, .lifestyle, .human, .humor: return .green
        case .history, .school: return .brown
        default: return .indigo
        }
    }
}
