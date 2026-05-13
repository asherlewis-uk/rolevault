import SwiftUI
import WidgetKit
import ActivityKit

struct RoleVaultLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: RoleVaultWidgetAttributes.self) { context in
            HStack(spacing: 12) {
                ZStack {
                    Circle()
                        .fill(.thinMaterial)
                        .frame(width: 44, height: 44)
                    Text(String(context.attributes.characterName.prefix(1)))
                        .font(.title3.weight(.bold))
                }

                VStack(alignment: .leading, spacing: 2) {
                    Text(context.attributes.characterName)
                        .font(.headline)
                    Text(context.state.isTyping ? "typing..." : "online")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                Spacer()

                if context.state.isTyping {
                    HStack(spacing: 3) {
                        ForEach(0..<3) { i in
                            Circle()
                                .fill(.primary.opacity(0.5))
                                .frame(width: 5, height: 5)
                                .phaseAnimator([0, 1], trigger: i) { content, phase in
                                    content.offset(y: phase == 1 ? -4 : 4)
                                } animation: { _ in
                                    .easeInOut(duration: 0.3).repeatForever(autoreverses: true).delay(Double(i) * 0.1)
                                }
                        }
                    }
                }
            }
            .padding()
            .activityBackgroundTint(Color.black.opacity(0.6))
            .activitySystemActionForegroundColor(.white)

        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    ZStack {
                        Circle()
                            .fill(.thinMaterial)
                            .frame(width: 44, height: 44)
                        Text(String(context.attributes.characterName.prefix(1)))
                            .font(.title3.weight(.bold))
                    }
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text(context.attributes.characterName)
                        .font(.headline)
                }
                DynamicIslandExpandedRegion(.center) {
                    Text(context.state.isTyping ? "typing..." : "online")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    if context.state.isTyping {
                        HStack(spacing: 3) {
                            ForEach(0..<3) { i in
                                Circle()
                                    .fill(.primary.opacity(0.5))
                                    .frame(width: 5, height: 5)
                                    .phaseAnimator([0, 1], trigger: i) { content, phase in
                                        content.offset(y: phase == 1 ? -4 : 4)
                                    } animation: { _ in
                                        .easeInOut(duration: 0.3).repeatForever(autoreverses: true).delay(Double(i) * 0.1)
                                    }
                            }
                        }
                    }
                }
            } compactLeading: {
                ZStack {
                    Circle()
                        .fill(.thinMaterial)
                        .frame(width: 20, height: 20)
                    Text(String(context.attributes.characterName.prefix(1)))
                        .font(.caption2.weight(.bold))
                }
            } compactTrailing: {
                Text(context.state.isTyping ? "..." : "")
                    .font(.caption)
            } minimal: {
                ZStack {
                    Circle()
                        .fill(.thinMaterial)
                        .frame(width: 20, height: 20)
                    Text(String(context.attributes.characterName.prefix(1)))
                        .font(.caption2.weight(.bold))
                }
            }
        }
    }
}

@main
struct RoleVaultWidgetsBundle: WidgetBundle {
    var body: some Widget {
        RoleVaultLiveActivity()
    }
}
