import Foundation

@Observable
final class ChatService {
    static let shared = ChatService()
    private let api = LibreChatAPI.shared
    private let decoder: JSONDecoder

    private init() {
        self.decoder = JSONDecoder()
        self.decoder.keyDecodingStrategy = .convertFromSnakeCase
    }

    // MARK: - Conversations

    func fetchConversations() async throws -> [LibreChatConversation] {
        let response: ConvoListResponse = try await api.get(path: "/api/convos")
        return response.conversations
    }

    func fetchMessages(conversationId: String) async throws -> [LibreChatMessage] {
        let response: MessageListResponse = try await api.get(path: "/api/messages/\(conversationId)")
        return response.messages
    }

    // MARK: - Streaming Send

    /// Send a message and receive the response as a real-time SSE stream.
    func sendMessageStream(
        text: String,
        conversationId: String? = nil,
        endpoint: String = "agents",
        model: String = "gpt-4o",
        instructions: String? = nil,
        agentId: String? = nil,
        personaName: String? = nil
    ) -> AsyncThrowingStream<ChatStreamEvent, Error> {
        let request = AskRequest(
            text: text,
            conversationId: conversationId,
            endpoint: endpoint,
            model: model,
            instructions: instructions,
            agentOptions: agentId.map { AskRequest.AgentOptions(agentId: $0, model: model) },
            persona: personaName.map { AskRequest.PersonaPayload(name: $0, role: nil) }
        )
        return sendMessageStream(request)
    }

    /// Send a message and receive the response as a real-time SSE stream.
    func sendMessageStream(_ request: AskRequest) -> AsyncThrowingStream<ChatStreamEvent, Error> {
        AsyncThrowingStream { continuation in
            let task = Task {
                do {
                    let encoder = JSONEncoder()
                    encoder.keyEncodingStrategy = .convertToSnakeCase
                    let body = try encoder.encode(request)

                    let (bytes, _) = try await api.stream(
                        path: "/api/ask",
                        method: "POST",
                        body: body,
                        accept: "text/event-stream"
                    )

                    var dataLines: [String] = []
                    var lastMessage: LibreChatMessage?
                    var lastConversationId: String?

                    for try await line in bytes.lines {
                        if line.hasPrefix("data: ") {
                            dataLines.append(String(line.dropFirst(6)))
                        } else if line.isEmpty {
                            let payload = dataLines.joined(separator: "\n")
                            dataLines.removeAll()

                            if payload == "[DONE]" {
                                continuation.yield(.done(conversationId: lastConversationId, message: lastMessage))
                                continuation.finish()
                                return
                            }

                            guard !payload.isEmpty else { continue }

                            if let jsonData = payload.data(using: .utf8) {
                                if let chunk = try? self.decoder.decode(SSEChunk.self, from: jsonData) {
                                    lastConversationId = chunk.conversationId ?? lastConversationId
                                    if let msg = chunk.message {
                                        lastMessage = msg
                                        continuation.yield(.delta(msg.text))
                                    } else if let text = chunk.text {
                                        continuation.yield(.delta(text))
                                    }
                                }
                            }
                        }
                    }

                    // Stream ended without explicit [DONE]
                    continuation.yield(.done(conversationId: lastConversationId, message: lastMessage))
                    continuation.finish()
                } catch {
                    continuation.finish(throwing: error)
                }
            }

            continuation.onTermination = { _ in
                task.cancel()
            }
        }
    }

    // MARK: - Non-Streaming Convenience

    /// Non-streaming convenience that accumulates the stream and returns the final response.
    func sendMessage(
        text: String,
        conversationId: String? = nil,
        endpoint: String = "agents",
        model: String = "gpt-4o",
        instructions: String? = nil,
        agentId: String? = nil,
        personaName: String? = nil
    ) async throws -> AskResponse {
        let request = AskRequest(
            text: text,
            conversationId: conversationId,
            endpoint: endpoint,
            model: model,
            instructions: instructions,
            agentOptions: agentId.map { AskRequest.AgentOptions(agentId: $0, model: model) },
            persona: personaName.map { AskRequest.PersonaPayload(name: $0, role: nil) }
        )
        return try await sendMessage(request)
    }

    /// Non-streaming convenience that accumulates the stream and returns the final response.
    func sendMessage(_ request: AskRequest) async throws -> AskResponse {
        var finalText = ""
        var finalConversationId: String?
        var finalMessage: LibreChatMessage?

        for try await event in sendMessageStream(request) {
            switch event {
            case .delta(let text):
                finalText = text
            case .done(let cid, let msg):
                finalConversationId = cid
                finalMessage = msg
            }
        }

        let message = finalMessage ?? LibreChatMessage(
            id: UUID().uuidString,
            text: finalText,
            sender: "Assistant",
            isCreatedByUser: false,
            createdAt: ISO8601DateFormatter().string(from: Date())
        )

        return AskResponse(
            message: message,
            conversationId: finalConversationId,
            response: finalText
        )
    }
}
