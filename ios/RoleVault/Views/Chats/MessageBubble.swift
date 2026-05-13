import SwiftUI

enum MessageRenderType {
    case regular
    case action
    case thought
}

struct MessageBubble: View {
    let message: LibreChatMessage
    let isUser: Bool
    var characterAvatar: Data?
    @State private var appeared = false

    private var renderType: MessageRenderType {
        let text = message.text.trimmingCharacters(in: .whitespaces)
        if text.hasPrefix("*") && text.hasSuffix("*") { return .action }
        if text.hasPrefix("<") && text.hasSuffix(">") { return .thought }
        return .regular
    }

    private var displayText: String {
        let text = message.text.trimmingCharacters(in: .whitespaces)
        switch renderType {
        case .action:
            return String(text.dropFirst().dropLast())
        case .thought:
            return String(text.dropFirst().dropLast())
        case .regular:
            return text
        }
    }

    var body: some View {
        Group {
            switch renderType {
            case .regular:
                regularBubble
            case .action:
                actionText
            case .thought:
                thoughtText
            }
        }
        .opacity(appeared ? 1 : 0)
        .scaleEffect(appeared ? 1 : 0.92)
        .animation(.spring(response: 0.35, dampingFraction: 0.75), value: appeared)
        .onAppear {
            appeared = true
        }
    }

    private var regularBubble: some View {
        HStack(alignment: .bottom, spacing: 8) {
            if !isUser {
                avatarView(data: characterAvatar)
                    .frame(width: 32, height: 32)
            } else {
                Spacer(minLength: 32)
            }

            Text(displayText)
                .font(.body)
                .padding(.horizontal, 14)
                .padding(.vertical, 10)
                .background(
                    RoundedRectangle(cornerRadius: 18, style: .continuous)
                        .fill(isUser ? AnyShapeStyle(.blue.opacity(0.2)) : AnyShapeStyle(.orange.opacity(0.12)))
                        .overlay(
                            RoundedRectangle(cornerRadius: 18, style: .continuous)
                                .stroke(isUser ? .blue.opacity(0.25) : .orange.opacity(0.2), lineWidth: 1)
                        )
                )
                .background(
                    RoundedRectangle(cornerRadius: 18, style: .continuous)
                        .fill(.ultraThinMaterial)
                )
                .foregroundStyle(.primary)
                .contextMenu {
                    Button {
                        UIPasteboard.general.string = message.text
                    } label: {
                        Label("Copy", systemImage: "doc.on.doc")
                    }
                }

            if isUser {
                avatarView(data: nil)
                    .frame(width: 32, height: 32)
            } else {
                Spacer(minLength: 32)
            }
        }
    }

    private var actionText: some View {
        HStack {
            Spacer()
            Text("*\(displayText)*")
                .font(.body.italic())
                .foregroundStyle(.secondary)
            Spacer()
        }
        .padding(.vertical, 4)
    }

    private var thoughtText: some View {
        HStack {
            Spacer()
            Text("(\(displayText))")
                .font(.system(size: 12, weight: .regular, design: .serif))
                .foregroundStyle(.gray)
                .italic()
            Spacer()
        }
        .padding(.vertical, 2)
    }

    private func avatarView(data: Data?) -> some View {
        ZStack {
            Circle()
                .fill(.thinMaterial)
            if let data, let uiImage = UIImage(data: data) {
                Image(uiImage: uiImage)
                    .resizable()
                    .scaledToFill()
                    .clipShape(Circle())
            } else {
                Image(systemName: "person.fill")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
    }
}
