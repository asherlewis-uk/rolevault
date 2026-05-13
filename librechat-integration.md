# LibreChat Integration Specification

RoleVault is a native iOS client for LibreChat. This document details the endpoint mapping, authentication flow, character data flow, and conversation synchronization strategy.

---

## 1. Endpoint Mapping

| iOS Feature | LibreChat Endpoint | RoleVault Service | HTTP Method | Payload / Notes |
|-------------|-------------------|-------------------|-------------|-----------------|
| **Login** | `/api/auth/login` | `AuthService.login()` | `POST` | `{ email, password }` → `{ token, refreshToken, user }` |
| **Token Refresh** | `/api/auth/refresh?retry=true` | `TokenInterceptor.attemptRefresh()` | `GET` | `Authorization: Bearer <refreshToken>` → `{ token }` |
| **Logout** | `/api/auth/logout` | `AuthService.logout()` | `POST` | Clears Keychain tokens locally regardless of server response |
| **Send Message** | `/api/ask` | `ChatService.sendMessageStream()` | `POST` | SSE stream (`text/event-stream`). Accepts `conversationId`, `endpoint`, `model`, `instructions`, `agentOptions`, `persona` |
| **List Conversations** | `/api/convos` | `ChatService.fetchConversations()` | `GET` | Returns `[{ id, title, createdAt, updatedAt, endpoint, model }]` |
| **Fetch Messages** | `/api/messages/{conversationId}` | `ChatService.fetchMessages()` | `GET` | Returns `{ messages: [...], conversation: {...} }` |
| **List Agents** | `/api/agents` | `AgentService.fetchAgents()` | `GET` | Returns LibreChat agents (custom GPTs) available to the user |
| **Create Agent** | `/api/agents` | `AgentService.createAgent()` | `POST` | Creates a new LibreChat agent from a RoleVault character |
| **Fetch Config** | `/api/config` | `ConfigService.fetchConfig()` | `GET` | Returns server capabilities, default model, endpoints list |

### Headers
Every authenticated request includes:
```
Content-Type: application/json
Accept: application/json   (or text/event-stream for /api/ask)
Authorization: Bearer <jwt>
```

### Base URL
Configured at runtime via `LibreChatAPI.shared.baseURL` (default: `http://localhost:3080`). Persisted in `UserDefaults` key `librechat_base_url`.

---

## 2. Auth Flow

```
┌─────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   User      │────▶│  AuthService    │────▶│  POST /api/auth │
│ (email/pw)  │     │  .login()       │     │  /login         │
└─────────────┘     └─────────────────┘     └─────────────────┘
                           │
                           ▼
                   ┌─────────────────┐
                   │  Keychain       │
                   │  saveJWT()      │
                   │  saveRefresh()  │
                   └─────────────────┘
                           │
                           ▼
                   ┌─────────────────┐
                   │  isAuthenticated│
                   │  = true         │
                   │  (published)    │
                   └─────────────────┘
                           │
                           ▼
                   ┌─────────────────┐
                   │  All requests   │
                   │  auto-inject    │
                   │  Bearer token   │
                   └─────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  On 401 Unauthorized                                        │
│                                                             │
│  LibreChatAPI.request() ──▶ TokenInterceptor                │
│                                    │                        │
│                                    ▼                        │
│                           GET /api/auth/refresh             │
│                           Authorization: Bearer <refresh>   │
│                                    │                        │
│                           ┌────────┴────────┐               │
│                           ▼                 ▼               │
│                       Success (200)      Failure (401/500)  │
│                           │                 │               │
│                           ▼                 ▼               │
│                    Save new JWT        Clear tokens           │
│                    Retry request       isAuthenticated = false│
│                    Return data         Throw .unauthorized    │
└─────────────────────────────────────────────────────────────┘
```

### Token Storage
- **JWT** — `KeychainManager.saveJWT(_:)` under service `"com.rolevault.jwt"`
- **Refresh Token** — `KeychainManager.saveRefreshToken(_:)` under service `"com.rolevault.refresh"`
- Both use `kSecClassGenericPassword` with `kSecAttrAccessibleWhenUnlockedThisDeviceOnly`

### Logout Flow
1. Call `POST /api/auth/logout` (best-effort; failure is ignored)
2. Delete JWT from Keychain
3. Delete refresh token from Keychain
4. Set `AuthService.shared.isAuthenticated = false`
5. SwiftData conversation cache is **not** automatically cleared (can be done manually in Profile)

---

## 3. Character Data Flow

RoleVault characters are stored locally in SwiftData. When a user starts a chat, the character is converted into LibreChat-compatible instructions and sent via `/api/ask`.

```
┌─────────────────┐
│   Character     │  (SwiftData)
│   (local)       │
├─────────────────┤
│ name            │
│ backstory       │
│ responseDirective│
│ keyMemories     │
│ greetingMessage │
│ exampleMessage  │
│ faceDetail      │
│ interactionMode │
│ dynamism        │
│ avatarDescription│
│ libreChatAgentId│
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────────┐
│  Prompt Assembler (in ChatService)          │
│                                             │
│  instructions = """                         │
│  You are {name}.                            │
│  Backstory: {backstory}                     │
│  Personality: {responseDirective}           │
│  Key memories: {keyMemories}                │
│  Greeting: {greetingMessage}                │
│  Example response: {exampleMessage}         │
│  Face detail: {faceDetail}                  │
│  Dynamism: {dynamism}                       │
│  Mode: {interactionMode}                    │
│  """                                        │
└────────┬────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────┐
│  AskRequest                                 │
│  ├── text: "User message"                   │
│  ├── conversationId: "abc-123" (optional)   │
│  ├── endpoint: "agents"                     │
│  ├── model: "gpt-4o"                        │
│  ├── instructions: <assembled prompt>       │
│  ├── agentOptions:                          │
│  │   └── agentId: <libreChatAgentId>        │
│  └── persona:                               │
│      └── name: <active persona name>        │
└────────┬────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────┐
│  POST /api/ask                              │
│  Accept: text/event-stream                  │
│  Body: JSON-encoded AskRequest              │
└─────────────────────────────────────────────┘
```

### Agent Linking
- Each `Character` has an optional `libreChatAgentId: String?`
- If set, `ChatService` sends `agentOptions.agentId` so LibreChat routes the request through that agent
- If nil, the conversation uses the generic `instructions` field with the `agents` endpoint
- `AgentService.createAgent()` can create a LibreChat agent from a RoleVault character and store the returned ID locally

### Persona Injection
- The active `Persona` (selected in **Profile → Personas**) is injected into every `AskRequest` as `persona.name`
- This allows the AI to understand who the user is role-playing as

---

## 4. Conversation Sync Strategy

RoleVault does not maintain a full two-way sync of conversation state. It uses a **fetch-on-demand + local cache** model.

### 4.1 Local Cache (SwiftData)

```swift
// CachedConversation (simplified)
struct CachedConversation {
    let id: String           // LibreChat conversationId
    let title: String
    let endpoint: String?
    let model: String?
    let lastSyncedAt: Date
    let messages: [CachedMessage]
}
```

- Conversations are fetched from `/api/convos` when the user opens the **Chats** tab
- Messages are fetched from `/api/messages/{id}` when a conversation is opened
- Both are stored in SwiftData for offline viewing

### 4.2 Sync Rules

| Action | Local Behavior | Remote Behavior |
|--------|---------------|-----------------|
| **Open Chats tab** | Display cached list | Background fetch `/api/convos`; merge and update SwiftData |
| **Open conversation** | Display cached messages | Fetch `/api/messages/{id}`; append new messages; update `lastSyncedAt` |
| **Send message** | Optimistically append user message; stream assistant response | `POST /api/ask`; on success, update local cache with final message |
| **Delete conversation** | Remove from SwiftData | Call LibreChat DELETE if endpoint exists; otherwise orphan locally |
| **App foreground** | No-op | If `lastSyncedAt > 5 minutes ago`, refresh `/api/convos` |

### 4.3 Conflict Resolution
- **Server wins** for title and metadata updates
- **Local wins** for message ordering within a session (SSE stream is the source of truth)
- If a conversation exists on the server but not locally, it is imported on next fetch
- If a conversation exists locally but not on the server (deleted remotely), it is marked `isArchived = true` rather than deleted, preserving local journal entries and gallery moments

### 4.4 Offline Behavior
- If the device is offline (`APIError.offline`):
  - Cached conversations and messages are still readable
  - New messages are queued in a `PendingMessage` SwiftData entity
  - On next successful `/api/ask`, pending messages are sent in order
  - A small banner indicates "Offline — messages will send when connected"

### 4.5 Rate Limiting & Pagination
- Conversation list is not paginated in the current implementation (LibreChat returns all)
- Message list is fetched in full per conversation; if LibreChat adds pagination, `ChatService.fetchMessages()` will accept `offset` / `limit` parameters
- A 1-second debounce is applied to pull-to-refresh to avoid excessive API calls

---

## 5. Error Mapping

| LibreChat Response | RoleVault `APIError` | UI Behavior |
|-------------------|----------------------|-------------|
| 401 Unauthorized | `.unauthorized` | Trigger login sheet; attempt refresh once |
| 403 Forbidden | `.serverError(403, ...)` | Toast: "Access denied" |
| 404 Not Found | `.notFound` | Toast: "Conversation not found" |
| 422 Validation Error | `.serverError(422, ...)` | Toast with server message |
| 429 Rate Limited | `.serverError(429, ...)` | Toast: "Too many requests. Please wait." |
| 500+ Server Error | `.serverError(code, ...)` | Toast: "Server error. Try again later." |
| Network unreachable | `.offline` | Show offline banner; queue for retry |
| JSON decode failure | `.decodingError` | Fallback to raw text display |
| Invalid URL | `.invalidURL` | Crash-prevention; log to console |
