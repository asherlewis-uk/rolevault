import Foundation

struct ServerConfig: Codable {
    let version: String?
    let endpoints: EndpointsConfig?
    let models: ModelsConfig?
    let registrationEnabled: Bool?
    let socialLoginEnabled: Bool?
    let emailEnabled: Bool?

    struct EndpointsConfig: Codable {
        let openAI: EndpointDetail?
        let azureOpenAI: EndpointDetail?
        let google: EndpointDetail?
        let anthropic: EndpointDetail?
        let custom: [EndpointDetail]?
    }

    struct EndpointDetail: Codable {
        let name: String
        let baseURL: String?
        let models: [String]?
    }

    struct ModelsConfig: Codable {
        let available: [String]?
        let defaultModel: String?
    }
}
