import Foundation

/// Compatibility facade for backend-owned inference routes.
final class InferenceAPI {
    static let shared = InferenceAPI()

    private let api = RoleVaultAPI.shared

    private init() {
    }

    // MARK: - Public API

    func stream(path: String, method: String = "GET", body: Data? = nil) async throws -> (URLSession.AsyncBytes, HTTPURLResponse) {
        try await api.stream(path: Self.proxyPath(for: path), method: method, body: body)
    }

    // MARK: - Model Discovery

    struct ModelInfo: Codable {
        let id: String
        let object: String
        let created: Int?
        let ownedBy: String?
    }

    struct ModelListResponse: Codable {
        let object: String
        let data: [ModelInfo]
    }

    func fetchAvailableModels() async throws -> [String] {
        let config: ServerConfig = try await api.get(path: "/api/config")
        return config.models ?? []
    }

    // MARK: - Convenience Methods

    func get<T: Decodable>(path: String) async throws -> T {
        try await api.get(path: Self.proxyPath(for: path))
    }

    func post<T: Decodable, B: Encodable>(path: String, body: B) async throws -> T {
        try await api.post(path: Self.proxyPath(for: path), body: body)
    }

    private static func proxyPath(for path: String) -> String {
        switch path {
        case "/v1/chat/completions":
            return "/api/inference/chat/completions"
        case "/v1/models":
            return "/api/inference/models"
        default:
            return path
        }
    }
}
