import Foundation
import Security

enum KeychainError: Error {
    case itemNotFound
    case duplicateItem
    case invalidStatus(OSStatus)
    case conversionFailed
}

final class KeychainManager {
    static let shared = KeychainManager()
    private init() {}

    private let service = "com.rolevault.auth"

    func save(token: String, for account: String) throws {
        let data = Data(token.utf8)

        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly
        ]

        let status = SecItemAdd(query as CFDictionary, nil)

        if status == errSecDuplicateItem {
            let updateQuery: [String: Any] = [
                kSecClass as String: kSecClassGenericPassword,
                kSecAttrService as String: service,
                kSecAttrAccount as String: account
            ]
            let attributes: [String: Any] = [
                kSecValueData as String: data
            ]
            let updateStatus = SecItemUpdate(updateQuery as CFDictionary, attributes as CFDictionary)
            guard updateStatus == errSecSuccess else {
                throw KeychainError.invalidStatus(updateStatus)
            }
        } else if status != errSecSuccess {
            throw KeychainError.invalidStatus(status)
        }
    }

    func retrieveToken(for account: String) throws -> String {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]

        var result: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &result)

        guard status == errSecSuccess else {
            if status == errSecItemNotFound {
                throw KeychainError.itemNotFound
            }
            throw KeychainError.invalidStatus(status)
        }

        guard let data = result as? Data, let token = String(data: data, encoding: .utf8) else {
            throw KeychainError.conversionFailed
        }

        return token
    }

    func deleteToken(for account: String) throws {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account
        ]

        let status = SecItemDelete(query as CFDictionary)
        guard status == errSecSuccess || status == errSecItemNotFound else {
            throw KeychainError.invalidStatus(status)
        }
    }
}

extension KeychainManager {
    static let jwtAccount = "rolevault_access"
    static let refreshAccount = "rolevault_refresh"

    func saveJWT(_ token: String) throws {
        try save(token: token, for: Self.jwtAccount)
    }

    func retrieveJWT() throws -> String {
        try retrieveToken(for: Self.jwtAccount)
    }

    func deleteJWT() throws {
        try deleteToken(for: Self.jwtAccount)
    }

    func saveRefreshToken(_ token: String) throws {
        try save(token: token, for: Self.refreshAccount)
    }

    func retrieveRefreshToken() throws -> String {
        try retrieveToken(for: Self.refreshAccount)
    }

    func deleteRefreshToken() throws {
        try deleteToken(for: Self.refreshAccount)
    }
}
