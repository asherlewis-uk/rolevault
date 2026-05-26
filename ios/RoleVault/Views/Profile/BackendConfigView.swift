import SwiftUI

struct BackendConfigView: View {
    var body: some View {
        ZStack {
            AuroraBackground()
            Form {
                if let url = URL(string: RoleVaultAPI.shared.baseURL) {
                    LabeledContent("Server", value: url.host ?? "Unknown")
                }
            }
            .scrollContentBackground(.hidden)
        }
        .navigationTitle("Backend")
    }
}
