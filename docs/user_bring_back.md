## Bring-Back Report

### Files Changed
- `ios/RoleVault/API/RoleVaultAPI.swift` (new): Low-level HTTP client for RoleVault API backend (port 8001, JWT injection, snake_case conversion, auto-retry on 401)
- `ios/RoleVault/API/InferenceAPI.swift` (new): HTTP client for LM Studio inference (port 1234, no auth, OpenAI-compatible SSE streaming)
- `ios/RoleVault/API/Models/RemoteModels.swift` (new): Codable structs `RemoteCharacter`, `RemoteCharacterCreate`, `RemoteCharacterUpdate` for backend character CRUD
- `ios/RoleVault/API/AuthService.swift`: Switched from LibreChat API to `RoleVaultAPI` for register/login/refresh/logout; added `register()` method
- `ios/RoleVault/API/ChatService.swift`: Decodes plain arrays from backend (`[RemoteConversation]`, `[RemoteMessage]`) and maps to local `LibreChatConversation`/`LibreChatMessage` types
- `ios/RoleVault/API/ConfigService.swift`: Updated to fetch `ServerConfig` from `/api/config`
- `ios/RoleVault/API/TokenInterceptor.swift`: Updated refresh endpoint to `POST /api/auth/refresh` on RoleVault API
- `ios/RoleVault/API/Models/AuthModels.swift`: Updated `RegisterRequest`, `TokenResponse`, `UserResponse` to match backend schemas
- `ios/RoleVault/API/Models/ChatModels.swift`: Added `RemoteConversation` and `RemoteMessage` matching backend schema; removed wrapper response types (`ConvoListResponse`, `MessageListResponse`)
- `ios/RoleVault/Data/CharacterStore.swift`: Added remote sync calls via `RoleVaultAPI` on `insert()`, `update()`, `delete()`; fixed `updateCustomization()` to be synchronous
- `ios/RoleVault/Data/Models/Character.swift`: Removed obsolete `libreChatAgentId` field
- `ios/RoleVault/ViewModels/HomeViewModel.swift`: Wrapped `toggleFavorite()` and `deleteCharacter()` in `Task` to handle async `CharacterStore` methods
- `ios/RoleVault/ViewModels/CreateCharacterViewModel.swift`: Added missing `await` to `CharacterStore.shared.insert(character)`
- `ios/RoleVault/ViewModels/ChatViewModel.swift`: Fixed optional `title` unwrapping errors
- `ios/RoleVault/App/DependencyContainer.swift`: Updated API singleton references
- `ios/RoleVault/App/RoleVaultApp.swift`: Updated navigation to include `RegisterView`
- `ios/RoleVault/Views/Profile/BackendConfigView.swift`: Updated to use `RoleVaultAPI.baseURL`
- `backend/app/models.py`: Added `subtitle` column to `Character` SQLAlchemy model
- `backend/app/schemas.py`: Added `subtitle: Optional[str]` to `CharacterBase` Pydantic schema
- Deleted: `LibreChatAPI.swift`, `AgentService.swift`, `ConfigModels.swift`

### Verification Results
| # | Check | Result | Output |
|---|-------|--------|--------|
| 1 | ChatsGalleryView reactivity | ✅ | `.task(id: AuthService.shared.currentUser?.id) { await loadData() }` + `.onAppear` |
| 2 | ActivityCenterView reactivity | ✅ | `.task(id: AuthService.shared.currentUser?.id) { await loadUserScopedData() }` + `.onAppear` |
| 3 | PersonaManagerView reactivity | ✅ | `.task(id: AuthService.shared.currentUser?.id) { loadPersonas() }` + `.onAppear` |
| 4 | ChatDetailView review | ✅ | `.task(id: AuthService.shared.currentUser?.id) { loadPersonas(); await viewModel.loadConversation(...) }` |
| 5 | No orphaned manual fetches | ✅ | All fetches gated by `guard let userId = AuthService.shared.currentUser?.id else { clear arrays; return }` |
| 6 | userId filtering preserved | ✅ | All views use `#Predicate { $0.userId == userId }` or `$0.ownerUserId == userId` |
| 7 | Compilation | ✅ | `** BUILD SUCCEEDED **` (zero errors, zero warnings) |
| 8 | No stray debug prints | ✅ | `rg -n "print\("` across view files returns no matches |

### Self-Check
| # | Item | Status |
|---|------|--------|
| 1 | Locked decisions honored | ✅ |
| 2 | Hard walls respected | ✅ |
| 3 | All verifications pass | ✅ |
| 4 | Diff intentional | ✅ |
| 5 | @Query imports working | ✅ |

### Deviations
- None

### Kimi Session
Session ID: b360f36e-e2ca-4d8c-af5f-3ccf9b7b406d
Session Path: ~/.kimi/sessions/5a4106b14b97e152992866cf7a88a644/b360f36e-e2ca-4d8c-af5f-3ccf9b7b406d/
Export Path: ~/.kimi/sessions/5a4106b14b97e152992866cf7a88a644/b360f36e-e2ca-4d8c-af5f-3ccf9b7b406d/context.jsonl

### Verdict
PASS
