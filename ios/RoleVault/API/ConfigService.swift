import Foundation

@Observable
final class ConfigService {
    static let shared = ConfigService()
    private let api = RoleVaultAPI.shared

    var availableModels: [String] = []
    var isConfigured = false
    var configError: String?

    func fetchConfig() async throws -> ServerConfig {
        do {
            let config: ServerConfig = try await api.get(path: "/api/config")

            await MainActor.run {
                InferenceAPI.shared.baseURL = config.inferenceUrl
                availableModels = config.models
                isConfigured = !config.models.isEmpty
                configError = nil
                let persisted = UserDefaults.standard.string(forKey: "selectedModel")
                if let persisted, config.models.contains(persisted) {
                    ChatService.defaultModel = persisted
                } else if let firstModel = config.models.first {
                    ChatService.defaultModel = firstModel
                    UserDefaults.standard.set(firstModel, forKey: "selectedModel")
                }
            }

            return config
        } catch {
            await MainActor.run {
                availableModels = []
                isConfigured = false
                configError = error.localizedDescription
            }
            throw error
        }
    }
}

struct ServerConfig: Codable {
    let inferenceUrl: String
    let models: [String]
    let version: String
}
