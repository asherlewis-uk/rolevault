import SwiftUI

struct SettingsView: View {
    @AppStorage("hapticsEnabled") private var hapticsEnabled: Bool = true
    @AppStorage("darkModeOverride") private var darkModeOverride: Bool = false
    @AppStorage("streamResponses") private var streamResponses: Bool = true
    @State private var selectedModel: String = ChatService.defaultModel

    var body: some View {
        ZStack {
            AuroraBackground()

            Form {
                Section("Appearance") {
                    Toggle("Dark Mode", isOn: $darkModeOverride)
                }

                Section("Feedback") {
                    Toggle("Haptics", isOn: $hapticsEnabled)
                }

                Section("Chat") {
                    Toggle("Stream Responses", isOn: $streamResponses)

                    if !ConfigService.shared.availableModels.isEmpty {
                        Picker("Model", selection: $selectedModel) {
                            ForEach(ConfigService.shared.availableModels, id: \.self) { model in
                                Text(model).tag(model)
                            }
                        }
                        .onChange(of: selectedModel) { _, newValue in
                            ChatService.defaultModel = newValue
                        }
                    }
                }

                Section("About") {
                    HStack {
                        Text("Version")
                        Spacer()
                        Text("1.0.0 (TestFlight)")
                            .foregroundStyle(.secondary)
                    }
                }
            }
            .scrollContentBackground(.hidden)
        }
        .navigationTitle("Settings")
        .task {
            selectedModel = ChatService.defaultModel
        }
    }
}
