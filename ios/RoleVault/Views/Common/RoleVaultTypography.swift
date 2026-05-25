import SwiftUI

// MARK: - RoleVault Typography Tokens
// Source of truth: web/tailwind.config.ts + web/src/index.css
// Sora for display, Inter for body. Falls back to system fonts when custom fonts are unavailable.

enum RoleVaultTypography {
    // MARK: Display (Sora or system rounded)
    static func display(size: CGFloat = 28, weight: Font.Weight = .bold) -> Font {
        Font.system(size: size, weight: weight, design: .rounded)
    }

    static let largeTitle = Font.system(size: 28, weight: .bold, design: .rounded)
    static let title = Font.system(size: 20, weight: .bold, design: .rounded)
    static let title2 = Font.system(size: 20, weight: .bold, design: .rounded)
    static let title3 = Font.system(size: 18, weight: .semibold, design: .rounded)

    // MARK: Body (Inter or system default)
    static let body = Font.system(size: 15, weight: .regular, design: .default)
    static let bodyMedium = Font.system(size: 15, weight: .medium, design: .default)
    static let bodySemibold = Font.system(size: 15, weight: .semibold, design: .default)

    // MARK: Secondary / Caption
    static let secondary = Font.system(size: 13, weight: .regular, design: .default)
    static let secondaryMedium = Font.system(size: 13, weight: .medium, design: .default)
    static let caption = Font.system(size: 12, weight: .regular, design: .default)
    static let captionMedium = Font.system(size: 12, weight: .medium, design: .default)
    static let micro = Font.system(size: 10, weight: .regular, design: .default)
    static let microMedium = Font.system(size: 10, weight: .medium, design: .default)

    // MARK: Section Label (uppercase, tracked)
    static let sectionLabel = Font.system(size: 12, weight: .heavy, design: .default)
    static let sectionLabelTracking: CGFloat = 1.6
}

// MARK: - View Modifiers

extension View {
    func roleVaultDisplay(size: CGFloat = 28, weight: Font.Weight = .bold) -> some View {
        self.font(RoleVaultTypography.display(size: size, weight: weight))
    }

    func roleVaultBody(weight: Font.Weight = .regular) -> some View {
        self.font(Font.system(size: 15, weight: weight, design: .default))
    }

    func roleVaultSectionLabel() -> some View {
        self
            .font(RoleVaultTypography.sectionLabel)
            .tracking(RoleVaultTypography.sectionLabelTracking)
            .textCase(.uppercase)
    }
}
