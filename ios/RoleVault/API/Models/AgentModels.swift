import Foundation

struct AgentListResponse: Codable {
    let agents: [LibreChatAgent]
}

struct LibreChatAgent: Codable, Identifiable {
    let id: String
    let name: String
    let description: String?
    let instructions: String?
    let model: String?
    let provider: String?
    let category: String?
    let avatar: String?
    let createdAt: String?
    let updatedAt: String?
}

struct CreateAgentRequest: Codable {
    let name: String
    let description: String?
    let instructions: String
    let model: String
    let provider: String?
    let category: String?
    let avatar: String?
}

struct CreateAgentResponse: Codable {
    let agent: LibreChatAgent
}

struct UpdateAgentResponse: Codable {
    let agent: LibreChatAgent
}
