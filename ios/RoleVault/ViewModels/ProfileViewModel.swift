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
        let persona = Persona(name: name, gender: gender, backstory: backstory, avatarData: avatarData)
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
        let descriptor = FetchDescriptor<Persona>()
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
        let descriptor = FetchDescriptor<Conversation>()
        if let items = try? SwiftDataContainer.shared.context.fetch(descriptor) {
            for item in items {
                SwiftDataContainer.shared.context.delete(item)
            }
        }
        try? SwiftDataContainer.shared.context.save()
    }

    @MainActor
    func clearGalleryCache() {
        let descriptor = FetchDescriptor<GalleryMoment>()
        if let items = try? SwiftDataContainer.shared.context.fetch(descriptor) {
            for item in items {
                SwiftDataContainer.shared.context.delete(item)
            }
        }
        try? SwiftDataContainer.shared.context.save()
    }

    @MainActor
    func clearAllLocalData() {
        clearConversationCache()
        clearGalleryCache()

        if let chars = try? SwiftDataContainer.shared.context.fetch(FetchDescriptor<Character>()) {
            chars.forEach { SwiftDataContainer.shared.context.delete($0) }
        }
        if let personas = try? SwiftDataContainer.shared.context.fetch(FetchDescriptor<Persona>()) {
            personas.forEach { SwiftDataContainer.shared.context.delete($0) }
        }
        if let journals = try? SwiftDataContainer.shared.context.fetch(FetchDescriptor<JournalEntry>()) {
            journals.forEach { SwiftDataContainer.shared.context.delete($0) }
        }
        if let messages = try? SwiftDataContainer.shared.context.fetch(FetchDescriptor<MessageWrapper>()) {
            messages.forEach { SwiftDataContainer.shared.context.delete($0) }
        }

        try? SwiftDataContainer.shared.context.save()
    }
}
