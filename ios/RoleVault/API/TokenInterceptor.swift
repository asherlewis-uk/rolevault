import Foundation

@Observable
final class TokenInterceptor {
    static let shared = TokenInterceptor()

    private var isRefreshing = false
    private var pendingContinuations: [CheckedContinuation<Bool, Never>] = []

    private init() {}

    static func shouldAttemptRefresh(for path: String) -> Bool {
        let normalizedPath = path.hasPrefix("/") ? path : "/\(path)"
        return normalizedPath != "/api/auth"
            && !normalizedPath.hasPrefix("/api/auth/")
            && normalizedPath != "/auth"
            && !normalizedPath.hasPrefix("/auth/")
    }

    /// Attempts to refresh the JWT using the stored refresh token.
    /// Prevents multiple simultaneous refresh calls.
    /// On failure, clears all tokens and publishes logout via AuthService.
    func attemptRefresh() async -> Bool {
        if isRefreshing {
            return await withCheckedContinuation { continuation in
                pendingContinuations.append(continuation)
            }
        }

        isRefreshing = true
        let success: Bool

        do {
            let refreshToken = try KeychainManager.shared.retrieveRefreshToken()
            guard let url = URL(string: RoleVaultAPI.shared.baseURL + "/api/auth/refresh") else {
                throw APIError.invalidURL
            }

            var request = URLRequest(url: url)
            request.httpMethod = "POST"
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.setValue("application/json", forHTTPHeaderField: "Accept")

            let deviceId = try KeychainManager.shared.retrieveOrCreateDeviceId()
            let body = RefreshRequest(refreshToken: refreshToken, deviceId: deviceId)
            request.httpBody = try JSONEncoder().encode(body)

            let (data, response) = try await URLSession.shared.data(for: request)
            guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
                throw APIError.unauthorized
            }

            let refreshed = try JSONDecoder().decode(TokenResponse.self, from: data)
            try KeychainManager.shared.saveJWT(refreshed.accessToken)
            try KeychainManager.shared.saveRefreshToken(refreshed.refreshToken)
            success = true
        } catch {
            await performLogout()
            success = false
        }

        isRefreshing = false
        let continuations = pendingContinuations
        pendingContinuations.removeAll()
        for continuation in continuations {
            continuation.resume(returning: success)
        }

        return success
    }

    private func performLogout() async {
        try? KeychainManager.shared.deleteJWT()
        try? KeychainManager.shared.deleteRefreshToken()
        await MainActor.run {
            AuthService.shared.isAuthenticated = false
            AuthService.shared.currentUser = nil
        }
    }
}
