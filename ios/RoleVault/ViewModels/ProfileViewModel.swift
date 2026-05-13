import SwiftUI
import SwiftData

@Observable
final class ProfileViewModel {
    var errorMessage: String?
    var showError = false
    var backendURL: String = LibreChatAPI.shared.baseURL
    var connectionTestResult: Bool?
    var isTestingConnection = false

    // MARK: - Auth

    func logout() async {
        try? await AuthService.shared.logout()
    }

    // MARK: - Personas

    @MainActor
    func createPersona(name: String, gender: String, backstory: String, avatarData: Data?) -> Persona {
        let userId = AuthService.shared.currentUser?.id
        let persona = Persona(
            name: name,
            gender: gender,
            backstory: backstory,
            avatarData: avatarData,
            isActive: false,
            userId: userId
        )
        SwiftDataContainer.shared.context.insert(persona)
        try? SwiftDataContainer.shared.context.save()
        return persona
    }

    @MainActor
    func deletePersona(_ persona: Persona) {
        SwiftDataContainer.shared.context.delete(persona)
        try? SwiftDataContainer.shared.context.save()
    }

    @MainActor
    func setActivePersona(_ persona: Persona) {
        guard let userId = AuthService.shared.currentUser?.id else { return }
        let descriptor = FetchDescriptor<Persona>(
            predicate: #Predicate { $0.userId == userId }
        )
        guard let all = try? SwiftDataContainer.shared.context.fetch(descriptor) else { return }
        for p in all {
            p.isActive = (p.id == persona.id)
        }
        try? SwiftDataContainer.shared.context.save()
    }

    // MARK: - Backend Configuration

    func updateBackendURL(_ url: String) {
        let trimmed = url.trimmingCharacters(in: .whitespaces)
        backendURL = trimmed
        LibreChatAPI.shared.baseURL = trimmed
    }

    func testConnection() async {
        isTestingConnection = true
        defer { isTestingConnection = false }
        do {
            _ = try await ConfigService.shared.fetchConfig()
            connectionTestResult = true
        } catch {
            connectionTestResult = false
            errorMessage = error.localizedDescription
        }
    }

    // MARK: - Cache Management

    @MainActor
    func clearConversationCache() {
        guard let userId = AuthService.shared.currentUser?.id else { return }
        let descriptor = FetchDescriptor<Conversation>(
            predicate: #Predicate { $0.userId == userId }
        )
        if let items = try? SwiftDataContainer.shared.context.fetch(descriptor) {
            for item in items {
                SwiftDataContainer.shared.context.delete(item)
            }
        }
        try? SwiftDataContainer.shared.context.save()
    }

    @MainActor
    func clearGalleryCache() {
        guard let userId = AuthService.shared.currentUser?.id else { return }
        let descriptor = FetchDescriptor<GalleryMoment>(
            predicate: #Predicate { $0.userId == userId }
        )
        if let items = try? SwiftDataContainer.shared.context.fetch(descriptor) {
            for item in items {
                SwiftDataContainer.shared.context.delete(item)
            }
        }
        try? SwiftDataContainer.shared.context.save()
    }

    @MainActor
    func clearAllLocalData() {
        guard let userId = AuthService.shared.currentUser?.id else { return }
        clearConversationCache()
        clearGalleryCache()

        let charDescriptor = FetchDescriptor<Character>(
            predicate: #Predicate { $0.ownerUserId == userId }
        )
        if let chars = try? SwiftDataContainer.shared.context.fetch(charDescriptor) {
            chars.forEach { SwiftDataContainer.shared.context.delete($0) }
        }

        let personaDescriptor = FetchDescriptor<Persona>(
            predicate: #Predicate { $0.userId == userId }
        )
        if let personas = try? SwiftDataContainer.shared.context.fetch(personaDescriptor) {
            personas.forEach { SwiftDataContainer.shared.context.delete($0) }
        }

        let journalDescriptor = FetchDescriptor<JournalEntry>(
            predicate: #Predicate { $0.userId == userId }
        )
        if let journals = try? SwiftDataContainer.shared.context.fetch(journalDescriptor) {
            journals.forEach { SwiftDataContainer.shared.context.delete($0) }
        }

        let messageDescriptor = FetchDescriptor<MessageWrapper>(
            predicate: #Predicate { $0.userId == userId }
        )
        if let messages = try? SwiftDataContainer.shared.context.fetch(messageDescriptor) {
            messages.forEach { SwiftDataContainer.shared.context.delete($0) }
        }

        let customizationDescriptor = FetchDescriptor<CharacterCustomization>(
            predicate: #Predicate { $0.userId == userId }
        )
        if let customizations = try? SwiftDataContainer.shared.context.fetch(customizationDescriptor) {
            customizations.forEach { SwiftDataContainer.shared.context.delete($0) }
        }

        try? SwiftDataContainer.shared.context.save()
    }
}
