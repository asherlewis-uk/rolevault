import SwiftUI

struct SettingsView: View {
    @AppStorage("hapticsEnabled") private var hapticsEnabled: Bool = true
    @AppStorage("darkModeOverride") private var darkModeOverride: Bool = false
    @AppStorage("streamResponses") private var streamResponses: Bool = true
    @AppStorage("selectedModel") private var selectedModel: String = ""

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
                            if !newValue.isEmpty {
                                ChatService.defaultModel = newValue
                            }
                        }
                    } else if let error = ConfigService.shared.configError {
                        HStack {
                            Image(systemName: "exclamationmark.triangle.fill")
                                .foregroundStyle(.orange)
                            Text(error)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    } else {
                        HStack {
                            ProgressView()
                                .scaleEffect(0.8)
                            Text("Loading models...")
                                .font(.caption)
                                .foregroundStyle(.secondary)
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
            if selectedModel.isEmpty || !ConfigService.shared.availableModels.contains(selectedModel) {
                if let first = ConfigService.shared.availableModels.first {
                    selectedModel = first
                    ChatService.defaultModel = first
                }
            }
        }
    }
}
