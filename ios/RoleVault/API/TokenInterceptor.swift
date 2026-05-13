import Foundation

@Observable
final class TokenInterceptor {
    static let shared = TokenInterceptor()

    private var isRefreshing = false
    private var pendingContinuations: [CheckedContinuation<Bool, Never>] = []

    private init() {}

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
            guard let url = URL(string: LibreChatAPI.shared.baseURL + "/api/auth/refresh?retry=true") else {
                throw APIError.invalidURL
            }

            var request = URLRequest(url: url)
            request.httpMethod = "GET"
            request.setValue("Bearer \(refreshToken)", forHTTPHeaderField: "Authorization")
            request.setValue("application/json", forHTTPHeaderField: "Accept")

            let (data, response) = try await URLSession.shared.data(for: request)
            guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
                throw APIError.unauthorized
            }

            let refreshed = try JSONDecoder().decode(RefreshResponse.self, from: data)
            try KeychainManager.shared.saveJWT(refreshed.token)
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
        }
    }
}
