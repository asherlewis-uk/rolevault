import SwiftUI
import SwiftData

struct ActivityCenterView: View {
    @Environment(\.dismiss) private var dismiss

    @Query(sort: \Character.createdAt, order: .reverse) private var recentCharacters: [Character]
    @Query(sort: \GalleryMoment.createdAt, order: .reverse) private var recentMoments: [GalleryMoment]
    @Query(sort: \Conversation.lastMessageAt, order: .reverse) private var recentConversations: [Conversation]

    var events: [ActivityEvent] {
        var items: [ActivityEvent] = []

        for character in recentCharacters.prefix(5) {
            items.append(ActivityEvent(
                title: "New Character",
                subtitle: "\(character.name) was added to \(character.category.rawValue).",
                timeAgo: character.createdAt.timeAgo(),
                icon: "sparkles",
                color: .purple
            ))
        }

        for convo in recentConversations.prefix(5) {
            items.append(ActivityEvent(
                title: "Chat Updated",
                subtitle: convo.lastMessagePreview.isEmpty ? "New conversation started." : "\(convo.title): \(convo.lastMessagePreview)",
                timeAgo: convo.lastMessageAt.timeAgo(),
                icon: "message.fill",
                color: .blue
            ))
        }

        for moment in recentMoments.prefix(5) {
            items.append(ActivityEvent(
                title: "Gallery Moment",
                subtitle: moment.caption,
                timeAgo: moment.createdAt.timeAgo(),
                icon: "photo.fill",
                color: .pink
            ))
        }

        return items.sorted { $0.timeAgoSortPriority < $1.timeAgoSortPriority }
    }

    var body: some View {
        NavigationStack {
            ZStack {
                AuroraBackground()

                List {
                    ForEach(events) { event in
                        ActivityRow(event: event)
                            .listRowBackground(Color.clear)
                            .listRowSeparator(.hidden)
                    }
                }
                .listStyle(.plain)
                .scrollContentBackground(.hidden)
            }
            .navigationTitle("Activity")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }
}

struct ActivityEvent: Identifiable {
    let id = UUID()
    let title: String
    let subtitle: String
    let timeAgo: String
    let icon: String
    let color: Color

    var timeAgoSortPriority: Int {
        // Simple heuristic: shorter timeAgo strings are more recent
        switch timeAgo {
        case let s where s.contains("just"): return 0
        case let s where s.contains("min"): return 1
        case let s where s.contains("hour"): return 2
        case let s where s.contains("day"): return 3
        default: return 4
        }
    }
}

struct ActivityRow: View {
    let event: ActivityEvent

    var body: some View {
        HStack(spacing: 14) {
            ZStack {
                Circle()
                    .fill(event.color.opacity(0.2))
                    .frame(width: 40, height: 40)
                Image(systemName: event.icon)
                    .font(.callout.weight(.semibold))
                    .foregroundStyle(event.color)
            }

            VStack(alignment: .leading, spacing: 2) {
                Text(event.title)
                    .font(.subheadline.weight(.semibold))
                Text(event.subtitle)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(2)
            }

            Spacer()

            Text(event.timeAgo)
                .font(.caption2)
                .foregroundStyle(.tertiary)
        }
        .padding()
        .background(.ultraThinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        .shadow(color: .black.opacity(0.04), radius: 6, x: 0, y: 2)
    }
}

extension Date {
    func timeAgo() -> String {
        let interval = Date().timeIntervalSince(self)
        if interval < 60 { return "Just now" }
        if interval < 3600 { return "\(Int(interval / 60))m ago" }
        if interval < 86400 { return "\(Int(interval / 3600))h ago" }
        return "\(Int(interval / 86400))d ago"
    }
}
