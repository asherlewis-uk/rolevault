import Foundation
import SwiftData

@Observable
final class AuthService {
    static let shared = AuthService()
    private let api = LibreChatAPI.shared

    var isAuthenticated: Bool = false
    var currentUser: UserAccount?

    private init() {
        self.isAuthenticated = (try? KeychainManager.shared.retrieveJWT()) != nil
        if isAuthenticated {
            // AuthService is a singleton first accessed from SwiftUI/AppDelegate (main thread).
            self.currentUser = MainActor.assumeIsolated {
                try? fetchCurrentUser()
            }
        }
    }

    /// Authenticate with email and password, store tokens in Keychain, persist user account,
    /// and migrate any unscoped local data to the newly-authenticated user.
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

        // Persist or update the local user account
        if let remoteUser = response.user {
            await persistUserAccount(remoteUser: remoteUser)
        }

        return response
    }

    /// Call logout endpoint, clear Keychain tokens, reset app auth state,
    /// and clear the current user reference.
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
    private func persistUserAccount(remoteUser: LibreChatUser) async {
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
            account.name = remoteUser.name ?? existing.name
            account.email = remoteUser.email
            account.username = remoteUser.username ?? existing.username
            account.avatarUrl = remoteUser.avatar
            account.isCurrent = true
            account.touchLogin()
        } else {
            account = UserAccount(
                remoteId: remoteId,
                email: remoteUser.email,
                name: remoteUser.name ?? remoteUser.username ?? "User",
                username: remoteUser.username ?? "",
                avatarUrl: remoteUser.avatar,
                isCurrent: true
            )
            context.insert(account)
        }

        try? context.save()
        currentUser = account

        // Migrate any legacy unscoped data to this user (once per device)
        await migrateUnscopedData(to: account)
    }

    @MainActor
    private func fetchCurrentUser() throws -> UserAccount? {
        let descriptor = FetchDescriptor<UserAccount>(
            predicate: #Predicate { $0.isCurrent == true }
        )
        return try SwiftDataContainer.shared.context.fetch(descriptor).first
    }

    // MARK: - Migration

    private static let unscopedMigrationKey = "rolevault_unscoped_migration_completed"

    /// Assigns the current user's ID to any local data that lacks user scoping.
    /// This runs once per device after the first login on the new scoped schema.
    @MainActor
    private func migrateUnscopedData(to user: UserAccount) async {
        guard !UserDefaults.standard.bool(forKey: Self.unscopedMigrationKey) else { return }

        let context = SwiftDataContainer.shared.context
        let userId = user.id

        // Migrate Conversations
        if let convos = try? context.fetch(FetchDescriptor<Conversation>()) {
            let unscoped = convos.filter { $0.userId == nil }
            for convo in unscoped {
                convo.userId = userId
            }
        }

        // Migrate MessageWrappers
        if let messages = try? context.fetch(FetchDescriptor<MessageWrapper>()) {
            let unscoped = messages.filter { $0.userId == nil }
            for msg in unscoped {
                msg.userId = userId
            }
        }

        // Migrate Personas
        if let personas = try? context.fetch(FetchDescriptor<Persona>()) {
            let unscoped = personas.filter { $0.userId == nil }
            for persona in unscoped {
                persona.userId = userId
            }
        }

        // Migrate JournalEntries
        if let journals = try? context.fetch(FetchDescriptor<JournalEntry>()) {
            let unscoped = journals.filter { $0.userId == nil }
            for entry in unscoped {
                entry.userId = userId
            }
        }

        // Migrate GalleryMoments
        if let moments = try? context.fetch(FetchDescriptor<GalleryMoment>()) {
            let unscoped = moments.filter { $0.userId == nil }
            for moment in unscoped {
                moment.userId = userId
            }
        }

        // Migrate Character ownership (only claim legacy/unmigrated characters)
        if let characters = try? context.fetch(FetchDescriptor<Character>()) {
            let unscoped = characters.filter { $0.visibility == .legacy }
            for character in unscoped {
                character.ownerUserId = userId
                character.visibility = .owned
            }
        }

        try? context.save()
        UserDefaults.standard.set(true, forKey: Self.unscopedMigrationKey)
    }
}
