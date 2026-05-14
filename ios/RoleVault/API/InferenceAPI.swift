import Foundation

/// Client for LM Studio inference server (OpenAI-compatible /v1/chat/completions).
/// No authentication required.
final class InferenceAPI {
    static let shared = InferenceAPI()

    var baseURL: String {
        didSet {
            UserDefaults.standard.set(baseURL, forKey: "inference_url")
        }
    }

    private let session: URLSession
    private let decoder: JSONDecoder
    private let encoder: JSONEncoder

    private init() {
        self.baseURL = UserDefaults.standard.string(forKey: "inference_url") ?? "http://localhost:1234"
        self.session = URLSession.shared
        self.decoder = JSONDecoder()
        self.encoder = JSONEncoder()
    }

    // MARK: - Request Builder

    private func buildRequest(path: String, method: String, body: Data?) throws -> URLRequest {
        guard let url = URL(string: baseURL + path) else {
            throw APIError.invalidURL
        }
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("text/event-stream", forHTTPHeaderField: "Accept")
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

    // MARK: - Convenience Methods

    func get<T: Decodable>(path: String) async throws -> T {
        let (data, _) = try await executeRequest(try buildRequest(path: path, method: "GET", body: nil))
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
        let (data, _) = try await executeRequest(try buildRequest(path: path, method: "POST", body: bodyData))
        do {
            return try decoder.decode(T.self, from: data)
        } catch {
            throw APIError.decodingError(error)
        }
    }
}
