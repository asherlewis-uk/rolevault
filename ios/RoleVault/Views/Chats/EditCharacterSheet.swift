import SwiftUI
import SwiftData

struct EditCharacterSheet: View {
    @Environment(\.dismiss) private var dismiss
    let character: Character
    var onRefreshChat: (() -> Void)?

    @State private var name: String = ""
    @State private var greeting: String = ""
    @State private var subtitle: String = ""
    @State private var background: String = ""
    @State private var awayMessage: String = ""
    @State private var isOwner: Bool = false
    @State private var showCustomizationNote: Bool = false

    var body: some View {
        NavigationStack {
            Form {
                if showCustomizationNote {
                    Section {
                        Text("This is a shared character. Your edits will be saved as a personal customization and will not affect the original character or other users.")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }

                Section("Identity") {
                    TextField("Name", text: $name)
                        .disabled(!isOwner)
                    TextField("Subtitle", text: $subtitle)
                        .disabled(!isOwner)
                }

                Section("Greeting") {
                    TextField("Greeting message", text: $greeting, axis: .vertical)
                        .lineLimit(3...6)
                }

                Section("Away Status") {
                    TextField("Away message", text: $awayMessage)
                }

                Section("Background") {
                    TextEditor(text: $background)
                        .frame(minHeight: 120)
                }

                Section {
                    Button(role: .destructive) {
                        refreshChat()
                    } label: {
                        Label("Refresh Chat", systemImage: "arrow.clockwise")
                    }
                }
            }
            .navigationTitle("Edit Character")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") { save() }
                }
            }
            .onAppear {
                let currentUserId = AuthService.shared.currentUser?.id
                isOwner = (character.ownerUserId == currentUserId)
                showCustomizationNote = !isOwner

                name = character.name
                greeting = character.greetingMessage
                subtitle = character.subtitle
                background = character.backstory
                awayMessage = character.awayMessage ?? ""
            }
        }
    }

    private func save() {
        guard let currentUserId = AuthService.shared.currentUser?.id else { return }

        if isOwner {
            // Edit the base character directly
            character.name = name
            character.greetingMessage = greeting
            character.subtitle = subtitle
            character.backstory = background
            character.awayMessage = awayMessage.isEmpty ? nil : awayMessage
            character.touch()
            try? SwiftDataContainer.shared.context.save()
        } else {
            // Save as a per-user customization overlay
            do {
                let customization = try CharacterStore.shared.ensureCustomization(
                    characterId: character.id,
                    userId: currentUserId
                )
                customization.greetingMessage = greeting.isEmpty ? nil : greeting
                customization.backstory = background.isEmpty ? nil : background
                customization.awayMessage = awayMessage.isEmpty ? nil : awayMessage
                try CharacterStore.shared.updateCustomization(customization)
            } catch {
                // Silently fail for now; in production we'd surface this error
            }
        }

        HapticEngine.notification(.success)
        dismiss()
    }

    private func refreshChat() {
        HapticEngine.impact(.medium)
        onRefreshChat?()
        dismiss()
    }
}
