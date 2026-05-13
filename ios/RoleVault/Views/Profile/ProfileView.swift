import SwiftUI

struct ProfileView: View {
    @State private var viewModel = ProfileViewModel()

    var body: some View {
        ZStack {
            AuroraBackground()

            ScrollView {
                VStack(spacing: 24) {
                    profileHeader

                    LiquidGlassPanel(cornerRadius: 20) {
                        VStack(spacing: 4) {
                            NavigationLink {
                                PersonaManagerView()
                            } label: {
                                row(icon: "person.2.fill", title: "Personas", color: .blue)
                            }

                            NavigationLink {
                                SettingsView()
                            } label: {
                                row(icon: "gear", title: "Settings", color: .gray)
                            }

                            NavigationLink {
                                BackendConfigView()
                            } label: {
                                row(icon: "server.rack", title: "Backend", color: .orange)
                            }
                        }
                    }
                    .padding(.horizontal)

                    Button {
                        Task { await viewModel.logout() }
                    } label: {
                        HStack {
                            Image(systemName: "arrow.backward.square.fill")
                            Text("Log Out")
                                .font(.headline)
                        }
                        .foregroundStyle(.red)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(.ultraThinMaterial)
                        .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
                        .overlay(
                            RoundedRectangle(cornerRadius: 20, style: .continuous)
                                .stroke(.red.opacity(0.2), lineWidth: 1)
                        )
                    }
                    .padding(.horizontal)
                    .padding(.bottom, 32)
                }
                .padding(.top)
            }
            .scrollIndicators(.hidden)
        }
        .navigationTitle("Profile")
    }

    private var profileHeader: some View {
        VStack(spacing: 12) {
            ZStack {
                Circle()
                    .fill(.thinMaterial)
                    .frame(width: 90, height: 90)
                Text("RV")
                    .font(.largeTitle.weight(.bold))
                    .foregroundStyle(.primary)
                Circle()
                    .stroke(.white.opacity(0.2), lineWidth: 2)
                    .frame(width: 90, height: 90)
            }

            Text("RoleVault")
                .font(.title2.weight(.bold))

            Text("Prompt Engineer")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .padding(.top, 20)
    }

    private func row(icon: String, title: String, color: Color) -> some View {
        HStack(spacing: 14) {
            Image(systemName: icon)
                .font(.body.weight(.semibold))
                .foregroundStyle(color)
                .frame(width: 28, height: 28)

            Text(title)
                .font(.body.weight(.medium))

            Spacer()

            Image(systemName: "chevron.right")
                .font(.caption.weight(.semibold))
                .foregroundStyle(.tertiary)
        }
        .padding(.vertical, 12)
        .foregroundStyle(.primary)
    }
}
