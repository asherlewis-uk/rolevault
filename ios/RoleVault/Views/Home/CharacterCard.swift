import SwiftUI

struct CharacterCard: View {
    let character: Character
    let onTap: () -> Void

    @State private var isPressed = false

    var body: some View {
        Button(action: {
            HapticEngine.impact(.medium)
            onTap()
        }) {
            HStack(spacing: 16) {
                avatar

                VStack(alignment: .leading, spacing: 4) {
                    Text(character.name)
                        .font(.headline)
                        .foregroundStyle(.primary)

                    if !character.subtitle.isEmpty {
                        Text(character.subtitle)
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                            .lineLimit(1)
                    }

                    Text(character.backstory)
                        .font(.caption)
                        .foregroundStyle(.secondary.opacity(0.8))
                        .lineLimit(2)
                        .multilineTextAlignment(.leading)
                }

                Spacer()

                Image(systemName: "chevron.right")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.tertiary)
            }
            .padding()
            .background(
                RoundedRectangle(cornerRadius: 20, style: .continuous)
                    .fill(.ultraThinMaterial)
                    .overlay(
                        RoundedRectangle(cornerRadius: 20, style: .continuous)
                            .stroke(.white.opacity(0.15), lineWidth: 1)
                    )
            )
            .shadow(color: .black.opacity(0.12), radius: 16, x: 0, y: 8)
            .scaleEffect(isPressed ? 0.97 : 1)
        }
        .buttonStyle(.plain)
        .pressEvents {
            withAnimation(.easeInOut(duration: 0.1)) { isPressed = true }
        } onRelease: {
            withAnimation(.easeInOut(duration: 0.1)) { isPressed = false }
        }
    }

    private var avatar: some View {
        ZStack {
            Circle()
                .fill(.thinMaterial)
                .frame(width: 56, height: 56)

            if let data = character.avatarData, let uiImage = UIImage(data: data) {
                Image(uiImage: uiImage)
                    .resizable()
                    .scaledToFill()
                    .frame(width: 56, height: 56)
                    .clipShape(Circle())
            } else {
                Text(String(character.name.prefix(1)))
                    .font(.title2.weight(.semibold))
                    .foregroundStyle(.primary)
            }

            Circle()
                .stroke(.white.opacity(0.2), lineWidth: 1)
                .frame(width: 56, height: 56)
        }
    }
}

private struct PressEventsModifier: ViewModifier {
    var onPress: () -> Void
    var onRelease: () -> Void

    func body(content: Content) -> some View {
        content
            .simultaneousGesture(
                DragGesture(minimumDistance: 0)
                    .onChanged { _ in onPress() }
                    .onEnded { _ in onRelease() }
            )
    }
}

extension View {
    func pressEvents(onPress: @escaping () -> Void, onRelease: @escaping () -> Void) -> some View {
        modifier(PressEventsModifier(onPress: onPress, onRelease: onRelease))
    }
}
