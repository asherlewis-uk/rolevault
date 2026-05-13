import SwiftUI
import SwiftData

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
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var showError = false

    var body: some View {
        ZStack {
            AuroraBackground()

            VStack(spacing: 24) {
                Spacer()

                Text("RoleVault")
                    .font(.system(size: 48, weight: .bold, design: .rounded))
                    .foregroundStyle(.primary)

                Text("Connect to your LibreChat universe")
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

                        SecureField("Password", text: $password)
                            .textContentType(.password)
                            .padding()
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
                        }
                        .disabled(email.isEmpty || password.isEmpty || isLoading)
                    }
                }
                .padding(.horizontal, 32)

                Spacer()
            }
        }
        .alert("Login Failed", isPresented: $showError) {
            Button("OK", role: .cancel) { }
        } message: {
            Text(errorMessage ?? "Unknown error")
        }
    }

    private func login() async {
        isLoading = true
        defer { isLoading = false }
        do {
            _ = try await AuthService.shared.login(email: email, password: password)
            HapticEngine.notification(.success)
        } catch {
            errorMessage = error.localizedDescription
            showError = true
            HapticEngine.notification(.error)
        }
    }
}
