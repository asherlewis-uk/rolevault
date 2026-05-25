import SwiftUI

struct AuroraBackground: View {
    @State private var phase: Double = 0

    private var hour: Int {
        Calendar.current.component(.hour, from: Date())
    }

    private var palette: [Color] {
        // Web background model: warm charcoal base (#0E0B09 to #15110D)
        // with amber/crimson bloom at 4-8% opacity. No cool navy or saturated aurora.
        let base = RoleVaultColor.stageBase
        let elevated = RoleVaultColor.stageElevated
        let bloomAmber = RoleVaultColor.bloomAmber
        let bloomCrimson = RoleVaultColor.bloomCrimson

        switch hour {
        case 6..<12:
            // Morning: warm charcoal with soft amber bloom
            return [
                base,
                elevated,
                bloomAmber,
                base,
                elevated,
                bloomAmber.opacity(0.5)
            ]
        case 12..<18:
            // Day: neutral warm charcoal, subdued bloom
            return [
                base,
                elevated,
                base,
                elevated,
                base,
                elevated
            ]
        case 18..<22:
            // Evening: warm charcoal with crimson bloom
            return [
                base,
                elevated,
                bloomCrimson,
                base,
                elevated,
                bloomCrimson.opacity(0.5)
            ]
        default:
            // Night: deep warm charcoal, minimal bloom
            return [
                base,
                elevated,
                base,
                base,
                elevated,
                base
            ]
        }
    }

    private var meshPoints: [SIMD2<Float>] {
        [
            .init(x: 0, y: 0),
            .init(x: 0.5, y: 0),
            .init(x: 1, y: 0),
            .init(x: 0, y: Float(0.5 + 0.12 * sin(phase))),
            .init(x: Float(0.5 + 0.12 * cos(phase * 0.7)), y: Float(0.5 + 0.12 * sin(phase * 0.6))),
            .init(x: 1, y: Float(0.5 + 0.12 * cos(phase))),
            .init(x: 0, y: 1),
            .init(x: 0.5, y: 1),
            .init(x: 1, y: 1)
        ]
    }

    var body: some View {
        TimelineView(.animation(minimumInterval: 1 / 10, paused: false)) { _ in
            MeshGradient(
                width: 3,
                height: 3,
                points: meshPoints,
                colors: palette
            )
        }
        .onAppear {
            withAnimation(.linear(duration: 6).repeatForever(autoreverses: true)) {
                phase = .pi * 2
            }
        }
        .ignoresSafeArea()
    }
}
