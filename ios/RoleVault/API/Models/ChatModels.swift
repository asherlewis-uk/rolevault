import Foundation

// MARK: - OpenAI-Compatible Chat Completions

struct ChatRequest: Codable {
    let model: String
    let messages: [ChatCompletionMessage]
    let stream: Bool
}

struct ChatCompletionMessage: Codable {
    let role: String
    let content: String
}

struct ChatResponse: Codable {
    let id: String?
    let object: String?
    let created: Int?
    let model: String?
    let choices: [ChatChoice]?
}

struct ChatChoice: Codable {
    let index: Int?
    let delta: ChatCompletionMessage?
    let message: ChatCompletionMessage?
    let finishReason: String?
}

// MARK: - Remote API Models (RoleVault Backend)

struct RemoteConversation: Codable, Identifiable {
    let id: UUID
    let userId: UUID
    let characterId: UUID?
    let personaId: UUID?
    let title: String?
    let model: String?
    let isArchived: Bool
    let createdAt: String
    let updatedAt: String
}

struct RemoteMessage: Codable, Identifiable {
    let id: UUID
    let conversationId: UUID
    let userId: UUID
    let role: String
    let content: String
    let createdAt: String
}

// MARK: - Local Cache Models

struct ChatConversation: Codable, Identifiable {
    let id: String
    let title: String?
    let createdAt: String?
    let updatedAt: String?
    let model: String?
}

struct ChatMessage: Codable, Identifiable, Hashable {
    let id: String
    let text: String
    let sender: String
    let isCreatedByUser: Bool
    let createdAt: String?
}

// MARK: - SSE Streaming

/// Events emitted by the chat message stream.
enum ChatStreamEvent: Sendable {
    /// A text delta containing the latest accumulated text from the assistant.
    case delta(String)
    /// Stream completed. Optionally carries the final assembled message.
    case done(message: ChatMessage?)
}

/// Internal structure for parsing SSE JSON chunks from OpenAI-compatible servers.
struct OpenAIStreamChunk: Decodable {
    let id: String?
    let choices: [OpenAIStreamChoice]?
}

struct OpenAIStreamChoice: Decodable {
    let delta: OpenAIStreamDelta?
    let finishReason: String?
}

struct OpenAIStreamDelta: Decodable {
    let content: String?
}
