import Foundation

@Observable
final class ConfigService {
    static let shared = ConfigService()
    private let api = RoleVaultAPI.shared
    private let inference = InferenceAPI.shared

    static let fallbackModels: [String] = [
        "llama3.2",
        "llama3.1:8b",
        "mistral",
        "mixtral:8x7b",
        "gemma2:9b",
        "phi3:mini",
    ]

    static let fallbackModel = "llama3.2"

    var availableModels: [String] = ConfigService.fallbackModels
    var isConfigured = false
    var configError: String?

    func fetchConfig() async throws -> ServerConfig {
        do {
            let config: ServerConfig = try await api.get(path: "/api/config")

            if let serverInferenceURL = config.inferenceUrl, serverInferenceURL != inference.baseURL {
                await MainActor.run {
                    configError = "Service configuration is invalid."
                    isConfigured = false
                }
                throw APIError.serverError(500, "Service configuration is invalid.")
            }

            await MainActor.run {
                isConfigured = false
                configError = nil
            }

            // Probe the inference endpoint to discover models
            let discovered = await probeInferenceModels()

            await MainActor.run {
                availableModels = discovered.isEmpty ? ConfigService.fallbackModels : discovered
                isConfigured = true

                if ChatService.defaultModel.isEmpty || !availableModels.contains(ChatService.defaultModel) {
                    ChatService.defaultModel = availableModels.first ?? ConfigService.fallbackModel
                }
            }

            return config
        } catch {
            await MainActor.run {
                configError = error.localizedDescription
                isConfigured = false
            }
            throw error
        }
    }

    private func probeInferenceModels() async -> [String] {
        do {
            return try await inference.fetchAvailableModels()
        } catch {
            return []
        }
    }
}

struct ServerConfig: Codable {
    let inferenceUrl: String?
    let version: String
}
