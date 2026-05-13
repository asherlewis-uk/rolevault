import SwiftUI

struct LiquidGlassModifier: ViewModifier {
    var cornerRadius: CGFloat = 16
    var innerShadow: Bool = false
    var borderOpacity: Double = 0.2

    func body(content: Content) -> some View {
        content
            .padding()
            .background(.ultraThinMaterial)
            .clipShape(RoundedRectangle(cornerRadius: cornerRadius, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                    .stroke(.white.opacity(borderOpacity), lineWidth: 1)
            )
            .overlay(
                RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                    .stroke(.black.opacity(innerShadow ? 0.12 : 0), lineWidth: innerShadow ? 2 : 0)
                    .blur(radius: innerShadow ? 2 : 0)
                    .clipShape(RoundedRectangle(cornerRadius: cornerRadius, style: .continuous))
            )
            .shadow(color: .black.opacity(0.1), radius: 12, x: 0, y: 6)
    }
}

extension View {
    func liquidGlass(cornerRadius: CGFloat = 16, innerShadow: Bool = false, borderOpacity: Double = 0.2) -> some View {
        modifier(LiquidGlassModifier(cornerRadius: cornerRadius, innerShadow: innerShadow, borderOpacity: borderOpacity))
    }
}

struct LiquidGlassPanel<Content: View>: View {
    let content: Content
    let cornerRadius: CGFloat

    init(cornerRadius: CGFloat = 24, @ViewBuilder content: () -> Content) {
        self.cornerRadius = cornerRadius
        self.content = content()
    }

    var body: some View {
        content
            .liquidGlass(cornerRadius: cornerRadius)
    }
}
