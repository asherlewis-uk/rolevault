import SwiftUI

struct MessageInputBar: View {
    @Binding var text: String
    let personaName: String
    let onPersonaTap: () -> Void
    let onSend: () -> Void

    @State private var sendTrigger = false
    private var canSend: Bool {
        !text.trimmingCharacters(in: .whitespaces).isEmpty && ConfigService.shared.isConfigured
    }

    var body: some View {
        HStack(spacing: 12) {
            Button(action: onPersonaTap) {
                HStack(spacing: 4) {
                    Image(systemName: "person.crop.circle")
                    Text(personaName)
                        .font(.caption.weight(.medium))
                }
                .foregroundStyle(.secondary)
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .background(.ultraThinMaterial)
                .clipShape(Capsule())
            }

            TextField("Message...", text: $text, axis: .vertical)
                .font(.body)
                .lineLimit(1...5)
                .padding(12)
                .background(.ultraThinMaterial)
                .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))

            sendButton
                .sensoryFeedback(.impact, trigger: sendTrigger)
        }
        .padding(12)
        .background(.ultraThinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 28, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 28, style: .continuous)
                .stroke(.white.opacity(0.15), lineWidth: 1)
        )
    }

    private var sendButton: some View {
        Button(action: {
            sendTrigger.toggle()
            onSend()
        }) {
            if !ConfigService.shared.isConfigured {
                Text("Check backend")
                    .font(.caption2.weight(.semibold))
                    .foregroundStyle(.secondary)
                    .frame(width: 44, height: 44)
                    .background(.thinMaterial)
                    .clipShape(Circle())
            } else {
                Image(systemName: "paperplane.fill")
                    .font(.title3)
                    .foregroundStyle(.white)
                    .frame(width: 44, height: 44)
                    .background(
                        Group {
                            if text.trimmingCharacters(in: .whitespaces).isEmpty {
                                Color.clear
                                    .background(.thinMaterial)
                            } else {
                                LinearGradient(
                                    colors: [RoleVaultColor.gradientPrimaryStart, RoleVaultColor.gradientPrimaryEnd],
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                )
                            }
                        }
                    )
                    .clipShape(Circle())
            }
        }
        .disabled(!canSend)
    }
}
