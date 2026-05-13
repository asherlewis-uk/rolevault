import Foundation

struct AskRequest: Codable {
    let text: String
    let conversationId: String?
    let endpoint: String
    let model: String
    let instructions: String?
    let agentOptions: AgentOptions?
    let persona: PersonaPayload?

    struct AgentOptions: Codable {
        let agentId: String
        let model: String?
    }

    struct PersonaPayload: Codable {
        let name: String
        let role: String?
    }
}

struct AskResponse: Codable {
    let message: LibreChatMessage?
    let conversationId: String?
    let response: String?
}

struct LibreChatMessage: Codable, Identifiable, Hashable {
    let id: String
    let text: String
    let sender: String
    let isCreatedByUser: Bool
    let createdAt: String?
}

struct ConvoListResponse: Codable {
    let conversations: [LibreChatConversation]
}

struct LibreChatConversation: Codable, Identifiable {
    let id: String
    let title: String
    let createdAt: String?
    let updatedAt: String?
    let endpoint: String?
    let model: String?
}

struct MessageListResponse: Codable {
    let messages: [LibreChatMessage]
    let conversation: LibreChatConversation?
}

// MARK: - SSE Streaming

/// Events emitted by the chat message stream.
enum ChatStreamEvent: Sendable {
    /// A text delta containing the latest accumulated text from the assistant.
    case delta(String)
    /// Stream completed. Optionally carries the final conversation ID and assembled message.
    case done(conversationId: String?, message: LibreChatMessage?)
}

/// Internal structure for parsing SSE JSON chunks from LibreChat.
struct SSEChunk: Decodable {
    let conversationId: String?
    let message: LibreChatMessage?
    let text: String?
}
