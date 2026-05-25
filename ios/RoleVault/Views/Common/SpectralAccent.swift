import SwiftUI

// MARK: - Spectral Category Accents
// Source of truth: web/src/index.css --spectral-* tokens
// Maps CharacterCategory to warm theatrical spectral colors.

enum SpectralAccent {
    static let gold = Color(hex: 0xF5AE2A)
    static let crimson = Color(hex: 0xBC3737)
    static let emerald = Color(hex: 0x3D9E7A)
    static let rose = Color(hex: 0xC44A7A)
    static let amber = Color(hex: 0xE89A2A)
    static let violet = Color(hex: 0x9A5ED4)

    /// Default accent when no specific mapping exists.
    static let `default` = gold.opacity(0.7)

    /// Returns the spectral color for a given character category.
    static func color(for category: CharacterCategory) -> Color {
        switch category {
        case .fantasy:
            return violet
        case .vampires:
            return crimson
        case .werewolves:
            return amber
        case .romance:
            return rose
        case .gaming:
            return emerald
        case .rpg:
            return violet
        case .powerful:
            return gold
        case .mafia:
            return crimson
        case .assistant:
            return emerald
        case .learning:
            return amber
        case .creating:
            return violet
        case .family:
            return rose
        case .lifestyle:
            return gold
        case .human:
            return amber
        case .humor:
            return emerald
        case .history:
            return amber
        case .school:
            return rose
        case .scenes:
            return violet
        case .groups:
            return rose
        case .anime:
            return emerald
        }
    }

    /// Returns a rim-light gradient for a category (top-edge spectral glow).
    static func rimLight(for category: CharacterCategory) -> LinearGradient {
        let c = color(for: category)
        return LinearGradient(
            gradient: Gradient(stops: [
                .init(color: c.opacity(0.60), location: 0.0),
                .init(color: c.opacity(0.0), location: 0.4)
            ]),
            startPoint: .top,
            endPoint: .bottom
        )
    }
}

// MARK: - CharacterCategory Spectral Helper

extension CharacterCategory {
    var spectralColor: Color {
        SpectralAccent.color(for: self)
    }

    var rimLight: LinearGradient {
        SpectralAccent.rimLight(for: self)
    }
}
