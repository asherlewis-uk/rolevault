import Foundation

/// Client for the managed RoleVault inference service.
final class InferenceAPI {
    static let shared = InferenceAPI()

    let baseURL = "https://api.asherlewis.online"

    private let session: URLSession
    private let decoder: JSONDecoder
    private let encoder: JSONEncoder

    private init() {
        self.session = URLSession.shared
        self.decoder = JSONDecoder()
        self.encoder = JSONEncoder()
    }

    // MARK: - Request Builder

    private func buildRequest(path: String, method: String, body: Data?, accept: String = "text/event-stream") throws -> URLRequest {
        guard let url = URL(string: baseURL + path) else {
            throw APIError.invalidURL
        }
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(accept, forHTTPHeaderField: "Accept")
        request.httpBody = body
        return request
    }

    // MARK: - Execution

    private func executeRequest(_ request: URLRequest) async throws -> (Data, URLResponse) {
        do {
            let (data, response) = try await session.data(for: request)
            guard let httpResponse = response as? HTTPURLResponse else {
                throw APIError.unknown
            }
            if httpResponse.statusCode == 404 {
                throw APIError.notFound
            }
            if (400..<600).contains(httpResponse.statusCode) {
                let message = String(data: data, encoding: .utf8)
                throw APIError.serverError(httpResponse.statusCode, message)
            }
            return (data, response)
        } catch let error as APIError {
            throw error
        } catch {
            let nsError = error as NSError
            if nsError.domain == NSURLErrorDomain && nsError.code == NSURLErrorNotConnectedToInternet {
                throw APIError.offline
            }
            throw APIError.networkError(error)
        }
    }

    func executeStream(_ request: URLRequest) async throws -> (URLSession.AsyncBytes, HTTPURLResponse) {
        do {
            let (bytes, response) = try await session.bytes(for: request)
            guard let httpResponse = response as? HTTPURLResponse else {
                throw APIError.unknown
            }
            if httpResponse.statusCode == 404 {
                throw APIError.notFound
            }
            if (400..<600).contains(httpResponse.statusCode) {
                throw APIError.serverError(httpResponse.statusCode, nil)
            }
            return (bytes, httpResponse)
        } catch let error as APIError {
            throw error
        } catch {
            let nsError = error as NSError
            if nsError.domain == NSURLErrorDomain && nsError.code == NSURLErrorNotConnectedToInternet {
                throw APIError.offline
            }
            throw APIError.networkError(error)
        }
    }

    // MARK: - Public API

    func stream(path: String, method: String = "GET", body: Data? = nil) async throws -> (URLSession.AsyncBytes, HTTPURLResponse) {
        let req = try buildRequest(path: path, method: method, body: body)
        return try await executeStream(req)
    }

    // MARK: - Model Discovery

    struct ModelInfo: Codable {
        let id: String
        let object: String
        let created: Int?
        let ownedBy: String?
    }

    struct ModelListResponse: Codable {
        let object: String
        let data: [ModelInfo]
    }

    func fetchAvailableModels() async throws -> [String] {
        let req = try buildRequest(path: "/v1/models", method: "GET", body: nil, accept: "application/json")
        let response: ModelListResponse = try await executeAndDecode(req)
        return response.data.map { $0.id }
    }

    private func executeAndDecode<T: Decodable>(_ request: URLRequest) async throws -> T {
        let (data, _) = try await executeRequest(request)
        do {
            return try decoder.decode(T.self, from: data)
        } catch {
            throw APIError.decodingError(error)
        }
    }

    // MARK: - Convenience Methods

    func get<T: Decodable>(path: String) async throws -> T {
        let (data, _) = try await executeRequest(try buildRequest(path: path, method: "GET", body: nil, accept: "application/json"))
        do {
            return try decoder.decode(T.self, from: data)
        } catch {
            throw APIError.decodingError(error)
        }
    }

    func post<T: Decodable, B: Encodable>(path: String, body: B) async throws -> T {
        let bodyData: Data
        do {
            bodyData = try encoder.encode(body)
        } catch {
            throw APIError.encodingError(error)
        }
        let (data, _) = try await executeRequest(try buildRequest(path: path, method: "POST", body: bodyData, accept: "application/json"))
        do {
            return try decoder.decode(T.self, from: data)
        } catch {
            throw APIError.decodingError(error)
        }
    }
}
