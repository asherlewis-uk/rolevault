# RoleVault — Agent Guide

RoleVault is a native iOS client for [LibreChat](https://librechat.ai). It brings role-play character management, persona switching, and live conversation sync to iPhone. There is no bundled backend — the app connects to a user-provided LibreChat instance.

## Technology Stack

- **Platform**: iOS 18.0+ (portrait only, iPhone only — `TARGETED_DEVICE_FAMILY: 1`)
- **UI Framework**: SwiftUI (100% native, zero WebView, zero third-party UI libraries)
- **State Observation**: `@Observable` (iOS 17+ model) — not the legacy `ObservableObject`
- **Local Persistence**: SwiftData (not Core Data) with `@Query` and type-safe `FetchDescriptor`
- **Networking**: `URLSession` + `async/await` + `URLSession.AsyncBytes` for SSE streaming
- **Secure Storage**: Keychain via the `Security` framework (`kSecClassGenericPassword`)
- **Project Generation**: XcodeGen (`project.yml`)
- **CI/CD**: GitHub Actions + Fastlane (`match` for signing, TestFlight upload)
- **Toolchain**: Swift 6.0 (managed by Swiftly via `setup-swiftly.sh`)
- **Ruby**: Bundler + Fastlane (~> 2.219), CocoaPods listed but unused

## Repository Layout

```
rolevault/
├── ios/
│   ├── RoleVault/                  # Main app source
│   │   ├── App/                    # App entry point, state, DI container
│   │   ├── API/                    # Networking layer (services, models, error types)
│   │   ├── Data/                   # SwiftData models, Keychain, stores
│   │   ├── Views/                  # SwiftUI views grouped by screen
│   │   ├── ViewModels/             # @Observable view models
│   │   ├── Assets.xcassets/
│   │   ├── Preview Content/
│   │   ├── Info.plist
│   │   └── RoleVault.entitlements
│   ├── Shared/                     # Code shared with the widget extension
│   ├── RoleVaultTests/             # Unit tests (currently minimal)
│   ├── RoleVaultUITests/           # UI tests (currently minimal)
│   ├── RoleVaultWidgets/           # Live Activity widget extension
│   ├── fastlane/                   # Appfile, Fastfile, Matchfile
│   ├── project.yml                 # XcodeGen specification
│   ├── Gemfile                     # Ruby dependencies
│   ├── build.sh                    # Local debug build convenience script
│   ├── ARCHITECTURE.md             # Original architecture notes
│   └── README.md                   # iOS-specific quick start
├── setup-swiftly.sh                # Bootstrap Swift 6.0 toolchain
├── librechat-integration.md        # Full backend API mapping and sync strategy
├── README.md                       # Project-level documentation
└── .github/workflows/beta.yml      # CI: build + TestFlight on push to main
```

## Build and Run Commands

### Prerequisites
- macOS Sonoma 14.5+ with **Xcode 16+** (the project sets `xcodeVersion: '26.0'` and CI selects `Xcode_26.3.app`)
- Apple Developer account (paid) for device testing and TestFlight
- A running LibreChat backend (default URL: `http://localhost:3080`)

### Local Development

```bash
# 1. Install Swift toolchain (one-time)
./setup-swiftly.sh
source ~/.zshrc

# 2. Generate Xcode project
cd ios
xcodegen generate

# 3. Open in Xcode
open RoleVault.xcodeproj

# 4. Set your signing team in Xcode (RoleVault target → Signing & Capabilities)
#    Default bundle ID: com.rolevault.app
#    Default team: S58MT4ATKM (change to your own)

# 5. Build and run (Debug)
Cmd + R
```

### Local Build Script
```bash
cd ios
./build.sh        # Runs bundle install, xcodegen generate, and fastlane build_debug
```

### TestFlight Distribution
```bash
cd ios
bundle install
bundle exec fastlane beta
```

CI triggers automatically on every push to `main` via `.github/workflows/beta.yml`.

## Testing

The project has two test bundles configured in the Xcode scheme with code coverage enabled:

- `RoleVaultTests` — Unit test bundle (`@testable import RoleVault`)
- `RoleVaultUITests` — UI test bundle using `XCUIApplication`

**Current state**: Tests are minimal placeholders. The unit test file contains a single `testExample()` assertion (`1 + 1 == 2`). The UI test file contains a single launch test. There is no mocking infrastructure for network requests yet.

### Running Tests
```bash
cd ios
xcodegen generate
xcodebuild test -scheme RoleVault -destination 'platform=iOS Simulator,name=iPhone 16'
```

## Code Organization and Architecture

### Layered Architecture
```
View (SwiftUI)
    ↓
ViewModel (@Observable)
    ↓
Service (AuthService, ChatService, AgentService, ConfigService)
    ↓
LibreChatAPI (URLRequest builder + URLSession executor)
    ↓
TokenInterceptor (401 refresh) / KeychainManager (JWT storage)
```

### Dependency Injection
The app uses lightweight static singletons, not a protocol-based DI container:
- `LibreChatAPI.shared`
- `AuthService.shared`
- `ChatService.shared`
- `AgentService.shared`
- `ConfigService.shared`
- `CharacterStore.shared`
- `SwiftDataContainer.shared`
- `KeychainManager.shared`
- `TokenInterceptor.shared`

`DependencyContainer` is an enum that simply aliases these shared instances. Changing to protocol injection would require updating all ViewModels.

### SwiftData Schema
Six `@Model` classes are registered in `SwiftDataContainer`:
- `Character` — role-play characters with personality fields, categories, journal entries, gallery moments
- `Persona` — user identity profiles; one can be `isActive` at a time
- `Conversation` — local cache of remote LibreChat conversations (`remoteId` maps to server ID)
- `MessageWrapper` — local cache of chat messages
- `JournalEntry` — trigger-keyphrase based memory entries linked to a character
- `GalleryMoment` — saved chat excerpts / screenshots

**Delete rules**: `JournalEntry` uses `.cascade` on Character; `GalleryMoment` uses `.nullify`.
**CloudKit**: explicitly disabled (`cloudKitDatabase: .none`).

### Networking Patterns
- `LibreChatAPI` builds `URLRequest` objects and executes via `URLSession`.
- JSON encode/decode uses `.convertToSnakeCase` / `.convertFromSnakeCase` strategies.
- Authenticated requests auto-inject `Authorization: Bearer <jwt>` from Keychain.
- On `401 Unauthorized`, `TokenInterceptor.attemptRefresh()` is called automatically once per request.
- Streaming chat uses `URLSession.AsyncBytes.lines` to parse SSE (`text/event-stream`).
- `APIError` is a strongly typed enum covering offline, unauthorized, decoding, and server errors.

### Auth Flow
1. `AuthService.login(email:password)` → `POST /api/auth/login`
2. Save JWT + refresh token to Keychain (`kSecAttrAccessibleWhenUnlockedThisDeviceOnly`)
3. All requests read JWT from Keychain via `LibreChatAPI.buildRequest`
4. On 401 → `TokenInterceptor` calls `GET /api/auth/refresh?retry=true` with refresh token
5. On refresh failure → clears Keychain, sets `AuthService.isAuthenticated = false`
6. Logout calls `POST /api/auth/logout` (best-effort), then deletes Keychain tokens

## Key Conventions

### Swift Style
- **4-space indentation**
- `// MARK: - Section` headers to group related code
- `final class` for singletons and view models; `@Observable` for publishable state
- `async/await` throughout; no completion handlers
- `@MainActor` used on view model methods that touch SwiftData contexts or published arrays
- Enums for categorization (`CharacterCategory`, `InteractionMode`, `SyncStatus`) conform to `Codable, CaseIterable`
- Validation constants are `static let` on model classes (e.g., `Character.backstoryMaxLength = 2500`)

### UI Patterns
- Every major screen wraps content in `ZStack { AuroraBackground(); ... }`
- `LiquidGlassPanel` / `.liquidGlass()` modifier provides the standard glassmorphism card style (`.ultraThinMaterial`, continuous rounded rect, subtle white stroke, soft shadow)
- `HapticEngine` enum wraps `UIImpactFeedbackGenerator`, `UISelectionFeedbackGenerator`, and `UINotificationFeedbackGenerator`
- Spring animations are standardized: `.spring(response: 0.4, dampingFraction: 0.8)` for auth transitions; `.spring(response: 0.3, dampingFraction: 0.7)` for category pills
- `ScrollView` + `scrollTransition` for 3D card effects on the home screen
- `MeshGradient` + `TimelineView` powers the animated aurora background with time-of-day palettes

### Character / Prompt Building
- `Character.formattedSystemPrompt` assembles all personality fields into a single block of text sent to LibreChat as `instructions`
- `Persona.formattedUserContext` injects user identity into the same prompt stack
- `JournalEntry.isTriggered(by:)` checks if a user message contains the trigger keyphrase (case-insensitive) and injects the memory content into the prompt
- `AgentService` can create/update/delete LibreChat agents from a `Character`

### Data Import / Export
- `CharacterStore` supports **Tavern V2** character import/export via PNG metadata (`chara` key in `kCGImagePropertyPNGDictionary`)
- Export generates a placeholder PNG with embedded JSON if no image is provided

## Security Considerations

- **No hardcoded secrets** — API keys and tokens live in Keychain only.
- **Keychain accessibility**: `kSecAttrAccessibleWhenUnlockedThisDeviceOnly` (not iCloud-synced).
- **No certificate pinning** — standard TLS via URLSession.
- **Backend URL** is user-configurable at runtime and persisted in `UserDefaults` (key: `librechat_base_url`). Default is `http://localhost:3080`.
- **Camera / Photos**: `Info.plist` declares usage descriptions for avatar selection only.
- **Push notifications**: `aps-environment` entitlement is set to `development`.
- **ATS**: No arbitrary-load exceptions; physical devices require HTTPS for non-localhost backends.

## CI/CD and Signing

- **GitHub Actions workflow**: `.github/workflows/beta.yml` runs on `push: branches: [main]` and on `workflow_dispatch`.
- **Runner**: `macos-latest` with a 45-minute timeout.
- **Xcode selection**: `sudo xcode-select -s /Applications/Xcode_26.3.app`
- **Ruby cache**: caches `ios/vendor/bundle` keyed on `Gemfile.lock`.
- **Match SSH**: sets up `ssh-agent` with `MATCH_SSH_PRIVATE_KEY` secret for private certificate repo access.
- **Fastlane lane `beta`**:
  1. `setup_ci(force: true)`
  2. `increment_build_number`
  3. `match(type: "appstore", readonly: true)`
  4. `build_app(scheme: "RoleVault", export_method: "app-store")`
  5. `upload_to_testflight(skip_waiting_for_build_processing: true)`

### Required GitHub Secrets
| Secret | Purpose |
|--------|---------|
| `APP_STORE_CONNECT_API_KEY` | App Store Connect API Key JSON |
| `MATCH_GIT_URL` | Private git repo for Match certificates/profiles |
| `MATCH_PASSWORD` | Match encryption passphrase |
| `MATCH_SSH_PRIVATE_KEY` | SSH key for Match repo access |
| `APPLE_ID` | Apple ID email |
| `TEAM_ID` | Apple Developer Team ID |
| `ITC_TEAM_ID` | App Store Connect Team ID |

## Known Gaps and Notes

- **Test coverage is minimal** — only placeholder tests exist. Any new feature should include unit tests for service logic and view model state transitions.
- **No pagination** — conversation and message lists are fetched in full. If the backend grows large, `ChatService.fetchMessages()` will need `offset`/`limit` parameters.
- **No background sync** — offline messages are not automatically retried on reconnect (the spec describes a `PendingMessage` queue, but it is not implemented in the current source).
- **Widget extension** (`RoleVaultWidgets`) only contains a Live Activity; there are no home-screen widgets yet.
- **CocoaPods** is listed in the `Gemfile` but the project does not use any Pods.
- **Swift version mismatch**: `project.yml` sets `SWIFT_VERSION: '5.9'` while `setup-swiftly.sh` installs Swift 6.0. Xcode 16 bundles Swift 6.0, which is backward-compatible. No source changes are required.
