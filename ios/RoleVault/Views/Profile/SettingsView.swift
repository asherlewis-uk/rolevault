import SwiftUI

struct SettingsView: View {
    @AppStorage("hapticsEnabled") private var hapticsEnabled: Bool = true
    @AppStorage("darkModeOverride") private var darkModeOverride: Bool = false
    @AppStorage("streamResponses") private var streamResponses: Bool = true

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
    }
}
