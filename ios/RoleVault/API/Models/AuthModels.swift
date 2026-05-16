import Foundation

struct LoginRequest: Codable {
    let email: String
    let password: String
}

struct MagicLinkResponse: Codable {
    let detail: String
    let token: String
    let expiresAt: String

    enum CodingKeys: String, CodingKey {
        case detail, token
        case expiresAt = "expires_at"
    }
}

struct TokenResponse: Codable {
    let accessToken: String
    let refreshToken: String
    let tokenType: String
    let user: UserResponse
}

struct UserResponse: Codable {
    let id: String
    let email: String
    let displayName: String?
    let avatarUrl: String?
    let createdAt: String?
    let updatedAt: String?
}

struct RefreshRequest: Codable {
    let refreshToken: String
}
