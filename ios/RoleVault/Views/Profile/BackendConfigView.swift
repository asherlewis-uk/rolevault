import SwiftUI

struct BackendConfigView: View {
    @State private var urlString: String = ""
    @State private var showTestResult: Bool = false
    @State private var testSuccess: Bool = false
    @State private var isTesting: Bool = false
    @State private var serverConfig: ServerConfig?

    var body: some View {
        ZStack {
            AuroraBackground()

            Form {
                Section("Server URL") {
                    TextField("http://localhost:3080", text: $urlString)
                        .keyboardType(.URL)
                        .autocorrectionDisabled()
                        .textInputAutocapitalization(.never)
                }

                Section {
                    Button {
                        Task { await testConnection() }
                    } label: {
                        HStack {
                            Text("Test Connection")
                            if isTesting {
                                Spacer()
                                ProgressView()
                            }
                        }
                    }
                    .disabled(urlString.isEmpty || isTesting)

                    if showTestResult {
                        HStack {
                            Image(systemName: testSuccess ? "checkmark.circle.fill" : "xmark.circle.fill")
                                .foregroundStyle(testSuccess ? .green : .red)
                            Text(testSuccess ? "Connected" : "Failed")
                                .foregroundStyle(testSuccess ? .green : .red)
                        }
                    }
                }

                if let config = serverConfig {
                    Section("Server Info") {
                        LabeledContent("Version", value: config.version ?? "Unknown")
                        LabeledContent("Registration", value: config.registrationEnabled == true ? "Enabled" : "Disabled")
                    }
                }

                Section {
                    Button("Save") {
                        HapticEngine.notification(.success)
                        LibreChatAPI.shared.baseURL = urlString.trimmingCharacters(in: .whitespaces)
                    }
                    .frame(maxWidth: .infinity)
                    .foregroundStyle(.tint)
                }
            }
            .scrollContentBackground(.hidden)
        }
        .navigationTitle("Backend")
        .onAppear {
            urlString = LibreChatAPI.shared.baseURL
        }
    }

    private func testConnection() async {
        isTesting = true
        defer { isTesting = false }

        let original = LibreChatAPI.shared.baseURL
        LibreChatAPI.shared.baseURL = urlString.trimmingCharacters(in: .whitespaces)

        do {
            let config = try await ConfigService.shared.fetchConfig()
            await MainActor.run {
                serverConfig = config
                testSuccess = true
                showTestResult = true
            }
        } catch {
            await MainActor.run {
                testSuccess = false
                showTestResult = true
            }
        }

        // Don't persist until user taps Save
        LibreChatAPI.shared.baseURL = original
    }
}
