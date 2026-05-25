# RoleVault Architecture

## 1. Tech Stack

| Layer | Technology |
|-------|------------|
| UI Framework | SwiftUI (iOS 17+) |
| Local Persistence | SwiftData |
| Secure Storage | Keychain (via Security framework) |
| Networking | URLSession + async/await |
| Backend | RoleVault API (FastAPI + PostgreSQL) |
| Build Tool | XcodeGen |
| CI/CD | Fastlane + GitHub Actions |
| Distribution | TestFlight (personal/open-source) |

### Constraints Honored
- **Zero WebView**: All UI is native SwiftUI.
- **Zero third-party UI libraries**: No Alamofire, no SDWebImageSwiftUI, etc.
- **Pure SwiftUI**: No UIKit bridging except for `UIViewRepresentable` where absolutely necessary (not needed here).
- **iOS 17+**: Enables `@Observable`, `SwiftData`, `MeshGradient`, and `scrollTransition`.

---

## 2. SwiftData Schema

### Core Entities

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    Character    │────▶│    Persona      │◄────│  GalleryMoment  │
├─────────────────┤     ├─────────────────┤     ├─────────────────┤
│ id (UUID)       │     │ id (UUID)       │     │ id (UUID)       │
│ name            │     │ name            │     │ conversationId  │
│ backstory       │     │ gender          │     │ imageData       │
│ responseDirective│     │ backstory       │     │ caption         │
│ keyMemories     │     │ avatarData      │     │ createdAt       │
│ exampleMessage  │     │ isActive        │     │ character (ref) │
│ greetingMessage │     └─────────────────┘     └─────────────────┘
│ avatarDescription│
│ faceDetail      │
│ journalEntries  │◄─── JournalEntry[]
│ interactionMode │
│ dynamism        │
│ category        │
│ isFavorite      │
│ createdAt       │
│ updatedAt       │
│ remoteCharacterId│
└─────────────────┘
```

### Relationships
- **Character** 1:N **JournalEntry** (cascade delete)
- **Character** 1:N **GalleryMoment** (nullify delete)
- **Persona** 1:N **Character** (conversations are scoped by persona via runtime injection, not strict DB relation)

### Design Rationale
- SwiftData is used over Core Data for first-class SwiftUI integration, `@Query`, and modern type-safe predicates.
- `remoteCharacterId` links local characters to remote RoleVault API characters for sync.
- `Persona.isActive` determines which user identity is injected into chat context.
- `GalleryMoment.imageData` stores exported chat screenshots/memories locally.

---

## 3. API Client Architecture

### Layered Stack

```
┌─────────────────────────────────────────────┐
│           ViewModel (async/await)           │
├─────────────────────────────────────────────┤
│  AuthService │ ChatService │ AgentService   │
├─────────────────────────────────────────────┤
│         RoleVaultAPI (URLRequest)           │
├─────────────────────────────────────────────┤
│     TokenInterceptor (refresh logic)        │
├─────────────────────────────────────────────┤
│           URLSession (shared)               │
├─────────────────────────────────────────────┤
│         Keychain (JWT storage)              │
└─────────────────────────────────────────────┘
```

### Endpoint Mapping

| Feature | RoleVault Endpoint | Local Layer |
|---------|-------------------|-------------|
| Register | `POST /api/auth/register` | `AuthService.register()` |
| Login | `POST /api/auth/login` | `AuthService.login()` |
| Refresh | `POST /api/auth/refresh` | `TokenInterceptor` auto-refresh |
| Logout | `POST /api/auth/logout` | `AuthService.logout()` |
| Apple Sign In | `POST /api/auth/apple` | `AuthService.appleAuth()` |
| Magic Link | `POST /api/auth/magic-link/request` + `POST /api/auth/magic-link/verify` | `AuthService.requestMagicLink()` / `verifyMagicLink()` |
| Chat | `POST /api/chat` | `ChatService.sendMessage()` |
| List Convos | `GET /api/conversations` | `ChatService.fetchConversations()` |
| Messages | `GET /api/conversations/{id}/messages` | `ChatService.fetchMessages()` |
| List Characters | `GET /api/characters` | `CharacterStore.fetchCharacters()` |
| Create Character | `POST /api/characters` | `CharacterStore.createCharacter()` |
| Config | `GET /api/config` | `ConfigService.fetchConfig()` |

### Auth Flow
1. User submits email/password → `AuthService.login()` → stores JWT in Keychain.
2. Every outgoing request reads JWT from Keychain via `TokenInterceptor`.
3. On 401, interceptor calls `POST /api/auth/refresh`, updates Keychain, and retries original request once.
4. Logout clears Keychain and SwiftData conversation cache.

### Error Handling
- Network layer emits strongly-typed `APIError`:
  - `.unauthorized` → triggers login sheet
  - `.serverError(statusCode, message)` → toast
  - `.decodingError` → fallback to raw text
  - `.offline` → queue for retry

---

## 4. Project File Tree

```
ios/
├── ARCHITECTURE.md
├── project.yml                 # XcodeGen specification
├── Gemfile                     # Ruby dependencies (fastlane)
├── Gemfile.lock
├── fastlane/
│   ├── Appfile
│   ├── Fastfile                # beta lane → TestFlight
│   └── Matchfile               # optional: code signing
├── build.sh                    # local convenience script
└── RoleVault/
    ├── Assets.xcassets/
    ├── Preview Content/
    ├── Info.plist
    ├── RoleVault.entitlements
    ├── App/
    │   ├── RoleVaultApp.swift
    │   ├── AppState.swift
    │   └── DependencyContainer.swift
    ├── Data/
    │   ├── Models/
    │   │   ├── Character.swift
    │   │   ├── Persona.swift
    │   │   ├── GalleryMoment.swift
    │   │   ├── JournalEntry.swift
    │   │   └── Conversation.swift
    │   ├── KeychainManager.swift
    │   └── SwiftDataContainer.swift
    ├── API/
    │   ├── Models/
    │   │   ├── AuthModels.swift
    │   │   ├── ChatModels.swift
    │   │   ├── AgentModels.swift
    │   │   └── ConfigModels.swift
    │   ├── APIError.swift
    │   ├── RoleVaultAPI.swift
    │   ├── TokenInterceptor.swift
    │   ├── AuthService.swift
    │   ├── ChatService.swift
    │   ├── AgentService.swift
    │   └── ConfigService.swift
    ├── Views/
    │   ├── Common/
    │   │   ├── AuroraBackground.swift
    │   │   ├── LiquidGlassPanel.swift
    │   │   ├── GlassNavigationBar.swift
    │   │   ├── CategoryPill.swift
    │   │   ├── HapticEngine.swift
    │   │   └── DynamicIslandBridge.swift
    │   ├── Home/
    │   │   ├── HomeView.swift
    │   │   ├── CharacterCard.swift
    │   │   └── CategoryFilterBar.swift
    │   ├── Chats/
    │   │   ├── ChatsGalleryView.swift
    │   │   ├── ChatDetailView.swift
    │   │   ├── MessageBubble.swift
    │   │   ├── CharacterHeader.swift
    │   │   ├── MessageInputBar.swift
    │   │   ├── EditCharacterSheet.swift
    │   │   └── GalleryGrid.swift
    │   ├── Create/
    │   │   └── CreateCharacterView.swift
    │   ├── Activity/
    │   │   └── ActivityCenterView.swift
    │   └── Profile/
    │       ├── ProfileView.swift
    │       ├── SettingsView.swift
    │       ├── BackendConfigView.swift
    │       └── PersonaManagerView.swift
    └── ViewModels/
        ├── HomeViewModel.swift
        ├── ChatViewModel.swift
        ├── CreateCharacterViewModel.swift
        └── ProfileViewModel.swift
```

---

## 5. TestFlight Build Pipeline

### Local Build (Fastlane)
```bash
bundle install          # install fastlane
xcodegen generate       # generate .xcodeproj
fastlane beta           # build, sign, upload to TestFlight
```

### CI/CD (GitHub Actions)
```yaml
# .github/workflows/beta.yml
on:
  push:
    tags: ['v*']
jobs:
  build:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      - run: bundle install
      - run: xcodegen generate
      - run: fastlane beta
        env:
          APP_STORE_CONNECT_API_KEY: ${{ secrets.APP_STORE_CONNECT_API_KEY }}
```

### Required Secrets
- `APP_STORE_CONNECT_API_KEY` (JSON content from App Store Connect API Keys)
- `MATCH_PASSWORD` (if using match for code signing)

### Signing Strategy
- **Personal/opensource TestFlight**: Use `fastlane match development` + `fastlane match appstore` in a private repo, or manual signing with certificates exported from Xcode.
- For a single developer, `fastlane cert` + `fastlane sigh` (non-match) is simpler.

---

## 6. Visual System Tokens

| Token | SwiftUI Implementation |
|-------|------------------------|
| Aurora Background | `MeshGradient` with `TimelineView` animating control points |
| Liquid Glass | `.background(.ultraThinMaterial)` + `RoundedRectangle` clip + inner shadow |
| Card Float | `.shadow(color: .black.opacity(0.15), radius: 12, x: 0, y: 6)` |
| Spring Transition | `.spring(response: 0.4, dampingFraction: 0.8)` |
| Haptic | `UIImpactFeedbackGenerator` wrapped in `HapticEngine` |
| Selection Glow | `.overlay` with animating `RoundedRectangle(stroke)` using `linearGradient` |

---

## 7. Dynamic Island Integration

- When a chat is active, `LiveActivity` (iOS 16.1+) or `ActivityKit` widget displays:
  - Character avatar (circular clipped)
  - Typing indicator (animated dots)
  - Tap-to-return deep link (`rolevault://chat/{conversationId}`)
- Deep link handled in `RoleVaultApp` via `onOpenURL`.
