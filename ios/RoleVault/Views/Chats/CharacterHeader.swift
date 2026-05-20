import SwiftUI

struct CharacterHeader: View {
    let character: Character
    let isTyping: Bool
    let scrollOffset: CGFloat
    let onEdit: () -> Void

    var body: some View {
        HStack(spacing: 14) {
            avatar
                .scaleEffect(avatarScale)

            VStack(alignment: .leading, spacing: 4) {
                Text(character.name)
                    .font(.headline)

                HStack(spacing: 6) {
                    if isTyping {
                        statusDot
                        Text(statusText)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    } else {
                        Text(character.category.rawValue)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
            }

            Spacer()

            Button(action: onEdit) {
                Image(systemName: "pencil")
                    .font(.body.weight(.semibold))
                    .foregroundStyle(.secondary)
                    .padding(8)
                    .background(.ultraThinMaterial)
                    .clipShape(Circle())
            }
        }
        .padding()
        .background(.ultraThinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 20, style: .continuous)
                .stroke(.white.opacity(0.15), lineWidth: 1)
        )
    }

    private var avatarScale: CGFloat {
        let progress = min(max(-scrollOffset / 120, 0), 1)
        return 1.2 - progress * 0.2
    }

    private var avatar: some View {
        ZStack {
            Circle()
                .fill(.thinMaterial)
                .frame(width: 60, height: 60)

            if let data = character.avatarData, let uiImage = UIImage(data: data) {
                Image(uiImage: uiImage)
                    .resizable()
                    .scaledToFill()
                    .frame(width: 60, height: 60)
                    .clipShape(Circle())
            } else {
                Text(String(character.name.prefix(1)))
                    .font(.title2.weight(.semibold))
            }

            Circle()
                .stroke(.white.opacity(0.2), lineWidth: 1)
                .frame(width: 60, height: 60)
        }
    }

    @ViewBuilder
    private var statusDot: some View {
        ZStack {
            Circle()
                .fill(statusColor)
                .frame(width: 8, height: 8)

            if isTyping {
                Circle()
                    .stroke(statusColor, lineWidth: 1.5)
                    .frame(width: 14, height: 14)
                    .opacity(0.5)
                    .scaleEffect(1.3)
                    .animation(.easeInOut(duration: 1.0).repeatForever(autoreverses: true), value: isTyping)
            }
        }
    }

    private var statusColor: Color {
        if isTyping { return .orange }
        return .clear
    }

    private var statusText: String {
        if isTyping { return "typing..." }
        return ""
    }
}
