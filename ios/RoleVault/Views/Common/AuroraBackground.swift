import SwiftUI

struct AuroraBackground: View {
    @State private var phase: Double = 0

    private var hour: Int {
        Calendar.current.component(.hour, from: Date())
    }

    private var palette: [Color] {
        switch hour {
        case 6..<12:
            // Warm sunrise
            return [
                Color(red: 1.0, green: 0.45, blue: 0.25),
                Color(red: 1.0, green: 0.7, blue: 0.4),
                Color(red: 0.95, green: 0.5, blue: 0.6),
                Color(red: 0.85, green: 0.35, blue: 0.45),
                Color(red: 0.7, green: 0.4, blue: 0.6),
                Color(red: 1.0, green: 0.55, blue: 0.3)
            ]
        case 12..<18:
            // Cool daylight
            return [
                Color(red: 0.25, green: 0.6, blue: 0.95),
                Color(red: 0.4, green: 0.8, blue: 0.9),
                Color(red: 0.6, green: 0.9, blue: 0.85),
                Color(red: 0.3, green: 0.7, blue: 0.95),
                Color(red: 0.5, green: 0.85, blue: 1.0),
                Color(red: 0.35, green: 0.65, blue: 0.9)
            ]
        case 18..<22:
            // Twilight
            return [
                Color(red: 0.4, green: 0.2, blue: 0.6),
                Color(red: 0.6, green: 0.3, blue: 0.7),
                Color(red: 0.8, green: 0.4, blue: 0.6),
                Color(red: 0.3, green: 0.25, blue: 0.65),
                Color(red: 0.5, green: 0.35, blue: 0.75),
                Color(red: 0.45, green: 0.3, blue: 0.6)
            ]
        default:
            // Midnight
            return [
                Color(red: 0.05, green: 0.05, blue: 0.15),
                Color(red: 0.1, green: 0.08, blue: 0.25),
                Color(red: 0.15, green: 0.1, blue: 0.35),
                Color(red: 0.08, green: 0.06, blue: 0.2),
                Color(red: 0.12, green: 0.09, blue: 0.3),
                Color(red: 0.06, green: 0.05, blue: 0.18)
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
