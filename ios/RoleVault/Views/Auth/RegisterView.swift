import SwiftUI

struct RegisterView: View {
    @State private var email: String = ""
    @State private var password: String = ""
    @State private var confirmPassword: String = ""
    @State private var displayName: String = ""
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var showError = false
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ZStack {
            AuroraBackground()

            VStack(spacing: 24) {
                Spacer()

                Text("Create Account")
                    .font(.system(size: 36, weight: .bold, design: .rounded))
                    .foregroundStyle(.primary)

                Text("Join RoleVault")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)

                LiquidGlassPanel(cornerRadius: 24) {
                    VStack(spacing: 16) {
                        TextField("Display Name", text: $displayName)
                            .textContentType(.name)
                            .autocorrectionDisabled()
                            .textInputAutocapitalization(.words)
                            .padding()
                            .background(.thinMaterial)
                            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))

                        TextField("Email", text: $email)
                            .textContentType(.emailAddress)
                            .keyboardType(.emailAddress)
                            .autocorrectionDisabled()
                            .textInputAutocapitalization(.never)
                            .padding()
                            .background(.thinMaterial)
                            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))

                        SecureField("Password", text: $password)
                            .textContentType(.newPassword)
                            .padding()
                            .background(.thinMaterial)
                            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))

                        SecureField("Confirm Password", text: $confirmPassword)
                            .textContentType(.newPassword)
                            .padding()
                            .background(.thinMaterial)
                            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))

                        Button {
                            Task { await register() }
                        } label: {
                            HStack {
                                if isLoading {
                                    ProgressView()
                                        .tint(.white)
                                } else {
                                    Text("Sign Up")
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
                        .disabled(email.isEmpty || password.isEmpty || confirmPassword.isEmpty || isLoading)
                    }
                }
                .padding(.horizontal, 32)

                Button {
                    dismiss()
                } label: {
                    Text("Already have an account? Log in")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }

                Spacer()
            }
        }
        .alert("Registration Failed", isPresented: $showError) {
            Button("OK", role: .cancel) { }
        } message: {
            Text(errorMessage ?? "Unknown error")
        }
    }

    private func register() async {
        guard !displayName.isEmpty else {
            errorMessage = "Display name is required"
            showError = true
            return
        }
        guard isValidEmail(email) else {
            errorMessage = "Please enter a valid email address"
            showError = true
            return
        }
        guard password == confirmPassword else {
            errorMessage = "Passwords do not match"
            showError = true
            return
        }
        guard password.count >= 6 else {
            errorMessage = "Password must be at least 6 characters"
            showError = true
            return
        }
        isLoading = true
        defer { isLoading = false }
        do {
            _ = try await AuthService.shared.register(email: email, password: password, displayName: displayName)
            HapticEngine.notification(.success)
            dismiss()
        } catch let apiError as APIError {
            switch apiError {
            case .networkError, .offline:
                errorMessage = "Cannot reach server. Check Backend URL in Settings (gear icon)."
            case .serverError(409, _):
                errorMessage = "Email already registered."
            case .unauthorized, .serverError(401, _):
                errorMessage = "Registration denied."
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

    private func isValidEmail(_ email: String) -> Bool {
        let regex = "^[A-Z0-9a-z._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$"
        return NSPredicate(format: "SELF MATCHES %@", regex).evaluate(with: email)
    }
}
