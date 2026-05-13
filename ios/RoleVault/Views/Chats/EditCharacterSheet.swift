import SwiftUI

struct EditCharacterSheet: View {
    @Environment(\.dismiss) private var dismiss
    let character: Character
    var onRefreshChat: (() -> Void)?

    @State private var name: String = ""
    @State private var greeting: String = ""
    @State private var subtitle: String = ""
    @State private var background: String = ""
    @State private var awayMessage: String = ""

    var body: some View {
        NavigationStack {
            Form {
                Section("Identity") {
                    TextField("Name", text: $name)
                    TextField("Subtitle", text: $subtitle)
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
                name = character.name
                greeting = character.greetingMessage
                subtitle = character.subtitle
                background = character.backstory
                awayMessage = character.awayMessage ?? ""
            }
        }
    }

    private func save() {
        character.name = name
        character.greetingMessage = greeting
        character.subtitle = subtitle
        character.backstory = background
        character.awayMessage = awayMessage.isEmpty ? nil : awayMessage
        character.touch()
        try? SwiftDataContainer.shared.context.save()
        HapticEngine.notification(.success)
        dismiss()
    }

    private func refreshChat() {
        HapticEngine.impact(.medium)
        onRefreshChat?()
        dismiss()
    }
}
