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
                .foregroundStyle(.indigo.gradient)

            VStack(spacing: 12) {
                Text("Welcome to RoleVault")
                    .font(.largeTitle.weight(.bold))
                    .multilineTextAlignment(.center)

                Text("Create AI characters with unique personalities. Chat using your own language models. Your characters, your data, your rules.")
                    .font(.body)
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
                            .fill(.indigo)
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
                    color: .purple,
                    title: "Create",
                    description: "Design characters with backstories, personalities, and custom response styles."
                )

                featureRow(
                    icon: "bubble.left.and.bubble.right.fill",
                    color: .blue,
                    title: "Chat",
                    description: "Have immersive conversations with any character. Switch personas to change how you interact."
                )

                featureRow(
                    icon: "slider.horizontal.3",
                    color: .orange,
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
                            .fill(.indigo)
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
                .foregroundStyle(.indigo.gradient)

            VStack(spacing: 12) {
                Text("You're all set")
                    .font(.largeTitle.weight(.bold))

                Text("RoleVault connects to your inference server. Configure it in Settings, or start with the default server.")
                    .font(.body)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 32)
            }

            VStack(spacing: 8) {
                Text("Start by creating your first character, or browse shared characters on the Home screen.")
                    .font(.subheadline)
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
                        .fill(.indigo)
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
