import SwiftUI
import SwiftData
import AuthenticationServices

@main
struct RoleVaultApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate

    var body: some Scene {
        WindowGroup {
            ContentView()
                .modelContainer(SwiftDataContainer.shared.container)
        }
    }
}

class AppDelegate: NSObject, UIApplicationDelegate {
    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        AuthService.shared.checkAuth()
        Task {
            try? await ConfigService.shared.fetchConfig()
        }
        return true
    }
}

struct ContentView: View {
    @State private var appState = AppState()
    @AppStorage("hasSeenOnboarding") private var hasSeenOnboarding = false

    var body: some View {
        Group {
            if !appState.isAuthenticated {
                LoginView()
                    .transition(.asymmetric(insertion: .move(edge: .trailing), removal: .opacity))
            } else if !hasSeenOnboarding {
                OnboardingView()
                    .transition(.opacity)
            } else {
                MainTabView()
            }
        }
        .animation(.spring(response: 0.4, dampingFraction: 0.8), value: appState.isAuthenticated)
        .animation(.spring(response: 0.4, dampingFraction: 0.8), value: hasSeenOnboarding)
    }
}

struct MainTabView: View {
    @State private var selectedTab = 0

    var body: some View {
        TabView(selection: $selectedTab) {
            NavigationStack {
                HomeView()
            }
            .tabItem {
                Image(systemName: "house.fill")
                Text("Home")
            }
            .tag(0)

            NavigationStack {
                ChatsGalleryView()
            }
            .tabItem {
                Image(systemName: "message.fill")
                Text("Chats")
            }
            .tag(1)

            NavigationStack {
                CreateCharacterView()
            }
            .tabItem {
                Image(systemName: "plus.circle.fill")
                Text("Create")
            }
            .tag(2)

            NavigationStack {
                ActivityCenterView()
            }
            .tabItem {
                Image(systemName: "bell.fill")
                Text("Activity")
            }
            .tag(3)

            NavigationStack {
                ProfileView()
            }
            .tabItem {
                Image(systemName: "person.fill")
                Text("Profile")
            }
            .tag(4)
        }
        .tint(RoleVaultColor.primary)
    }
}

struct LoginView: View {
    @State private var errorMessage: String?
    @State private var showError = false
    @State private var appleSignInInProgress = false
    @State private var magicLinkEmail: String = ""
    @State private var showMagicLink = false
    @State private var magicLinkSent = false
    @State private var magicLinkToken: String?
    @State private var magicLinkLoading = false

    var body: some View {
        NavigationStack {
            ZStack {
                AuroraBackground()

                VStack(spacing: 24) {
                    Spacer()

                    Text("RoleVault")
                        .font(.system(size: 34, weight: .bold, design: .rounded))
                        .foregroundStyle(.primary)

                    Text("Connect to RoleVault")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)

                    LiquidGlassPanel(cornerRadius: 24) {
                        VStack(spacing: 16) {
                            // Sign in with Apple
                            SignInWithAppleButton(
                                .signIn,
                                onRequest: { request in
                                    request.requestedScopes = [.fullName, .email]
                                },
                                onCompletion: { result in
                                    Task { await handleAppleSignIn(result) }
                                }
                            )
                            .signInWithAppleButtonStyle(.black)
                            .frame(height: 50)
                            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))

                            Divider()
                                .padding(.vertical, 4)

                            // Magic Link Email Sign-In
                            if !showMagicLink {
                                Button {
                                    showMagicLink = true
                                } label: {
                                    Text("Sign in with Email")
                                        .font(.headline)
                                        .foregroundStyle(.primary)
                                        .frame(maxWidth: .infinity)
                                        .padding()
                                        .background(
                                            RoundedRectangle(cornerRadius: 16, style: .continuous)
                                                .stroke(.secondary.opacity(0.3), lineWidth: 1)
                                        )
                                }
                            } else {
                                VStack(spacing: 12) {
                                    TextField("Email", text: $magicLinkEmail)
                                        .textContentType(.emailAddress)
                                        .keyboardType(.emailAddress)
                                        .autocorrectionDisabled()
                                        .textInputAutocapitalization(.never)
                                        .padding()
                                        .background(.thinMaterial)
                                        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))

                                    if magicLinkSent {
                                        Text("Check your email for the magic link.")
                                            .font(.caption)
                                            .foregroundStyle(.secondary)
                                            .multilineTextAlignment(.center)

                                        TextField("Paste token", text: Binding(
                                            get: { magicLinkToken ?? "" },
                                            set: { magicLinkToken = $0.isEmpty ? nil : $0 }
                                        ))
                                        .font(.system(.caption, design: .monospaced))
                                        .padding()
                                        .background(.thinMaterial)
                                        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))

                                        Button {
                                            Task { await verifyMagicLink() }
                                        } label: {
                                            HStack {
                                                if magicLinkLoading {
                                                    ProgressView().tint(.white)
                                                } else {
                                                    Text("Verify & Sign In")
                                                        .font(.headline)
                                                }
                                            }
                                            .foregroundStyle(.white)
                                            .frame(maxWidth: .infinity)
                                            .padding()
                                            .background(
                                                RoundedRectangle(cornerRadius: 16, style: .continuous)
                                                    .fill(RoleVaultColor.primary)
                                            )
                                            .opacity(magicLinkToken == nil ? 0.5 : 1.0)
                                        }
                                        .disabled(magicLinkToken == nil || magicLinkLoading)
                                    } else {
                                        Button {
                                            Task { await requestMagicLink() }
                                        } label: {
                                            HStack {
                                                if magicLinkLoading {
                                                    ProgressView().tint(Color.accentColor)
                                                } else {
                                                    Text("Send Magic Link")
                                                        .font(.headline)
                                                }
                                            }
                                            .foregroundStyle(.tint)
                                            .frame(maxWidth: .infinity)
                                            .padding()
                                            .background(
                                                RoundedRectangle(cornerRadius: 16, style: .continuous)
                                                    .stroke(.tint, lineWidth: 1.5)
                                            )
                                            .opacity(magicLinkEmail.isEmpty ? 0.5 : 1.0)
                                        }
                                        .disabled(magicLinkEmail.isEmpty || magicLinkLoading)

                                        Button {
                                            showMagicLink = false
                                            magicLinkEmail = ""
                                        } label: {
                                            Text("Cancel")
                                                .font(.subheadline)
                                                .foregroundStyle(.secondary)
                                        }
                                    }
                                }
                            }
                        }
                    }
                    .padding(.horizontal, 16)

                    Spacer()
                }
            }
            .alert("Login Failed", isPresented: $showError) {
                Button("OK", role: .cancel) { }
            } message: {
                Text(errorMessage ?? "Unknown error")
            }
        }
    }

    private func handleAppleSignIn(_ result: Result<ASAuthorization, Error>) async {
        switch result {
        case .success(let authorization):
            guard let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
                  let identityToken = credential.identityToken,
                  let tokenString = String(data: identityToken, encoding: .utf8) else {
                errorMessage = "Failed to get Apple identity token"
                showError = true
                return
            }
            appleSignInInProgress = true
            defer { appleSignInInProgress = false }
            do {
                _ = try await AuthService.shared.signInWithApple(identityToken: tokenString)
                HapticEngine.notification(.success)
            } catch let apiError as APIError {
                errorMessage = apiError.localizedDescription
                showError = true
                HapticEngine.notification(.error)
            } catch {
                errorMessage = error.localizedDescription
                showError = true
                HapticEngine.notification(.error)
            }
        case .failure(let error):
            errorMessage = error.localizedDescription
            showError = true
            HapticEngine.notification(.error)
        }
    }

    private func requestMagicLink() async {
        guard isValidEmail(magicLinkEmail) else {
            errorMessage = "Please enter a valid email address"
            showError = true
            return
        }
        magicLinkLoading = true
        defer { magicLinkLoading = false }
        do {
            let response: MagicLinkResponse = try await AuthService.shared.requestMagicLink(email: magicLinkEmail)
            // Auto-fill token from dev response
            magicLinkToken = response.token
            magicLinkSent = true
            HapticEngine.notification(.success)
        } catch let apiError as APIError {
            errorMessage = apiError.localizedDescription
            showError = true
            HapticEngine.notification(.error)
        } catch {
            errorMessage = error.localizedDescription
            showError = true
            HapticEngine.notification(.error)
        }
    }

    private func verifyMagicLink() async {
        guard let token = magicLinkToken else { return }
        magicLinkLoading = true
        defer { magicLinkLoading = false }
        do {
            _ = try await AuthService.shared.verifyMagicLink(token: token)
            HapticEngine.notification(.success)
        } catch let apiError as APIError {
            errorMessage = apiError.localizedDescription
            showError = true
            HapticEngine.notification(.error)
        } catch {
            errorMessage = error.localizedDescription
            showError = true
            HapticEngine.notification(.error)
        }
    }

    private func isValidEmail(_ email: String) -> Bool {
        let regex = "^[A-Z0-9a-z._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$"
        return NSPredicate(format: "SELF MATCHES %@", regex).evaluate(with: email)
    }
}
