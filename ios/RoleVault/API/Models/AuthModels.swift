import Foundation

struct LoginRequest: Codable {
    let email: String
    let password: String
}

struct LoginResponse: Codable {
    let token: String
    let refreshToken: String?
    let user: LibreChatUser?
}

struct LibreChatUser: Codable {
    let id: String
    let email: String
    let name: String?
    let username: String?
    let avatar: String?
}

struct RefreshResponse: Codable {
    let token: String
}
