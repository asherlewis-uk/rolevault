import Foundation
import SwiftData

@Observable
final class AuthService {
    static let shared = AuthService()
    private let api = RoleVaultAPI.shared

    var isAuthenticated: Bool = false
    var currentUser: UserAccount?

    private init() {
        self.isAuthenticated = (try? KeychainManager.shared.retrieveJWT()) != nil
    }

    /// Sign in with Apple. Sends the identity token to the backend which verifies it and returns a RoleVault JWT.
    func signInWithApple(identityToken: String) async throws -> TokenResponse {
        let body = ["identity_token": identityToken]
        let response: TokenResponse = try await api.post(path: "/api/auth/apple", body: body)

        try KeychainManager.shared.saveJWT(response.accessToken)
        try KeychainManager.shared.saveRefreshToken(response.refreshToken)

        await MainActor.run {
            isAuthenticated = true
        }

        await persistUserAccount(remoteUser: response.user)

        return response
    }

    /// Request a magic link. Returns the token inline in dev mode.
    func requestMagicLink(email: String) async throws -> MagicLinkResponse {
        let body = ["email": email]
        return try await api.post(path: "/api/auth/magic-link/request", body: body)
    }

    /// Verify a magic link token and authenticate.
    func verifyMagicLink(token: String) async throws -> TokenResponse {
        let body = ["token": token]
        let response: TokenResponse = try await api.post(path: "/api/auth/magic-link/verify", body: body)

        try KeychainManager.shared.saveJWT(response.accessToken)
        try KeychainManager.shared.saveRefreshToken(response.refreshToken)

        await MainActor.run {
            isAuthenticated = true
        }

        await persistUserAccount(remoteUser: response.user)

        return response
    }

    /// Authenticate with email and password, store tokens in Keychain, persist user account.
    func login(email: String, password: String) async throws -> TokenResponse {
        let request = LoginRequest(email: email, password: password)
        let response: TokenResponse = try await api.post(path: "/api/auth/login", body: request)

        try KeychainManager.shared.saveJWT(response.accessToken)
        try KeychainManager.shared.saveRefreshToken(response.refreshToken)

        await MainActor.run {
            isAuthenticated = true
        }

        await persistUserAccount(remoteUser: response.user)

        return response
    }

    /// Call logout endpoint, clear Keychain tokens, reset app auth state.
    func logout() async throws {
        _ = try? await api.request(path: "/api/auth/logout", method: "POST")
        try KeychainManager.shared.deleteJWT()
        try KeychainManager.shared.deleteRefreshToken()
        await MainActor.run {
            isAuthenticated = false
            currentUser = nil
        }
    }

    /// Re-evaluate auth state from Keychain and reload current user.
    @MainActor
    func checkAuth() {
        isAuthenticated = (try? KeychainManager.shared.retrieveJWT()) != nil
        if isAuthenticated {
            currentUser = try? fetchCurrentUser()
        } else {
            currentUser = nil
        }
    }

    // MARK: - User Account Management

    @MainActor
    private func persistUserAccount(remoteUser: UserResponse) async {
        let context = SwiftDataContainer.shared.context

        // Mark any previously-current user as not current
        let existingDescriptor = FetchDescriptor<UserAccount>()
        if let existing = try? context.fetch(existingDescriptor) {
            for user in existing {
                user.isCurrent = false
            }
        }

        // Find or create user account for this remote user
        let remoteId = remoteUser.id
        let descriptor = FetchDescriptor<UserAccount>(
            predicate: #Predicate { $0.remoteId == remoteId }
        )
        let account: UserAccount
        if let existing = try? context.fetch(descriptor).first {
            account = existing
            account.name = remoteUser.displayName ?? existing.name
            account.email = remoteUser.email
            account.avatarUrl = remoteUser.avatarUrl
            account.isCurrent = true
            account.touchLogin()
        } else {
            account = UserAccount(
                remoteId: remoteId,
                email: remoteUser.email,
                name: remoteUser.displayName ?? "User",
                username: "",
                avatarUrl: remoteUser.avatarUrl,
                isCurrent: true
            )
            context.insert(account)
        }

        try? context.save()
        currentUser = account
    }

    @MainActor
    private func fetchCurrentUser() throws -> UserAccount? {
        let descriptor = FetchDescriptor<UserAccount>(
            predicate: #Predicate { $0.isCurrent == true }
        )
        return try SwiftDataContainer.shared.context.fetch(descriptor).first
    }
}
