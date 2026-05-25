# RoleVault

RoleVault is a native iOS app for role-play character management, persona switching, and conversation sync. Built with SwiftUI, SwiftData, and zero third-party UI dependencies.

## Overview

- **Native iOS 18+** — SwiftUI with MeshGradient aurora backgrounds, liquid-glass panels, and spring-driven transitions
- **Character Management** — Create, edit, and organize role-play characters with backstories, directives, and avatars
- **Persona System** — Switch user identities per conversation so the AI knows who is speaking
- **Live Chat** — Streaming SSE conversations against the RoleVault API backend
- **Conversation Sync** — Pull conversation history and messages from the RoleVault API; keep local SwiftData cache in sync
- **TestFlight Distribution** — Push to `main` and GitHub Actions builds, signs, and uploads automatically

## Prerequisites

- **Mac** running macOS Sonoma 14.5+ (for Xcode 16)
- **Xcode 16+** (download from Mac App Store or Apple Developer Portal)
- **Apple Developer Account** (paid) — required for TestFlight distribution and code signing
- **Swiftly** — Swift toolchain manager; installed automatically by `./setup-swiftly.sh`
- **Running RoleVault API backend** — default target is `https://backend.asherlewis.online`; can be changed in-app

## Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/rolevault.git
   cd rolevault
   ```

2. **Install Swift toolchain**
   ```bash
   ./setup-swiftly.sh
   source ~/.zshrc   # or ~/.bash_profile
   ```

3. **Generate the Xcode project**
   ```bash
   cd ios
   xcodegen generate
   ```

4. **Open in Xcode**
   ```bash
   open RoleVault.xcodeproj
   ```

5. **Set your Development Team**
   - In Xcode, select the **RoleVault** target → **Signing & Capabilities**
   - Choose your **Team** from the dropdown
   - Update the **Bundle Identifier** if needed (default: `com.rolevault.app`)

6. **Build and run**
   - Select a simulator or connected iPhone
   - Press **Cmd+R**

### Local build script (optional)
```bash
cd ios
./build.sh
```

## Backend Integration

RoleVault connects to the RoleVault API backend. There is no bundled backend.

1. **Enter backend URL**
   - Open the app → **Profile** → **Backend**
   - Enter your RoleVault API URL (default: `https://backend.asherlewis.online`)

2. **Log in**
   - Use your RoleVault account credentials (email + password, Apple Sign In, or magic link)
   - JWT and refresh tokens are stored in the iOS Keychain

3. **Start chatting**
   - Select a character → tap **Chat**
   - Messages stream in real time via SSE

For endpoint mapping, auth flow details, and sync strategy, see [`backend-integration.md`](backend-integration.md).

## TestFlight Distribution

### 1. Configure GitHub Secrets

Go to **Settings → Secrets and variables → Actions** and add:

| Secret | Description |
|--------|-------------|
| `APP_STORE_CONNECT_API_KEY` | JSON content of your App Store Connect API Key (Key ID, Issuer ID, private key) |
| `MATCH_GIT_URL` | HTTPS or SSH URL of the private Git repo where Match stores certificates/profiles |
| `MATCH_PASSWORD` | Passphrase for Fastlane Match encryption |
| `APPLE_ID` | Your Apple ID email |
| `TEAM_ID` | Apple Developer Team ID |
| `ITC_TEAM_ID` | App Store Connect Team ID (if different) |

### 2. Push to main

```bash
git checkout main
git merge your-feature-branch
git push origin main
```

GitHub Actions will:
- Run `setup-swiftly.sh` to install Swift 6.0
- Verify Xcode and `swift --version`
- Install Ruby gems via Bundler
- Generate the Xcode project with `xcodegen`
- Run `fastlane beta` to increment build number, archive, sign, and upload to TestFlight

### 3. Add testers in App Store Connect

- Open [App Store Connect](https://appstoreconnect.apple.com)
- Go to **TestFlight → RoleVault → Internal Testing**
- Add testers; they will receive an email invite once the build finishes processing

## Project Structure

```
rolevault/
├── ios/
│   ├── RoleVault/              # SwiftUI app source
│   │   ├── App/                # App entry point, state, DI
│   │   ├── API/                # Networking, services, models
│   │   ├── Data/               # SwiftData models, Keychain, stores
│   │   └── Views/              # SwiftUI views (Home, Chats, Create, Profile)
│   ├── Shared/                 # Widget / LiveActivity shared code
│   ├── RoleVaultTests/         # Unit tests
│   ├── RoleVaultUITests/       # UI tests
│   ├── RoleVaultWidgets/       # Widget extension
│   ├── fastlane/               # Fastlane lanes and config
│   ├── project.yml             # XcodeGen specification
│   └── Gemfile                 # Ruby dependencies
├── setup-swiftly.sh            # Swift toolchain bootstrap
├── backend-integration.md      # Backend integration spec
└── README.md                   # This file
```

## Troubleshooting

### CORS errors when connecting to the backend
The RoleVault API must be configured to allow your iOS origin. Set the `CORS_ORIGINS` environment variable:
```bash
CORS_ORIGINS="app://*,http://localhost*,capacitor://*"
```
For production, add your domain or use `*` only for testing.

### HTTPS required for physical devices
iOS requires HTTPS for non-localhost network requests. The production backend (`https://backend.asherlewis.online`) already uses HTTPS. For local development:
- Run the RoleVault API behind an HTTPS reverse proxy (Nginx, Caddy, Traefik)
- Use a tunnel like [ngrok](https://ngrok.com) for local testing
- Add an ATS exception in `Info.plist` (not recommended for production)

### Local network permission
When using an IP address on your local network, iOS may prompt for **Local Network** access. Accept the prompt. If denied, go to **Settings → Privacy & Security → Local Network → RoleVault** and enable it.

### Token refresh loop
If you see repeated 401s followed by logout:
- Verify the `/api/auth/refresh` endpoint is reachable
- Check that the refresh token has not expired
- Clear Keychain data: delete and reinstall the app, or use **Profile → Logout**

### Fastlane signing failures
- Ensure `MATCH_PASSWORD` and `APP_STORE_CONNECT_API_KEY` are set in GitHub Secrets
- Verify your Apple Developer account has an active paid membership
- Check that the bundle identifier (`com.rolevault.app`) is registered in App Store Connect

### xcodegen not found
```bash
brew install xcodegen
```

### Swift version mismatch
The project targets Swift 5.9 but the toolchain setup installs Swift 6.0. Xcode 16 bundles Swift 6.0 by default, which is backward-compatible. If you see warnings, run:
```bash
swiftly use 6.0
swift --version
```

## Tech Stack

- **SwiftUI** (iOS 18+) — declarative UI, `@Observable`, `MeshGradient`
- **SwiftData** — local persistence with `@Query` and type-safe predicates
- **Keychain** — JWT and refresh token storage via Security framework
- **URLSession + async/await** — networking, SSE streaming
- **XcodeGen** — project generation from `project.yml`
- **Fastlane** — TestFlight automation
- **GitHub Actions** — CI/CD on `macos-latest`

## License

MIT — see LICENSE for details.
