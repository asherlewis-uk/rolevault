import SwiftUI

struct TypingIndicator: View {
    @State private var phase: Double = 0

    var body: some View {
        HStack(alignment: .bottom, spacing: 8) {
            Spacer(minLength: 32)

            HStack(spacing: 4) {
                ForEach(0..<3) { i in
                    Circle()
                        .fill(.primary.opacity(0.5))
                        .frame(width: 6, height: 6)
                        .offset(y: sin(phase + Double(i) * 0.8) * 4)
                }
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 10)
            .background(.ultraThinMaterial)
            .clipShape(Capsule())
            .overlay(
                Capsule()
                    .stroke(.white.opacity(0.2), lineWidth: 1)
            )

            Spacer()
        }
        .onAppear {
            withAnimation(.easeInOut(duration: 0.4).repeatForever(autoreverses: true)) {
                phase = .pi * 2
            }
        }
    }
}
