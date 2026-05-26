import SwiftUI
import SwiftData

@Observable
final class ProfileViewModel {
    var errorMessage: String?
    var showError = false
    var connectionTestResult: Bool?
    var isTestingConnection = false

    // MARK: - Auth

    func logout() async {
        try? await AuthService.shared.logout()
    }

    // MARK: - Personas

    @MainActor
    func createPersona(name: String, gender: String, backstory: String, avatarData: Data?) -> Persona? {
        guard let userId = AuthService.shared.currentUser?.id else {
            errorMessage = "You must be signed in to create a persona."
            showError = true
            return nil
        }
        let persona = Persona(
            name: name,
            gender: gender,
            backstory: backstory,
            avatarData: avatarData,
            isActive: false,
            userId: userId
        )
        SwiftDataContainer.shared.context.insert(persona)
        do {
            try SwiftDataContainer.shared.context.save()
            return persona
        } catch {
            errorMessage = error.localizedDescription
            showError = true
            return nil
        }
    }

    @MainActor
    func deletePersona(_ persona: Persona) {
        SwiftDataContainer.shared.context.delete(persona)
        do {
            try SwiftDataContainer.shared.context.save()
        } catch {
            errorMessage = error.localizedDescription
            showError = true
        }
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
        do {
            try SwiftDataContainer.shared.context.save()
        } catch {
            errorMessage = error.localizedDescription
            showError = true
        }
    }

    // MARK: - Backend Configuration

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
    func clearConversationCache() throws {
        guard let userId = AuthService.shared.currentUser?.id else { return }
        let descriptor = FetchDescriptor<Conversation>(
            predicate: #Predicate { $0.userId == userId }
        )
        if let items = try? SwiftDataContainer.shared.context.fetch(descriptor) {
            for item in items {
                SwiftDataContainer.shared.context.delete(item)
            }
        }
        try SwiftDataContainer.shared.context.save()
    }

    @MainActor
    func clearGalleryCache() throws {
        guard let userId = AuthService.shared.currentUser?.id else { return }
        let descriptor = FetchDescriptor<GalleryMoment>(
            predicate: #Predicate { $0.userId == userId }
        )
        if let items = try? SwiftDataContainer.shared.context.fetch(descriptor) {
            for item in items {
                SwiftDataContainer.shared.context.delete(item)
            }
        }
        try SwiftDataContainer.shared.context.save()
    }

    @MainActor
    func clearAllLocalData() {
        guard let userId = AuthService.shared.currentUser?.id else { return }
        let context = SwiftDataContainer.shared.context

        do {
            // Conversations
            let convoDesc = FetchDescriptor<Conversation>(
                predicate: #Predicate { $0.userId == userId }
            )
            if let items = try? context.fetch(convoDesc) {
                items.forEach(context.delete)
            }

            // Gallery moments
            let momentDesc = FetchDescriptor<GalleryMoment>(
                predicate: #Predicate { $0.userId == userId }
            )
            if let items = try? context.fetch(momentDesc) {
                items.forEach(context.delete)
            }

            // Owned characters
            let charDesc = FetchDescriptor<Character>(
                predicate: #Predicate { $0.ownerUserId == userId }
            )
            if let chars = try? context.fetch(charDesc) {
                chars.forEach(context.delete)
            }

            // Personas
            let personaDesc = FetchDescriptor<Persona>(
                predicate: #Predicate { $0.userId == userId }
            )
            if let personas = try? context.fetch(personaDesc) {
                personas.forEach(context.delete)
            }

            // Journal entries
            let journalDesc = FetchDescriptor<JournalEntry>(
                predicate: #Predicate { $0.userId == userId }
            )
            if let journals = try? context.fetch(journalDesc) {
                journals.forEach(context.delete)
            }

            // Messages
            let messageDesc = FetchDescriptor<MessageWrapper>(
                predicate: #Predicate { $0.userId == userId }
            )
            if let messages = try? context.fetch(messageDesc) {
                messages.forEach(context.delete)
            }

            // Customizations
            let customizationDesc = FetchDescriptor<CharacterCustomization>(
                predicate: #Predicate { $0.userId == userId }
            )
            if let customizations = try? context.fetch(customizationDesc) {
                customizations.forEach(context.delete)
            }

            try context.save()
        } catch {
            errorMessage = error.localizedDescription
            showError = true
        }
    }
}
