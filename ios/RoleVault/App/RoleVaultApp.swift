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
        return true
    }
}

struct ContentView: View {
    @State private var appState = AppState()

    var body: some View {
        Group {
            if appState.isAuthenticated {
                MainTabView()
            } else {
                LoginView()
                    .transition(.asymmetric(insertion: .move(edge: .trailing), removal: .opacity))
            }
        }
        .animation(.spring(response: 0.4, dampingFraction: 0.8), value: appState.isAuthenticated)
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
        .tint(.indigo)
    }
}

struct LoginView: View {
    @State private var email: String = ""
    @State private var password: String = ""
    @State private var isPasswordVisible: Bool = false
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var showError = false
    @State private var showBackendConfig = false
    @State private var appleSignInInProgress = false

    var body: some View {
        NavigationStack {
            ZStack {
                AuroraBackground()

                VStack(spacing: 24) {
                    Spacer()

                    Text("RoleVault")
                        .font(.system(size: 48, weight: .bold, design: .rounded))
                        .foregroundStyle(.primary)

                    Text("Connect to RoleVault")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)

                    LiquidGlassPanel(cornerRadius: 24) {
                        VStack(spacing: 16) {
                            TextField("Email", text: $email)
                                .textContentType(.emailAddress)
                                .keyboardType(.emailAddress)
                                .autocorrectionDisabled()
                                .textInputAutocapitalization(.never)
                                .padding()
                                .background(.thinMaterial)
                                .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))

                            ZStack(alignment: .trailing) {
                                Group {
                                    if isPasswordVisible {
                                        TextField("Password", text: $password)
                                            .textContentType(.password)
                                    } else {
                                        SecureField("Password", text: $password)
                                            .textContentType(.password)
                                    }
                                }
                                .padding()
                                .padding(.trailing, 36)

                                Button {
                                    isPasswordVisible.toggle()
                                } label: {
                                    Image(systemName: isPasswordVisible ? "eye.slash.fill" : "eye.fill")
                                        .foregroundStyle(.secondary)
                                }
                                .padding(.trailing, 16)
                            }
                            .background(.thinMaterial)
                            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))

                            Button {
                                Task { await login() }
                            } label: {
                                HStack {
                                    if isLoading {
                                        ProgressView()
                                            .tint(.white)
                                    } else {
                                        Text("Log In")
                                            .font(.headline)
                                    }
                                }
                                .foregroundStyle(.white)
                                .frame(maxWidth: .infinity)
                                .padding()
                                .background(
                                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                                        .fill(.tint)
                                )
                                .opacity(email.isEmpty || password.isEmpty ? 0.5 : 1.0)
                            }
                            .disabled(email.isEmpty || password.isEmpty || isLoading)

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

                            NavigationLink {
                                RegisterView()
                            } label: {
                                Text("Don't have an account? Sign up")
                                    .font(.subheadline)
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }
                    .padding(.horizontal, 32)

                    Spacer()
                }
            }
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        showBackendConfig = true
                    } label: {
                        Image(systemName: "gearshape.fill")
                    }
                }
            }
            .sheet(isPresented: $showBackendConfig) {
                NavigationStack {
                    BackendConfigView()
                }
            }
            .alert("Login Failed", isPresented: $showError) {
                Button("OK", role: .cancel) { }
            } message: {
                Text(errorMessage ?? "Unknown error")
            }
        }
    }

    private func login() async {
        guard isValidEmail(email) else {
            errorMessage = "Please enter a valid email address"
            showError = true
            HapticEngine.notification(.error)
            return
        }

        isLoading = true
        defer { isLoading = false }
        do {
            _ = try await AuthService.shared.login(email: email, password: password)
            HapticEngine.notification(.success)
        } catch let apiError as APIError {
            switch apiError {
            case .networkError, .offline:
                errorMessage = "Cannot reach server. Check Backend URL in Settings (gear icon)."
            case .unauthorized, .serverError(401, _):
                errorMessage = "Invalid email or password."
            default:
                errorMessage = apiError.localizedDescription
            }
            showError = true
            HapticEngine.notification(.error)
        } catch {
            errorMessage = error.localizedDescription
            showError = true
            HapticEngine.notification(.error)
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
            isLoading = true
            defer { isLoading = false }
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

    private func isValidEmail(_ email: String) -> Bool {
        let regex = "^[A-Z0-9a-z._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$"
        return NSPredicate(format: "SELF MATCHES %@", regex).evaluate(with: email)
    }
}
