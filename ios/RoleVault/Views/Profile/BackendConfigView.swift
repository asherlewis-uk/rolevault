import SwiftUI

struct ServiceStatusView: View {
    var body: some View {
        ZStack {
            AuroraBackground()
            VStack(spacing: 12) {
                Image(systemName: "checkmark.shield.fill")
                    .font(.system(size: 36, weight: .semibold))
                    .foregroundStyle(RoleVaultColor.primary)

                Text("Service Managed")
                    .font(RoleVaultTypography.title)

                Text("RoleVault connects through a verified managed service.")
                    .font(RoleVaultTypography.secondary)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 32)
            }
            .padding()
            .accessibilityElement(children: .combine)
        }
        .navigationTitle("Service")
    }
}
