import SwiftUI

// MARK: - Confetti Burst

struct ConfettiBurst: View {
    let origin: CGPoint
    @State private var startTime = Date()

    private let particles: [ConfettiParticle] = (0..<30).map { _ in
        ConfettiParticle(
            angle: Double.random(in: 0...(2 * .pi)),
            speed: Double.random(in: 80...250),
            color: [.red, .blue, .green, .yellow, .purple, .orange, .pink, .cyan].randomElement()!,
            size: Double.random(in: 4...10)
        )
    }

    var body: some View {
        TimelineView(.animation(minimumInterval: 1 / 60, paused: false)) { timeline in
            let elapsed = timeline.date.timeIntervalSince(startTime)
            Canvas { context, size in
                guard elapsed < 1.0 else { return }
                let t = elapsed
                for particle in particles {
                    let x = origin.x + cos(particle.angle) * particle.speed * t
                    let y = origin.y + sin(particle.angle) * particle.speed * t + 300 * t * t
                    let rect = CGRect(
                        x: x - particle.size / 2,
                        y: y - particle.size / 2,
                        width: particle.size,
                        height: particle.size
                    )
                    context.fill(
                        Path(rect),
                        with: .color(particle.color.opacity(1 - t))
                    )
                }
            }
        }
    }
}

struct ConfettiParticle {
    let angle: Double
    let speed: Double
    let color: Color
    let size: Double
}

// MARK: - Sparkle Trail

struct SparkleTrail: View {
    var body: some View {
        TimelineView(.animation(minimumInterval: 1 / 60, paused: false)) { timeline in
            let time = timeline.date.timeIntervalSinceReferenceDate
            Canvas { context, size in
                for i in 0..<15 {
                    let offset = Double(i) * 0.2
                    let t = fmod(time + offset, 1.0)
                    let x = size.width * 0.08 + Double(i) * size.width * 0.06 + sin(time * 2 + Double(i)) * 20
                    let y = size.height * 0.2 + t * size.height * 0.6
                    let alpha = 1.0 - t
                    let star = Path { path in
                        let r: CGFloat = 3
                        path.move(to: CGPoint(x: x, y: y - r))
                        path.addLine(to: CGPoint(x: x + r * 0.3, y: y - r * 0.3))
                        path.addLine(to: CGPoint(x: x + r, y: y))
                        path.addLine(to: CGPoint(x: x + r * 0.3, y: y + r * 0.3))
                        path.addLine(to: CGPoint(x: x, y: y + r))
                        path.addLine(to: CGPoint(x: x - r * 0.3, y: y + r * 0.3))
                        path.addLine(to: CGPoint(x: x - r, y: y))
                        path.addLine(to: CGPoint(x: x - r * 0.3, y: y - r * 0.3))
                        path.closeSubpath()
                    }
                    context.fill(star, with: .color(.white.opacity(alpha)))
                }
            }
        }
    }
}

// MARK: - Aurora Ripple

struct AuroraRipple: View {
    let origin: CGPoint
    @State private var startTime = Date()

    var body: some View {
        TimelineView(.animation(minimumInterval: 1 / 60, paused: false)) { timeline in
            let elapsed = timeline.date.timeIntervalSince(startTime)
            Canvas { context, size in
                guard elapsed < 2.0 else { return }
                let t = elapsed / 2.0
                let radius = 20 + 200 * t
                let circle = Path { path in
                    path.addEllipse(in: CGRect(
                        x: origin.x - radius,
                        y: origin.y - radius,
                        width: radius * 2,
                        height: radius * 2
                    ))
                }
                let gradient = Gradient(colors: [
                    .cyan.opacity(1 - t),
                    .purple.opacity((1 - t) * 0.8),
                    .clear
                ])
                context.stroke(
                    circle,
                    with: .linearGradient(
                        gradient,
                        startPoint: CGPoint(x: origin.x - radius, y: origin.y),
                        endPoint: CGPoint(x: origin.x + radius, y: origin.y)
                    ),
                    lineWidth: 3 * (1 - t)
                )
            }
        }
    }
}
