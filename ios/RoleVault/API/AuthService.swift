import Foundation

@Observable
final class AuthService {
    static let shared = AuthService()
    private let api = LibreChatAPI.shared

    var isAuthenticated: Bool = false

    private init() {
        self.isAuthenticated = (try? KeychainManager.shared.retrieveJWT()) != nil
    }

    /// Authenticate with email and password, store tokens in Keychain, and publish auth state.
    func login(email: String, password: String) async throws -> LoginResponse {
        let request = LoginRequest(email: email, password: password)
        let response: LoginResponse = try await api.post(path: "/api/auth/login", body: request)

        try KeychainManager.shared.saveJWT(response.token)
        if let refresh = response.refreshToken {
            try KeychainManager.shared.saveRefreshToken(refresh)
        }

        await MainActor.run {
            isAuthenticated = true
        }
        return response
    }

    /// Call logout endpoint, clear Keychain tokens, and reset app auth state.
    func logout() async throws {
        _ = try? await api.request(path: "/api/auth/logout", method: "POST")
        try KeychainManager.shared.deleteJWT()
        try KeychainManager.shared.deleteRefreshToken()
        await MainActor.run {
            isAuthenticated = false
        }
    }

    /// Re-evaluate auth state from Keychain (useful on app launch).
    func checkAuth() {
        isAuthenticated = (try? KeychainManager.shared.retrieveJWT()) != nil
    }
}
