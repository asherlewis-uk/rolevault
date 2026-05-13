import Foundation
import SwiftData

final class SwiftDataContainer {
    static let shared = SwiftDataContainer()

    let container: ModelContainer

    private init() {
        let schema = Schema([
            Character.self,
            Persona.self,
            GalleryMoment.self,
            JournalEntry.self,
            Conversation.self,
            MessageWrapper.self,
            UserAccount.self,
            CharacterCustomization.self
        ])
        let config = ModelConfiguration(
            schema: schema,
            isStoredInMemoryOnly: false,
            cloudKitDatabase: .none
        )
        do {
            container = try ModelContainer(for: schema, configurations: [config])
        } catch {
            fatalError("Failed to initialize SwiftData container: \(error)")
        }
    }

    @MainActor
    var context: ModelContext {
        container.mainContext
    }
}
