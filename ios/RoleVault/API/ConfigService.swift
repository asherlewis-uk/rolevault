import Foundation

@Observable
final class ConfigService {
    static let shared = ConfigService()
    private let api = LibreChatAPI.shared

    func fetchConfig() async throws -> ServerConfig {
        return try await api.get(path: "/api/config")
    }
}
