import Foundation

enum APIError: LocalizedError {
    case invalidURL
    case unauthorized
    case notFound
    case serverError(Int, String?)
    case decodingError(Error)
    case encodingError(Error)
    case networkError(Error)
    case offline
    case unknown

    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid API URL. Check backend configuration."
        case .unauthorized:
            return "Session expired. Please log in again."
        case .notFound:
            return "The requested resource was not found."
        case .serverError(let code, let message):
            return message ?? "Server error \(code)."
        case .decodingError:
            return "Unexpected response format."
        case .encodingError:
            return "Failed to encode request."
        case .networkError(let error):
            return error.localizedDescription
        case .offline:
            return "No internet connection."
        case .unknown:
            return "An unknown error occurred."
        }
    }
}
