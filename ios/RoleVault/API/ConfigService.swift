import Foundation

@Observable
final class ConfigService {
    static let shared = ConfigService()
    private let api = RoleVaultAPI.shared

    func fetchConfig() async throws -> ServerConfig {
        let config: ServerConfig = try await api.get(path: "/api/config")

        // Feed inference URL to InferenceAPI and default model to ChatService
        await MainActor.run {
            InferenceAPI.shared.baseURL = config.inferenceUrl
            if let firstModel = config.models.first {
                ChatService.defaultModel = firstModel
            }
        }

        return config
    }
}

struct ServerConfig: Codable {
    let inferenceUrl: String
    let models: [String]
    let version: String
}
