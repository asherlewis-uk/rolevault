import SwiftUI

struct CategoryPill: View {
    let title: String
    let isSelected: Bool
    let color: Color
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.subheadline.weight(isSelected ? .semibold : .medium))
                .foregroundStyle(isSelected ? .white : .primary)
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                .background(
                    Capsule()
                        .fill(isSelected ? AnyShapeStyle(color) : AnyShapeStyle(.ultraThinMaterial))
                )
                .overlay(
                    Capsule()
                        .stroke(isSelected ? .white.opacity(0.4) : .white.opacity(0.2), lineWidth: 1)
                )
                .overlay(
                    Capsule()
                        .stroke(color.opacity(isSelected ? 0.6 : 0), lineWidth: 2)
                        .shadow(color: color.opacity(isSelected ? 0.5 : 0), radius: 8, x: 0, y: 0)
                )
                .scaleEffect(isSelected ? 1.1 : 1)
        }
        .buttonStyle(.plain)
        .animation(.spring(response: 0.3, dampingFraction: 0.7), value: isSelected)
    }
}
