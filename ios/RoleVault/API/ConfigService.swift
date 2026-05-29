import Foundation

@Observable
final class ConfigService {
    static let shared = ConfigService()
    private let api = RoleVaultAPI.shared

    static let fallbackModels: [String] = [
        "llama3.2",
        "llama3.1:8b",
        "mistral",
        "mixtral:8x7b",
        "gemma2:9b",
        "phi3:mini",
    ]

    static let fallbackModel = "llama3.2"

    var availableModels: [String] = ConfigService.fallbackModels
    var isConfigured = false
    var configError: String?

    func fetchConfig() async throws -> ServerConfig {
        do {
            let config: ServerConfig = try await api.get(path: "/api/config")

            await MainActor.run {
                isConfigured = false
                configError = nil
            }

            let discovered = config.models ?? []

            await MainActor.run {
                availableModels = discovered.isEmpty ? ConfigService.fallbackModels : discovered
                isConfigured = true

                if ChatService.defaultModel.isEmpty || !availableModels.contains(ChatService.defaultModel) {
                    ChatService.defaultModel = availableModels.first ?? ConfigService.fallbackModel
                }
            }

            return config
        } catch {
            await MainActor.run {
                configError = error.localizedDescription
                isConfigured = false
            }
            throw error
        }
    }

}

struct ServerConfig: Codable {
    let models: [String]?
    let version: String
}
