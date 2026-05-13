import Foundation

@Observable
final class AgentService {
    static let shared = AgentService()
    private let api = LibreChatAPI.shared
    private let encoder: JSONEncoder

    private init() {
        self.encoder = JSONEncoder()
        self.encoder.keyEncodingStrategy = .convertToSnakeCase
    }

    // MARK: - CRUD

    func fetchAgents() async throws -> [LibreChatAgent] {
        let response: AgentListResponse = try await api.get(path: "/api/agents")
        return response.agents
    }

    func createAgentFromCharacter(_ character: Character, model: String = "gpt-4o") async throws -> LibreChatAgent {
        let request = buildCreateRequest(from: character, model: model)
        let response: CreateAgentResponse = try await api.post(path: "/api/agents", body: request)
        return response.agent
    }

    func updateAgent(id: String, character: Character, model: String = "gpt-4o") async throws -> LibreChatAgent {
        let request = buildCreateRequest(from: character, model: model)
        let body = try encoder.encode(request)
        let response: UpdateAgentResponse = try await api.put(path: "/api/agents/\(id)", body: body)
        return response.agent
    }

    func deleteAgent(id: String) async throws {
        try await api.delete(path: "/api/agents/\(id)")
    }

    // MARK: - Mapping

    private func buildCreateRequest(from character: Character, model: String) -> CreateAgentRequest {
        CreateAgentRequest(
            name: character.name,
            description: character.subtitle.isEmpty ? nil : character.subtitle,
            instructions: buildInstructions(from: character),
            model: model,
            provider: nil,
            category: character.category.rawValue,
            avatar: character.avatarDescription.isEmpty ? nil : character.avatarDescription
        )
    }

    private func buildInstructions(from character: Character) -> String {
        var parts: [String] = []
        if !character.responseDirective.isEmpty {
            parts.append("Directive: \(character.responseDirective)")
        }
        if !character.backstory.isEmpty {
            parts.append("Backstory: \(character.backstory)")
        }
        if !character.keyMemories.isEmpty {
            parts.append("Memories: \(character.keyMemories)")
        }
        if !character.exampleMessage.isEmpty {
            parts.append("Example: \(character.exampleMessage)")
        }
        if !character.greetingMessage.isEmpty {
            parts.append("Greeting: \(character.greetingMessage)")
        }
        return parts.joined(separator: "\n\n")
    }
}
