import SwiftUI
import SwiftData

struct ChatsGalleryView: View {
    @State private var conversations: [Conversation] = []
    @State private var moments: [GalleryMoment] = []
    @State private var segment: Segment = .chats

    enum Segment: String, CaseIterable {
        case chats = "Chats"
        case gallery = "Gallery"
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

    private var galleryGrid: some View {
        ScrollView {
            LazyVGrid(columns: [GridItem(.adaptive(minimum: 120))], spacing: 12) {
                ForEach(moments) { moment in
                    GalleryThumbnail(moment: moment)
                }
            }
            .padding()
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

struct GalleryThumbnail: View {
    let moment: GalleryMoment

    var body: some View {
        VStack(spacing: 6) {
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .fill(.thinMaterial)
                .frame(height: 120)
                .overlay(
                    Group {
                        if let data = moment.imageData, let uiImage = UIImage(data: data) {
                            Image(uiImage: uiImage)
                                .resizable()
                                .scaledToFill()
                        } else {
                            Image(systemName: "photo")
                                .font(.largeTitle)
                                .foregroundStyle(.secondary)
                        }
                    }
                    .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                )
                .shadow(color: .black.opacity(0.08), radius: 8, x: 0, y: 4)

            Text(moment.caption)
                .font(.caption)
                .lineLimit(1)
                .foregroundStyle(.secondary)
        }
    }
}
