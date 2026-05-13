import SwiftUI

/// Lightweight dependency container for shared services.
/// In a larger app, this would use protocol-based injection.
/// For RoleVault, static shared instances on services are sufficient.
enum DependencyContainer {
    static var api: LibreChatAPI { LibreChatAPI.shared }
    static var auth: AuthService { AuthService.shared }
    static var chat: ChatService { ChatService.shared }
    static var agent: AgentService { AgentService.shared }
    static var config: ConfigService { ConfigService.shared }
}
