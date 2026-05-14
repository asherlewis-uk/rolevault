import Foundation

@Observable
final class RoleVaultAPI {
    static let shared = RoleVaultAPI()

    var baseURL: String {
        didSet {
            UserDefaults.standard.set(baseURL, forKey: "rolevault_api_url")
        }
    }

    private let session: URLSession
    private let decoder: JSONDecoder
    private let encoder: JSONEncoder

    private init() {
        self.baseURL = UserDefaults.standard.string(forKey: "rolevault_api_url") ?? "http://localhost:8001"
        self.session = URLSession.shared
        self.decoder = JSONDecoder()
        self.decoder.keyDecodingStrategy = .convertFromSnakeCase
        self.encoder = JSONEncoder()
        self.encoder.keyEncodingStrategy = .convertToSnakeCase
    }

    // MARK: - Request Builder

    private func buildRequest(path: String, method: String, body: Data?, accept: String = "application/json") throws -> URLRequest {
        guard let url = URL(string: baseURL + path) else {
            throw APIError.invalidURL
        }
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(accept, forHTTPHeaderField: "Accept")
        if let jwt = try? KeychainManager.shared.retrieveJWT() {
            request.setValue("Bearer \(jwt)", forHTTPHeaderField: "Authorization")
        }
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

    private func executeStream(_ request: URLRequest) async throws -> (URLSession.AsyncBytes, HTTPURLResponse) {
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

    func request(path: String, method: String = "GET", body: Data? = nil) async throws -> (Data, URLResponse) {
        let req = try buildRequest(path: path, method: method, body: body)
        do {
            return try await executeRequest(req)
        } catch APIError.unauthorized {
            let refreshed = await TokenInterceptor.shared.attemptRefresh()
            guard refreshed else { throw APIError.unauthorized }
            let retryReq = try buildRequest(path: path, method: method, body: body)
            return try await executeRequest(retryReq)
        }
    }

    func stream(path: String, method: String = "GET", body: Data? = nil, accept: String = "text/event-stream") async throws -> (URLSession.AsyncBytes, HTTPURLResponse) {
        let req = try buildRequest(path: path, method: method, body: body, accept: accept)
        do {
            return try await executeStream(req)
        } catch APIError.unauthorized {
            let refreshed = await TokenInterceptor.shared.attemptRefresh()
            guard refreshed else { throw APIError.unauthorized }
            let retryReq = try buildRequest(path: path, method: method, body: body, accept: accept)
            return try await executeStream(retryReq)
        }
    }

    // MARK: - Convenience Methods

    func get<T: Decodable>(path: String) async throws -> T {
        let (data, _) = try await request(path: path, method: "GET")
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
        let (data, _) = try await request(path: path, method: "POST", body: bodyData)
        do {
            return try decoder.decode(T.self, from: data)
        } catch {
            throw APIError.decodingError(error)
        }
    }

    func post(path: String) async throws {
        let (_, _) = try await request(path: path, method: "POST")
    }

    func put<T: Decodable>(path: String, body: Data) async throws -> T {
        let (data, _) = try await request(path: path, method: "PUT", body: body)
        do {
            return try decoder.decode(T.self, from: data)
        } catch {
            throw APIError.decodingError(error)
        }
    }

    func delete(path: String) async throws {
        let (_, _) = try await request(path: path, method: "DELETE")
    }
}
