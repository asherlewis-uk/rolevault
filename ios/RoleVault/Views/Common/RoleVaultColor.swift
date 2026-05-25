import SwiftUI

// MARK: - RoleVault Color Tokens
// Source of truth: web/src/index.css + web/tailwind.config.ts
// Warm theatrical palette — characters first, platform second.

enum RoleVaultColor {
    // MARK: Surfaces
    static let background = Color(hex: 0x0B0A09)
    static let backgroundMid = Color(hex: 0x131210)
    static let foreground = Color(hex: 0xEDEDEB)
    static let card = Color(hex: 0x181715)
    static let cardForeground = Color(hex: 0xEDEDEB)
    static let muted = Color(hex: 0x262422)
    static let mutedForeground = Color(hex: 0x8E8A84)
    static let accent = Color(hex: 0x2C2926)
    static let border = Color(hex: 0x2C2926)
    static let input = Color(hex: 0x2C2926)

    // MARK: Brand
    static let primary = Color(hex: 0xF5AE2A)           // theatrical amber gold
    static let primaryForeground = Color(hex: 0x171412)
    static let primaryGlow = Color(hex: 0xF9CE6E)
    static let secondary = Color(hex: 0xBC3737)         // deep crimson
    static let secondaryForeground = Color(hex: 0xF8F7F6)
    static let destructive = Color(hex: 0xC44141)

    // MARK: Gradient Stops
    static let gradientPrimaryStart = Color(hex: 0xF5AE2A)
    static let gradientPrimaryEnd = Color(hex: 0xC47A1A)
    static let gradientSecondaryStart = Color(hex: 0xBC3737)
    static let gradientSecondaryEnd = Color(hex: 0x8F2A2A)
    static let gradientAccentStart = Color(hex: 0xF9C03A)
    static let gradientAccentEnd = Color(hex: 0xBC3737)

    // MARK: Chat Bubbles (web spectral glass)
    static let bubbleUserBg = Color(hex: 0xF5AE2A).opacity(0.11)
    static let bubbleUserBorder = Color(hex: 0xF5AE2A).opacity(0.25)
    static let bubbleAIBg = Color(hex: 0x181715).opacity(0.82)
    static let bubbleAIBorder = Color(hex: 0xBC3737).opacity(0.13)

    // MARK: Depth
    static let shadowCard = Color(hex: 0x020202).opacity(0.65)
    static let shadowElevated = Color(hex: 0x020202).opacity(0.75)
    static let glowPrimary = Color(hex: 0xF5AE2A).opacity(0.22)
    static let glowSecondary = Color(hex: 0xBC3737).opacity(0.22)

    // MARK: Background Model
    static let stageBase = Color(hex: 0x0E0B09)
    static let stageElevated = Color(hex: 0x15110D)
    static let bloomAmber = Color(hex: 0xF5AE2A).opacity(0.06)
    static let bloomCrimson = Color(hex: 0xBC3737).opacity(0.04)
    static let vignette = Color(hex: 0x020202).opacity(0.18)
}

// MARK: - Hex Color Helper

extension Color {
    init(hex: UInt, alpha: Double = 1.0) {
        let r = Double((hex >> 16) & 0xFF) / 255.0
        let g = Double((hex >> 8) & 0xFF) / 255.0
        let b = Double(hex & 0xFF) / 255.0
        self.init(red: r, green: g, blue: b, opacity: alpha)
    }
}
