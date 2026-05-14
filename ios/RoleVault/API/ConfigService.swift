import Foundation

@Observable
final class ConfigService {
    static let shared = ConfigService()
    private let api = RoleVaultAPI.shared

    func fetchConfig() async throws -> ServerConfig {
        return try await api.get(path: "/api/config")
    }
}

struct ServerConfig: Codable {
    let inferenceUrl: String
    let models: [String]
    let version: String
}
