import SwiftUI
import SwiftData

struct ChatDetailView: View {
    let character: Character
    @State private var viewModel = ChatViewModel()
    @State private var messageText: String = ""
    @State private var showEditSheet = false
    @State private var showPersonaMenu = false
    @State private var scrollOffset: CGFloat = 0
    @State private var appearedMessageIDs = Set<String>()
    @Query private var personas: [Persona]
    @Query(sort: \MessageWrapper.id) private var localMessages: [MessageWrapper]

    var activePersona: Persona? {
        personas.first { $0.isActive }
    }

    var body: some View {
        ZStack {
            // Background layers
            blurredAvatarBackground
            AuroraBackground()
                .opacity(0.3)

            // Content
            ScrollViewReader { proxy in
                ScrollView {
                    GeometryReader { geo in
                        Color.clear
                            .preference(
                                key: ScrollOffsetPreferenceKey.self,
                                value: geo.frame(in: .named("chatScroll")).minY
                            )
                    }
                    .frame(height: 0)

                    messageList
                    .padding()
                }
                .coordinateSpace(name: "chatScroll")
                .onPreferenceChange(ScrollOffsetPreferenceKey.self) { value in
                    scrollOffset = value
                }
                .onChange(of: viewModel.messages.count) { _, _ in
                    scrollToBottom(proxy: proxy)
                }
                .onChange(of: viewModel.isTyping) { _, _ in
                    scrollToBottom(proxy: proxy)
                }
            }

            VStack(spacing: 0) {
                CharacterHeader(
                    character: character,
                    isTyping: viewModel.isTyping,
                    scrollOffset: scrollOffset,
                    onEdit: { showEditSheet = true }
                )
                .padding(.horizontal)
                .padding(.top, 8)

                Spacer()

                MessageInputBar(
                    text: $messageText,
                    personaName: activePersona?.name ?? "You",
                    onPersonaTap: { showPersonaMenu = true },
                    onSend: sendMessage
                )
                .padding(.horizontal)
                .padding(.bottom, 8)
            }
        }
        .navigationTitle(character.name)
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(.hidden, for: .navigationBar)
        .toolbar { personaToolbarItem }
        .sheet(isPresented: $showEditSheet) {
            EditCharacterSheet(character: character, onRefreshChat: {
                viewModel.refreshChat(for: character)
            })
        }
        .confirmationDialog("Switch Persona", isPresented: $showPersonaMenu, titleVisibility: .visible) {
            personaMenuActions
        }
        .task {
            await viewModel.loadConversation(character: character, persona: activePersona)
        }
        .onChange(of: viewModel.messages) { old, new in
            animateNewMessages(old: old, new: new)
        }
    }

    private var personaToolbarItem: some ToolbarContent {
        ToolbarItem(placement: .topBarTrailing) {
            Button {
                showPersonaMenu = true
            } label: {
                Text("Chatting as \(activePersona?.name ?? "You")")
                    .font(.caption.weight(.medium))
                    .foregroundStyle(.secondary)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .background(.ultraThinMaterial)
                    .clipShape(Capsule())
            }
        }
    }

    private var personaMenuActions: some View {
        Group {
            ForEach(personas) { persona in
                Button(persona.name) {
                    setActivePersona(persona)
                }
            }
            Button("Cancel", role: .cancel) { }
        }
    }

    private var blurredAvatarBackground: some View {
        Group {
            if let data = character.avatarData, let uiImage = UIImage(data: data) {
                Image(uiImage: uiImage)
                    .resizable()
                    .scaledToFill()
                    .blur(radius: 50)
                    .brightness(-0.3)
                    .saturation(0.6)
            } else {
                Color.black.opacity(0.4)
            }
        }
        .ignoresSafeArea()
    }

    private func sendMessage() {
        guard !messageText.trimmingCharacters(in: .whitespaces).isEmpty else { return }
        HapticEngine.impact(.light)
        let text = messageText
        messageText = ""
        Task {
            await viewModel.sendMessage(text, character: character, persona: activePersona)
        }
    }

    private func setActivePersona(_ persona: Persona) {
        for p in personas {
            p.isActive = (p.id == persona.id)
        }
        try? SwiftDataContainer.shared.context.save()
    }

    private func scrollToBottom(proxy: ScrollViewProxy) {
        withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
            if viewModel.isTyping {
                proxy.scrollTo("typing", anchor: .bottom)
            } else if let last = viewModel.messages.last {
                proxy.scrollTo(last.id, anchor: .bottom)
            }
        }
    }

    @ViewBuilder
    private var messageList: some View {
        LazyVStack(spacing: 12) {
            ForEach(viewModel.messages) { message in
                MessageBubble(
                    message: message,
                    isUser: message.isCreatedByUser,
                    characterAvatar: character.avatarData
                )
                .id(message.id)
                .opacity(appearedMessageIDs.contains(message.id) ? 1 : 0)
                .scaleEffect(appearedMessageIDs.contains(message.id) ? 1 : 0.92)
            }

            if viewModel.isTyping {
                TypingIndicator()
                    .id("typing")
                    .transition(.scale.combined(with: .opacity))
            }
        }
    }

    private func animateNewMessages(old: [LibreChatMessage], new: [LibreChatMessage]) {
        let newMessages = new.filter { !old.contains($0) }
        for (index, message) in newMessages.enumerated() {
            DispatchQueue.main.asyncAfter(deadline: .now() + Double(index) * 0.05) {
                withAnimation(.spring(response: 0.35, dampingFraction: 0.75)) {
                    _ = appearedMessageIDs.insert(message.id)
                }
            }
        }
    }
}

struct ScrollOffsetPreferenceKey: PreferenceKey {
    static var defaultValue: CGFloat = 0
    static func reduce(value: inout CGFloat, nextValue: () -> CGFloat) {
        value = nextValue()
    }
}

