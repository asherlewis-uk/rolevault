import SwiftUI
import ActivityKit

@available(iOS 16.2, *)
enum DynamicIslandActivity {
    static func start(character: Character) throws -> Activity<RoleVaultWidgetAttributes>? {
        guard ActivityAuthorizationInfo().areActivitiesEnabled else { return nil }

        let attributes = RoleVaultWidgetAttributes(
            characterName: character.name,
            characterId: character.id.uuidString
        )
        let state = RoleVaultWidgetAttributes.ContentState(isTyping: false)
        let content = ActivityContent(state: state, staleDate: nil)
        return try Activity.request(
            attributes: attributes,
            content: content,
            pushType: nil
        )
    }

    static func update(activity: Activity<RoleVaultWidgetAttributes>, isTyping: Bool) {
        let state = RoleVaultWidgetAttributes.ContentState(isTyping: isTyping)
        let content = ActivityContent(state: state, staleDate: nil)
        Task {
            await activity.update(content)
        }
    }

    static func end(activity: Activity<RoleVaultWidgetAttributes>) {
        Task {
            await activity.end(nil, dismissalPolicy: .immediate)
        }
    }
}
