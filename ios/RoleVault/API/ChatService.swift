import Foundation

@Observable
final class ChatService {
    static let shared = ChatService()
    static var defaultModel = ""  // set from backend config; empty until fetched
    private let api = RoleVaultAPI.shared
    private let inference = InferenceAPI.shared
    private let decoder: JSONDecoder
    private let encoder: JSONEncoder

    private init() {
        self.decoder = JSONDecoder()
        self.decoder.keyDecodingStrategy = .convertFromSnakeCase
        self.encoder = JSONEncoder()
        self.encoder.keyEncodingStrategy = .convertToSnakeCase
    }

    // MARK: - Conversations (RoleVault API)

    func fetchConversations() async throws -> [ChatConversation] {
        let remote: [RemoteConversation] = try await api.get(path: "/api/convos")
        return remote.map {
            ChatConversation(
                id: $0.id.uuidString,
                title: $0.title,
                createdAt: $0.createdAt,
                updatedAt: $0.updatedAt,
                model: $0.model
            )
        }
    }

    func fetchMessages(conversationId: String) async throws -> [ChatMessage] {
        let remote: [RemoteMessage] = try await api.get(path: "/api/convos/\(conversationId)/messages")
        return remote.map {
            ChatMessage(
                id: $0.id.uuidString,
                text: $0.content,
                sender: $0.role.capitalized,
                isCreatedByUser: $0.role == "user",
                createdAt: $0.createdAt
            )
        }
    }

    // MARK: - Streaming Send (Inference API)

    /// Send a message to LM Studio and receive the response as a real-time SSE stream.
    func sendMessageStream(
        messages: [ChatCompletionMessage],
        model: String? = nil
    ) -> AsyncThrowingStream<ChatStreamEvent, Error> {
        let resolvedModel = model ?? ChatService.defaultModel
        guard !resolvedModel.isEmpty else {
            return AsyncThrowingStream { continuation in
                continuation.finish(throwing: APIError.serverError(500, "No model configured. Check backend connection."))
            }
        }
        let request = ChatRequest(
            model: resolvedModel,
            messages: messages,
            stream: true
        )
        return sendMessageStream(request)
    }

    /// Send a message and receive the response as a real-time SSE stream.
    func sendMessageStream(_ request: ChatRequest) -> AsyncThrowingStream<ChatStreamEvent, Error> {
        AsyncThrowingStream { continuation in
            let task = Task {
                do {
                    let body = try self.encoder.encode(request)

                    let (bytes, _) = try await self.inference.stream(
                        path: "/v1/chat/completions",
                        method: "POST",
                        body: body
                    )

                    var accumulatedText = ""
                    let messageId = UUID().uuidString

                    for try await line in bytes.lines {
                        if line.hasPrefix("data: ") {
                            let payload = String(line.dropFirst(6))

                            if payload == "[DONE]" {
                                let finalMessage = ChatMessage(
                                    id: messageId,
                                    text: accumulatedText,
                                    sender: "Assistant",
                                    isCreatedByUser: false,
                                    createdAt: ISO8601DateFormatter().string(from: Date())
                                )
                                continuation.yield(.done(message: finalMessage))
                                continuation.finish()
                                return
                            }

                            guard !payload.isEmpty,
                                  let jsonData = payload.data(using: .utf8) else { continue }

                            if let chunk = try? self.decoder.decode(OpenAIStreamChunk.self, from: jsonData),
                               let choice = chunk.choices?.first,
                               let delta = choice.delta,
                               let content = delta.content {
                                accumulatedText += content
                                continuation.yield(.delta(accumulatedText))
                            }

                            if let chunk = try? self.decoder.decode(OpenAIStreamChunk.self, from: jsonData),
                               let choice = chunk.choices?.first,
                               choice.finishReason != nil {
                                let finalMessage = ChatMessage(
                                    id: messageId,
                                    text: accumulatedText,
                                    sender: "Assistant",
                                    isCreatedByUser: false,
                                    createdAt: ISO8601DateFormatter().string(from: Date())
                                )
                                continuation.yield(.done(message: finalMessage))
                                continuation.finish()
                                return
                            }
                        }
                    }

                    // Stream ended without explicit [DONE]
                    let finalMessage = ChatMessage(
                        id: messageId,
                        text: accumulatedText,
                        sender: "Assistant",
                        isCreatedByUser: false,
                        createdAt: ISO8601DateFormatter().string(from: Date())
                    )
                    continuation.yield(.done(message: finalMessage))
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
        messages: [ChatCompletionMessage],
        model: String? = nil
    ) async throws -> ChatMessage {
        let resolvedModel = model ?? ChatService.defaultModel
        guard !resolvedModel.isEmpty else {
            throw APIError.serverError(500, "No model configured. Check backend connection.")
        }
        let request = ChatRequest(
            model: resolvedModel,
            messages: messages,
            stream: true
        )
        var finalText = ""
        var finalMessage: ChatMessage?

        for try await event in sendMessageStream(request) {
            switch event {
            case .delta(let text):
                finalText = text
            case .done(let msg):
                finalMessage = msg
            }
        }

        return finalMessage ?? ChatMessage(
            id: UUID().uuidString,
            text: finalText,
            sender: "Assistant",
            isCreatedByUser: false,
            createdAt: ISO8601DateFormatter().string(from: Date())
        )
    }
}
