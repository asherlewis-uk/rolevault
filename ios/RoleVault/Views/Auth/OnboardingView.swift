import SwiftUI

struct OnboardingView: View {
    @AppStorage("hasSeenOnboarding") private var hasSeenOnboarding = false
    @State private var currentPage = 0

    var body: some View {
        ZStack {
            AuroraBackground()

            TabView(selection: $currentPage) {
                welcomePage.tag(0)
                howItWorksPage.tag(1)
                getStartedPage.tag(2)
            }
            .tabViewStyle(.page(indexDisplayMode: .always))
        }
    }

    // MARK: - Page 1: Welcome

    private var welcomePage: some View {
        VStack(spacing: 32) {
            Spacer()

            Image(systemName: "theatermasks.fill")
                .font(.system(size: 64))
                .foregroundStyle(RoleVaultColor.primary.gradient)

            VStack(spacing: 12) {
                Text("Welcome to RoleVault")
                    .font(RoleVaultTypography.largeTitle)
                    .multilineTextAlignment(.center)

                Text("Create AI characters with unique personalities. Chat through RoleVault's managed service. Your characters, your worlds, your stories.")
                    .font(RoleVaultTypography.body)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 32)
            }

            Spacer()

            Button {
                withAnimation { currentPage = 1 }
            } label: {
                Text("Continue")
                    .font(.headline)
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(
                        RoundedRectangle(cornerRadius: 16, style: .continuous)
                            .fill(RoleVaultColor.primary)
                    )
            }
            .padding(.horizontal, 32)
            .padding(.bottom, 48)
        }
    }

    // MARK: - Page 2: How It Works

    private var howItWorksPage: some View {
        VStack(spacing: 32) {
            Spacer()

            VStack(spacing: 28) {
                featureRow(
                    icon: "person.fill.badge.plus",
                    color: SpectralAccent.violet,
                    title: "Create",
                    description: "Design characters with backstories, personalities, and custom response styles."
                )

                featureRow(
                    icon: "bubble.left.and.bubble.right.fill",
                    color: SpectralAccent.emerald,
                    title: "Chat",
                    description: "Have immersive conversations with any character. Switch personas to change how you interact."
                )

                featureRow(
                    icon: "slider.horizontal.3",
                    color: SpectralAccent.amber,
                    title: "Customize",
                    description: "Edit characters, save favorite moments, and import/export via Tavern V2 cards."
                )
            }
            .padding(.horizontal, 32)

            Spacer()

            Button {
                withAnimation { currentPage = 2 }
            } label: {
                Text("Continue")
                    .font(.headline)
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(
                        RoundedRectangle(cornerRadius: 16, style: .continuous)
                            .fill(RoleVaultColor.primary)
                    )
            }
            .padding(.horizontal, 32)
            .padding(.bottom, 48)
        }
    }

    // MARK: - Page 3: Get Started

    private var getStartedPage: some View {
        VStack(spacing: 32) {
            Spacer()

            Image(systemName: "sparkles")
                .font(.system(size: 64))
                .foregroundStyle(RoleVaultColor.primary.gradient)

            VStack(spacing: 12) {
                Text("You're all set")
                    .font(RoleVaultTypography.largeTitle)

                Text("RoleVault is ready to connect through its managed service.")
                    .font(RoleVaultTypography.body)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 32)
            }

            VStack(spacing: 8) {
                Text("Start by creating your first character, or browse shared characters on the Home screen.")
                    .font(RoleVaultTypography.secondary)
                    .foregroundStyle(.tertiary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 32)
            }

            Spacer()

            Button {
                hasSeenOnboarding = true
            } label: {
                HStack(spacing: 8) {
                    Text("Get Started")
                        .font(.headline)
                    Image(systemName: "arrow.right")
                        .font(.headline)
                }
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .padding()
                .background(
                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                        .fill(RoleVaultColor.primary)
                )
            }
            .padding(.horizontal, 32)
            .padding(.bottom, 48)
        }
    }

    @ViewBuilder
    private func featureRow(icon: String, color: Color, title: String, description: String) -> some View {
        HStack(spacing: 16) {
            ZStack {
                Circle()
                    .fill(color.opacity(0.15))
                    .frame(width: 48, height: 48)
                Image(systemName: icon)
                    .font(.title3.weight(.semibold))
                    .foregroundStyle(color)
            }

            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.headline)
                Text(description)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .lineLimit(2)
            }
        }
    }
}
