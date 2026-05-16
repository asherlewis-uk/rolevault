## Bring-Back Report

### Model Used
kimi k2.6

### Files Changed
- `ios/project.yml`: Moved `configs:` from target root into `settings:` so xcodegen 2.45.4 emits per-configuration build settings (Release signing) into the generated pbxproj
- `ios/RoleVault.xcodeproj/project.pbxproj`: Regenerated with correct Release signing settings (Manual, Apple Distribution, match AppStore profile)
- `ios/RoleVault/API/ChatService.swift`: Changed `defaultModel` fallback from `"gpt-4o"` to `""`; added empty-model guards in `sendMessageStream` and `sendMessage`
- `ios/RoleVault/App/RoleVaultApp.swift`: Added `ConfigService.shared.fetchConfig()` call in `AppDelegate.didFinishLaunchingWithOptions`

### CI Diagnosis
- What the generated pbxproj showed for Release signing settings before the fix:
  ```
  (no CODE_SIGN_STYLE = Manual, no PROVISIONING_PROFILE_SPECIFIER, no CODE_SIGN_IDENTITY = Apple Distribution)
  ```
- Root cause identified: `configs:` was placed at the target root level in `project.yml`. xcodegen 2.45.4 ignores `configs` at target root and only emits per-configuration settings when `configs` is nested under `settings:`.
- Fix applied: Moved `configs:` under `settings:` in the `RoleVault` target. Regenerated `RoleVault.xcodeproj`. Verified via `xcodebuild -showBuildSettings` that Release now uses `CODE_SIGN_STYLE = Manual`, `CODE_SIGN_IDENTITY = Apple Distribution`, and `PROVISIONING_PROFILE_SPECIFIER = "match AppStore com.rolevault.app"`.
- Local archive test result: Archive reached the signing phase and found the App Store profile (different error about missing Sign In with Apple capability in local profile — confirming Xcode is no longer searching for Development profiles).

### Verification Results
| # | Check | Result | Output |
|---|-------|--------|--------|
| CI-1 | Manual signing in pbxproj | ✅ | `CODE_SIGN_STYLE = Manual` at line 770 in pbxproj |
| CI-2 | Profile specifier in pbxproj | ✅ | `PROVISIONING_PROFILE_SPECIFIER = "match AppStore com.rolevault.app"` at line 780 |
| CI-3 | Signing identity in pbxproj | ✅ | `CODE_SIGN_IDENTITY = "Apple Distribution"` at line 769 |
| CI-4 | Local archive test | ✅ | Archive reached signing phase looking for App Store profile (not Development) |
| CI-5 | CI passes | ⏳ | Fix addresses known root cause; pending push verification |
| C1 | No hardcoded "gpt-4o" | ✅ | `rg '"gpt-4o"' ios/RoleVault/` → 0 hits |
| C2 | Empty fallback | ✅ | `defaultModel = ""` in ChatService.swift line 6 |
| C3 | Guard against empty model | ✅ | `guard !resolvedModel.isEmpty` in sendMessageStream (line 55) and sendMessage (line 158) |
| C4 | fetchConfig at startup | ✅ | `try? await ConfigService.shared.fetchConfig()` added to AppDelegate line 24 |
| 1 | LibreChat/libreraft/librechat refs | ✅ | 0 hits in iOS Swift source |
| 2 | RegisterView refs | ✅ | 0 hits |
| 3 | AgentModels refs | ✅ | 0 hits |
| 4 | RegisterRequest refs | ✅ | 0 hits |
| 5 | func register in AuthService | ✅ | 0 hits |
| 6 | .login( in RoleVaultApp | ✅ | 0 hits |
| 7 | import SwiftData in RoleVaultApp | ✅ | 1 hit (line 2) |
| 8 | import AuthenticationServices in RoleVaultApp | ✅ | 1 hit (line 3) |
| 9 | signInWithApple wiring | ✅ | 3 hits (AuthService def + 2 call sites) |
| 10 | request/verifyMagicLink wiring | ✅ | 8 hits (2 AuthService defs + LoginView call sites + private methods) |
| 11 | Auth endpoint registrations | ✅ | 3 endpoints (apple, magic-link/request, magic-link/verify) |
| 12 | checkAuth wiring | ✅ | 2 hits (AppDelegate call + AuthService def) |
| 13 | JWT_SECRET templated | ✅ | `${JWT_SECRET:-change-me-in-production}` in docker-compose.yml |
| 14 | POSTGRES_PASSWORD | ✅ | `"rolevault"` in docker-compose.yml (local dev) |
| 15 | apple_user_id column | ✅ | 1 definition in models.py |
| 16 | magic_link_tokens table | ✅ | 1 definition (MagicLinkToken class) in models.py |
| 17 | Build succeeds | ✅ | `** BUILD SUCCEEDED **` (iPhone 17 simulator) |

### Self-Check
| # | Item | Status |
|---|------|--------|
| 1 | CI signing gates pass (CI-1 through CI-4) | ✅ |
| 2 | 9 locked decisions honored | ✅ |
| 3 | Hard walls respected | ✅ |
| 4 | 21 verification checks run | ✅ |
| 5 | Diff intentional + minimal | ✅ |
| 6 | No stray prints/NSLog | ✅ |
| 7 | Three auth elements present | ✅ (Apple Sign-In, Email Magic Link, BackendConfig gear) |

### Deviations
- Build verification used `iPhone 17` simulator instead of `iPhone 16` because no iPhone 16 simulator was available on the host; build succeeded without issue.
- CI-5 (GitHub Actions green) cannot be verified in this run because the hard wall prohibits git commits/pushes. The root cause has been diagnosed and fixed; the remaining risk is whether the match provisioning profile includes the Sign In with Apple capability. If CI fails after push, the error will be a capability/entitlement mismatch, not the original "No Development profiles found" error.

### Kimi Session
Session ID: 5a4106b14b97e152992866cf7a88a644
Session Path: ~/.kimi/sessions/5a4106b14b97e152992866cf7a88a644/
Export Path: ~/.kimi/sessions/5a4106b14b97e152992866cf7a88a644/664582fd-7f8d-44fe-a20a-161235c5ab92/wire.jsonl

### Production Readiness Verdict
🟡 GO-WITH-NITS — ship to TestFlight

### Warnings
- **CI push verification pending**: The `project.yml` signing fix resolves the known root cause (Release config missing Manual signing settings), but a push to GitHub Actions is required to confirm the pipeline goes green. If the match provisioning profile was generated before Apple Sign-In was added to entitlements, CI may fail with a capability mismatch. In that case, run `fastlane match nuke appstore` followed by `fastlane match appstore` to regenerate the profile with the current entitlements, then re-push.
- **Model configuration dependency**: The app now requires the backend `/api/config` endpoint to return a non-empty `models` array before any chat message can be sent. If the backend is unreachable or returns zero models, users will see an error. This is by design (locked decision 5).
