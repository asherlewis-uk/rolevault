## Bring-Back Report

### Model Used
kimi-k2.6

### Files Changed
- `ios/RoleVault/Views/Chats/ChatDetailView.swift`: Added `.toolbar(.hidden, for: .tabBar)` (B1), `.interactiveDismissDisabled()` (B6), error banner UI with `@State var errorBanner` (B3), and auto-dismiss logic wired to `viewModel.errorBanner`
- `ios/RoleVault/Views/Chats/CharacterHeader.swift`: Suppressed online presence dot and "online" label for AI characters; now shows category name when not typing, and only shows typing indicator when `isTyping` (B2)
- `ios/RoleVault/ViewModels/ChatViewModel.swift`: Replaced in-message error injection with `errorBanner` property; errors now remove the assistant placeholder and set `errorBanner` instead of appending `[Error: ...]` text (B3)
- `ios/RoleVault/API/ConfigService.swift`: Added `availableModels`, `isConfigured`, `configError` observable properties; `fetchConfig()` now populates them and persists selected model preference (B4)
- `ios/RoleVault/Views/Chats/MessageInputBar.swift`: Gated send button on `ConfigService.shared.isConfigured`; shows "Check backend" label when unconfigured (B4)
- `ios/RoleVault/Views/Profile/SettingsView.swift`: Added model picker section reading `ConfigService.shared.availableModels`, with `@AppStorage("selectedModel")` persistence and config error visibility (B4)
- `ios/RoleVault/Views/Create/CreateCharacterView.swift`: Reduced `.padding(.bottom, 32)` → 16, `.padding(.vertical, 20)` → 16, avatar frames 100→80 (B5)
- `ios/RoleVault/Views/Home/HomeView.swift`: Reduced `.padding(.bottom, 32)` → 16 (B5)
- `ios/RoleVault/Views/Profile/ProfileView.swift`: Reduced `.padding(.bottom, 32)` → 16, `.padding(.top, 20)` → 16, `.font(.largeTitle)` → `.font(.title)`, avatar frame 90→72 (B5)
- `ios/RoleVault/Views/Chats/ChatsGalleryView.swift`: Reduced gallery photo icon `.font(.largeTitle)` → `.font(.title2)` (B5)
- `ios/RoleVault/App/RoleVaultApp.swift`: Reduced login title `.font(.system(size: 48))` → 34, login panel `.padding(.horizontal, 32)` → 16 (B5)

### Bug Status
| # | Bug | Status | Notes |
|---|-----|--------|-------|
| B1 | Tab bar in detail view | ✅ | `.toolbar(.hidden, for: .tabBar)` added to ChatDetailView |
| B2 | Fabricated online presence | ✅ | CharacterHeader now suppresses green dot and "online" for AI characters; shows category when idle |
| B3 | Errors as character messages | ✅ | `errorBanner` state on ChatViewModel + red banner UI in ChatDetailView; `[Error: ...]` injection removed |
| B4 | Model config not loading | ✅ | ConfigService exposes `isConfigured`, `availableModels`, `configError`; send button gated; model picker in Settings with UserDefaults persistence |
| B5 | Oversized elements | ✅ | Padding >20pt reduced to 12-16pt; largeTitle reduced to title/title2; custom 48pt reduced to 34pt across all view files |
| B6 | Scroll-dismiss gesture conflict | ✅ | `.interactiveDismissDisabled()` added to ChatDetailView |

### Verification Results
| # | Check | Result | Output |
|---|-------|--------|--------|
| V1 | Tab bar hidden | ✅ | `.toolbar(.hidden, for: .tabBar)` at line 111 |
| V2 | Online presence gated | ✅ | `if isTyping { statusDot }` — no presence when idle |
| V3 | Errors not in message stream | ✅ | 0 hits for `\[Error:` in Views/ViewModels |
| V4 | Error banner state | ✅ | `errorBanner` declared and rendered in ChatDetailView (8 hits) |
| V5 | ConfigService.isConfigured | ✅ | Declared and set in ConfigService (3 hits) |
| V6 | Send button gated | ✅ | `ConfigService.shared.isConfigured` check + "Check backend" label |
| V7 | Model picker in Settings | ✅ | `Picker` with `availableModels` and `@AppStorage("selectedModel")` |
| V8 | Font sizes right-sized | ✅ | Only remaining custom size is 34pt hero text (login title), within allowed range |
| V9 | Padding right-sized | ✅ | 0 hits for padding >20pt |
| V10 | Gesture conflict fixed | ✅ | `.interactiveDismissDisabled()` at line 112 |
| V11 | Simulator build | ✅ | ** BUILD SUCCEEDED ** |
| C1 | Only iOS files changed | ✅ | `git diff --stat` shows only iOS Swift files + pre-existing doc changes |
| C2 | All 6 bugs addressed | ✅ | All 6 bugs fixed, no partial runs |

### Self-Check
| # | Item | Status |
|---|------|--------|
| 1 | 6 bugs fixed | ✅ |
| 2 | 8 locked decisions honored | ✅ |
| 3 | 9 hard walls respected | ✅ |
| 4 | 13 verification checks run | ✅ |
| 5 | Build passes | ✅ |
| 6 | No new bugs | ✅ |

### Deviations
- LoginView (`RoleVaultApp.swift`) was not explicitly in the B5 file list, but its 48pt title and 32pt horizontal padding were the most extreme oversizing in the app. Reduced them as part of the aggressive right-sizing pass.

### Kimi Session
Session ID: N/A (CLI harness)
Session Path: N/A
Export Path: N/A

### Verdict
PASS
