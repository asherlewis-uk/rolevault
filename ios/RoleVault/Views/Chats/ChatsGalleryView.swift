import SwiftUI
import SwiftData

struct ChatsGalleryView: View {
    @State private var conversations: [Conversation] = []
    @State private var moments: [GalleryMoment] = []
    @State private var segment: Segment = .chats

    enum Segment: String, CaseIterable {
        case chats = "Chats"
        case gallery = "Moments"
    }

    var body: some View {
        ZStack {
            AuroraBackground()

            VStack(spacing: 0) {
                Picker("", selection: $segment) {
                    ForEach(Segment.allCases, id: \.self) { s in
                        Text(s.rawValue).tag(s)
                    }
                }
                .pickerStyle(.segmented)
                .padding()

                if segment == .chats {
                    chatsList
                } else {
                    galleryGrid
                }
            }
        }
        .navigationTitle("Chats")
        .task(id: AuthService.shared.currentUser?.id) {
            await loadData()
        }
        .onAppear {
            Task { await loadData() }
        }
    }

    private var chatsList: some View {
        Group {
            if conversations.isEmpty {
                ContentUnavailableView(
                    "No Conversations",
                    systemImage: "message",
                    description: Text("Start chatting with a character from Home.")
                )
                .padding(.top, 60)
            } else {
                List {
                    ForEach(conversations) { convo in
                        NavigationLink(value: convo) {
                            ConversationRow(convo: convo)
                        }
                        .listRowBackground(Color.clear)
                        .listRowSeparator(.hidden)
                        .swipeActions(edge: .trailing) {
                            Button(role: .destructive) {
                                deleteConversation(convo)
                            } label: {
                                Label("Delete", systemImage: "trash")
                            }
                        }
                    }
                }
                .listStyle(.plain)
                .scrollContentBackground(.hidden)
                .navigationDestination(for: Conversation.self) { convo in
                    if let character = characterFor(convo: convo) {
                        ChatDetailView(character: character)
                    } else {
                        Text("Character not found")
                    }
                }
            }
        }
    }

    private var galleryGrid: some View {
        Group {
            if moments.isEmpty {
                ContentUnavailableView(
                    "No Saved Moments",
                    systemImage: "text.bubble",
                    description: Text("Save meaningful messages from any conversation to keep them here.")
                )
                .padding(.top, 60)
            } else {
                List {
                    ForEach(moments) { moment in
                        MomentRow(moment: moment)
                            .listRowBackground(Color.clear)
                            .listRowSeparator(.hidden)
                    }
                }
                .listStyle(.plain)
                .scrollContentBackground(.hidden)
            }
        }
    }

    private func deleteConversation(_ convo: Conversation) {
        withAnimation {
            try? CascadeStore.deleteConversation(convo, context: SwiftDataContainer.shared.context)
            conversations.removeAll { $0.id == convo.id }
        }
    }

    private func characterFor(convo: Conversation) -> Character? {
        guard let characterId = convo.characterId else { return nil }
        return try? CharacterStore.shared.fetch(id: characterId)
    }

    @MainActor
    private func loadData() async {
        guard let userId = AuthService.shared.currentUser?.id else {
            conversations = []
            moments = []
            return
        }
        let context = SwiftDataContainer.shared.context

        let convoDescriptor = FetchDescriptor<Conversation>(
            predicate: #Predicate { $0.userId == userId },
            sortBy: [SortDescriptor(\.lastMessageAt, order: .reverse)]
        )
        conversations = (try? context.fetch(convoDescriptor)) ?? []

        let momentDescriptor = FetchDescriptor<GalleryMoment>(
            predicate: #Predicate { $0.userId == userId },
            sortBy: [SortDescriptor(\.createdAt, order: .reverse)]
        )
        moments = (try? context.fetch(momentDescriptor)) ?? []
    }
}

struct ConversationRow: View {
    let convo: Conversation

    var body: some View {
        HStack(spacing: 14) {
            ZStack {
                Circle()
                    .fill(.thinMaterial)
                    .frame(width: 50, height: 50)
                Text(String((convo.title.prefix(1))))
                    .font(.title3.weight(.semibold))
            }

            VStack(alignment: .leading, spacing: 4) {
                Text(convo.title.isEmpty ? "New Chat" : convo.title)
                    .font(.headline)
                Text(convo.lastMessagePreview)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }

            Spacer()

            if convo.unreadCount > 0 {
                Text("\(convo.unreadCount)")
                    .font(.caption2.weight(.bold))
                    .foregroundStyle(.white)
                    .frame(minWidth: 20, minHeight: 20)
                    .background(Circle().fill(.tint))
            }
        }
        .padding(.vertical, 8)
        .padding(.horizontal, 12)
        .background(.ultraThinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        .shadow(color: .black.opacity(0.06), radius: 8, x: 0, y: 3)
    }
}

struct MomentRow: View {
    let moment: GalleryMoment

    var body: some View {
        HStack(spacing: 14) {
            ZStack {
                Circle()
                    .fill(RoleVaultColor.primary.opacity(0.15))
                    .frame(width: 44, height: 44)
                Image(systemName: "text.bubble.fill")
                    .font(.callout)
                    .foregroundStyle(RoleVaultColor.primary)
            }

            VStack(alignment: .leading, spacing: 4) {
                Text(moment.caption)
                    .font(.subheadline.weight(.semibold))
                    .lineLimit(1)
                Text(moment.textExcerpt)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(2)
            }

            Spacer()

            Text(moment.createdAt.timeAgo())
                .font(.caption2)
                .foregroundStyle(.tertiary)
        }
        .padding()
        .background(.ultraThinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        .shadow(color: .black.opacity(0.04), radius: 6, x: 0, y: 2)
    }
}
