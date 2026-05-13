import SwiftUI

@Observable
final class AppState {
    var isAuthenticated: Bool {
        AuthService.shared.isAuthenticated
    }
}
