# RoleVault — User Next Prompt

**Working directory:** ~/PROJECTS/rolevault
**Branch:** main
**Goal:** Fix CI signing so Release builds archive successfully, then execute a production-readiness verification pass — configurable model name, codebase audit, and a GO/NO-GO verdict for TestFlight deployment.

---

## §B — Blocker: CI Signing Failure

The CI pipeline has failed on the last 5 consecutive pushes. The exact error (from run `25943110631`, commit `2d28ebb`):

```
ARCHIVE FAILED
error: No profiles for 'com.rolevault.app' were found: Xcode couldn't find any
iOS App Development provisioning profiles matching 'com.rolevault.app'.
Automatic signing is disabled and unable to generate a profile.
Exit status: 65
```

**What's happening:** `match(type: "appstore")` correctly installs the App Store distribution profile (`match AppStore com.rolevault.app`, UUID `bccdb820-5dc0-4062-940e-1b1e87f90c0e`). Match reports "All required keys, certificates and provisioning profiles are installed 🙌". But when `build_app(configuration: "Release")` runs, Xcode searches for **iOS App Development** profiles (not App Store), finds none, and fails.

**Why:** `project.yml` at `2d28ebb` declares `configs:Release` with `CODE_SIGN_STYLE: Manual` and `PROVISIONING_PROFILE_SPECIFIER: match AppStore com.rolevault.app`. `xcodegen generate` runs in CI step 6 and produces `RoleVault.xcodeproj`. But Xcode ignores or cannot find the Release-signing settings when archiving. The error message "Automatic signing is disabled" confirms Xcode sees Manual signing is requested, but it's still searching the wrong profile category ("Development" not "App Store").

**Suggestion:** Diagnose by inspecting the generated `project.pbxproj` after `xcodegen generate` to verify the Release configuration's `CODE_SIGN_STYLE`, `PROVISIONING_PROFILE_SPECIFIER`, and `CODE_SIGN_IDENTITY` are actually present in the pbxproj. The fix is likely one of:
- The `project.yml` configs structure is wrong for xcodegen 2.45.4 / Xcode 26.3 — the `configs:` key may need to be under `settings:` not the target root
- The generated pbxproj has the correct settings but Fastlane's `build_app` overrides them (check the raw `xcodebuild` command in the log around line 408 of previous run)
- The provisioning profile's App ID doesn't match the bundle identifier exactly (case, prefix, or capabilities mismatch)

**Source:** 5 consecutive CI failures at https://github.com/asherlewis-uk/rolevault/actions. Last green run was `3fe27a4` (final integration pass).

---

## §A — Previous Run Status

| Item | Status |
|------|--------|
| Apple Sign-In (backend + iOS) | ✅ Done — on-device verified |
| Magic link auth (backend + iOS) | ✅ Done — 19/19 verification checks pass |
| RegisterView deleted | ✅ Done |
| Hygiene pass (type renames, dead code, Keychain rename) | ✅ Done |
| Dead @State vars cleanup | ✅ Done (`c760eb1`) |
| CI signing fix (project.yml configs:Release added) | ❌ NOT DONE — 5 consecutive CI failures, Release archive still looks for Development profiles |

**All auth flows are implemented. All known dead code is removed. CI is the only remaining gate. Once CI passes, the app ships.**

---

## §B Part 2 — Overview

Four deliverables, one verdict. **CI fix must be completed first.** The remaining items depend on CI passing before they can be verified.

### Deliverable 0 (BLOCKING): Fix CI Signing
Diagnose and fix why Xcode searches for Development profiles during Release archiving despite `project.yml` specifying Manual signing with an App Store profile. All other work depends on this.

### Deliverable 1: Configurable Model Name
`ChatService.defaultModel` is hardcoded to `"gpt-4o"`. The backend already returns `models: [...]` in its `/api/config` response. Wire the iOS app to use the backend-configured model instead of a hardcoded fallback.

### Deliverable 2: Full Codebase Audit
Mechanical sweep for any remaining dead code, orphaned references, hardcoded secrets, or un-wired configuration.

### Deliverable 3: CI Confirmation
After pushing this prompt's changes, verify the CI pipeline succeeds at GitHub Actions.

### Final: GO/NO-GO Verdict
All four deliverables must pass. Only then does RoleVault ship to TestFlight.

---

## §0 — Fix CI Signing (BLOCKING — DO THIS FIRST)

Working directory: `~/PROJECTS/rolevault/ios`

### Step 0.1: Verify what xcodegen actually generates

```bash
cd ios
xcodegen generate
# Inspect the generated pbxproj for Release config settings
rg -A5 "Release" RoleVault.xcodeproj/project.pbxproj | grep -E "CODE_SIGN|PROVISIONING|PROFILE"
```

Expected: you should see `CODE_SIGN_STYLE = Manual`, `PROVISIONING_PROFILE_SPECIFIER = "match AppStore com.rolevault.app"`, and `CODE_SIGN_IDENTITY = "Apple Distribution"` under the Release build configuration.

If these are present: the problem is in how Fastlane/build_app invokes xcodebuild. Check the raw xcodebuild command in the CI log.

If these are absent or wrong: `project.yml`'s structure is incompatible with this version of xcodegen. The fix may require moving signing settings under a different key or using a different xcodegen syntax.

### Step 0.2: Common xcodegen pitfalls

- `configs:` must be under `settings:` (per-target settings), not at target root
- Some xcodegen versions require `configFiles:` instead of inline `configs:`
- The `CODE_SIGN_IDENTITY` value may need to match exactly what's in the keychain (`"Apple Distribution: Kasey Upton (***)"` not just `"Apple Distribution"`)

### Step 0.3: Test locally before pushing

```bash
cd ios
xcodegen generate
xcodebuild -scheme RoleVault -configuration Release -destination 'generic/platform=iOS' archive -archivePath /tmp/RoleVault.xcarchive CODE_SIGN_STYLE=Manual 2>&1 | tail -20
```

This simulates what CI does. If it passes locally but fails in CI, the issue is environment-specific (missing cert in CI keychain, profile not matching CI's machine).

### Step 0.4: Verification for §0

```
CI-1. rg "CODE_SIGN_STYLE.*Manual" ios/RoleVault.xcodeproj/project.pbxproj → at least 1 hit under Release config
CI-2. rg "match AppStore" ios/RoleVault.xcodeproj/project.pbxproj → at least 1 hit
CI-3. rg "Apple Distribution" ios/RoleVault.xcodeproj/project.pbxproj → at least 1 hit under Release config
CI-4. Local archive test passes (Step 0.3)
CI-5. Push → CI green at GitHub Actions ✅
```

---

## §1 — Configurable Model Name

Working directory: `~/PROJECTS/rolevault/ios`

### §1.1 — Where the hardcode lives

File: `ios/RoleVault/API/ChatService.swift`, line 6:
```swift
static var defaultModel = "gpt-4o"
```

### §1.2 — Where the backend config is fetched

File: `ios/RoleVault/API/ConfigService.swift`, lines 8-16:
```swift
func fetchConfig() async throws -> ServerConfig {
    let config: ServerConfig = try await api.get(path: "/api/config")
    await MainActor.run {
        InferenceAPI.shared.baseURL = config.inferenceUrl
        if let firstModel = config.models.first {
            ChatService.defaultModel = firstModel
        }
    }
    return config
}
```

`ConfigService` already sets `ChatService.defaultModel` from the backend — but only if `config.models` is non-empty. The hardcoded `"gpt-4o"` is a fallback for the case where backend config hasn't loaded or returned zero models.

### §1.3 — The fix

Three changes:

**A) Change the hardcoded fallback to an empty sentinel** in `ChatService.swift` line 6:
```swift
static var defaultModel = ""  // set from backend config; empty until fetched
```

**B) Add a guard in `ChatService`** wherever `defaultModel` is consumed (lines 54, 152). When `defaultModel` is empty and no explicit model is passed, raise an error instead of silently using a hardcoded value:

In `sendMessage` and `sendStreamingMessage`, after `let resolvedModel = model ?? ChatService.defaultModel`:
```swift
guard !resolvedModel.isEmpty else {
    throw APIError.serverError(500, "No model configured. Check backend connection.")
}
```

**C) Verify `fetchConfig()` is called at app startup.** Search for calls to `ConfigService.shared.fetchConfig()`. The method exists but needs to be invoked early in the app lifecycle. If no call site exists at startup, find the appropriate place (e.g., `AppDelegate.didFinishLaunching` or `ContentView.onAppear`) and add:

```swift
Task {
    try? await ConfigService.shared.fetchConfig()
}
```

### §1.4 — Verification for §1

1. Search `ChatService.swift` for `"gpt-4o"` → 0 hits
2. Search `ChatService.swift` for `defaultModel = ""` → 1 hit
3. Search all Swift source for `ConfigService.shared.fetchConfig()` → at least 1 call site at app startup
4. Compile check passes

---

## §2 — Full Codebase Audit

Run these checks mechanically. Every check must produce a pass/fail with grep output.

### §2.1 — Dead code / orphaned references

```
1. rg "LibreChat|libreraft|librechat" ios/RoleVault/ --type swift -i
   Expected: 0 hits

2. rg "RegisterView" ios/RoleVault/
   Expected: 0 hits

3. rg "AgentModels" ios/RoleVault/
   Expected: 0 hits

4. rg "RegisterRequest" ios/RoleVault/
   Expected: 0 hits

5. rg "func register" ios/RoleVault/API/AuthService.swift
   Expected: 0 hits

6. rg "\.login\(" ios/RoleVault/App/RoleVaultApp.swift
   Expected: 0 hits (login function was deleted; only AppDelegate lifecycle calls remain)

7. rg "import SwiftData" ios/RoleVault/App/RoleVaultApp.swift
   Expected: 1 hit (line 2, top-level import)

8. rg "import AuthenticationServices" ios/RoleVault/App/RoleVaultApp.swift
   Expected: 1 hit (line 3, needed for Apple Sign-In)
```

### §2.2 — Auth flow wiring verification

```
9. rg "signInWithApple" ios/RoleVault/
   Expected: ≥2 hits (AuthService method + LoginView call site)

10. rg "requestMagicLink|verifyMagicLink" ios/RoleVault/
    Expected: ≥4 hits (2 AuthService methods + 2 LoginView call sites)

11. rg "POST /api/auth/apple|/api/auth/magic-link" backend/app/auth/router.py
    Expected: 3 endpoint registrations (apple, magic-link/request, magic-link/verify)

12. rg "checkAuth" ios/RoleVault/
    Expected: ≥1 hit (AppDelegate calls it at launch)
```

### §2.3 — Production config hygiene

```
13. rg "password.*=|secret.*=|JWT_SECRET" backend/docker-compose.yml
    Expected: JWT_SECRET references ${JWT_SECRET:-change-me-in-production} (templated, not hardcoded)

14. rg "POSTGRES_PASSWORD" backend/docker-compose.yml
    Expected: value is "rolevault" (acceptable for local dev; production would use secrets)

15. rg "apple_user_id" backend/app/models.py
    Expected: 1 column definition

16. rg "magic_link_tokens" backend/app/models.py
    Expected: 1 table definition (MagicLinkToken class)
```

---

## §3 — CI Confirmation

After pushing all changes from this prompt:

1. Navigate to: `https://github.com/asherlewis-uk/rolevault/actions`
2. Find the workflow run triggered by the push
3. Confirm it completes with ✅ green checkmark — NOT the same "No profiles for com.rolevault.app" error
4. If red: capture the full error log, paste it into the bring-back

CI must show a green build before any further work proceeds.

---

## §4 — Locked Decisions

1. CI fix must be the first thing diagnosed and resolved. Do not proceed to §1 until CI-1 through CI-4 pass
2. `ChatService.defaultModel` initial value is `""` — empty string, not a model name
3. When `defaultModel` is empty and no explicit model is passed to `sendMessage` or `sendStreamingMessage`, throw an APIError — do not silently use an empty model name
4. `ConfigService.fetchConfig()` MUST be called at app startup. If no call site exists, add one
5. The backend `/api/config` endpoint's `models` array must be non-empty for the app to function. The app doesn't ship with a baked-in model name
6. No new Swift files or types — only modify existing files
7. No new SwiftData models or migrations
8. No changes to the backend — only iOS modifications
9. CI must pass on the pushed commit. If CI fails, the bring-back is BLOCKED, not PASS

---

## §5 — Hard Walls

❌ No new files created
❌ No changes to backend code, Dockerfile, docker-compose, or database schema
❌ No new Swift packages or dependencies
❌ No changes to auth flow (Apple or magic link)
❌ No git commits or pushes
❌ No edits to KeychainManager, AuthService, or any file not explicitly listed in §0 or §1
❌ Do NOT remove `configs:` from project.yml — the Release config is correct. The problem is elsewhere
❌ Do NOT add xcargs back to Fastfile — that was a dead-end fix

---

## §6 — Verification Checklist (21 checks)

### §6.0 — CI signing (5 checks)

| # | Check | Command/Expected |
|---|-------|------------------|
| CI-1 | Manual signing in pbxproj | `rg "CODE_SIGN_STYLE.*Manual" ios/RoleVault.xcodeproj/project.pbxproj` → ≥1 hit under Release |
| CI-2 | Profile specifier in pbxproj | `rg "match AppStore" ios/RoleVault.xcodeproj/project.pbxproj` → ≥1 hit |
| CI-3 | Signing identity in pbxproj | `rg "Apple Distribution" ios/RoleVault.xcodeproj/project.pbxproj` → ≥1 hit under Release |
| CI-4 | Local archive test | `xcodebuild archive -scheme RoleVault -configuration Release -destination 'generic/platform=iOS' CODE_SIGN_STYLE=Manual` → ARCHIVE SUCCEEDED |
| CI-5 | CI passes | Actions run at https://github.com/asherlewis-uk/rolevault/actions → ✅ green |

### §6.1 — Configurable model (4 checks)

| # | Check | Command |
|---|-------|---------|
| C1 | No hardcoded "gpt-4o" | `rg '"gpt-4o"' ios/RoleVault/` → 0 hits |
| C2 | Empty fallback | `rg 'defaultModel = ""' ios/RoleVault/API/ChatService.swift` → 1 hit |
| C3 | Guard against empty model | `rg 'resolvedModel.isEmpty\|defaultModel.isEmpty' ios/RoleVault/API/ChatService.swift` → ≥1 hit |
| C4 | fetchConfig called at startup | `rg 'fetchConfig' ios/RoleVault/` → ≥2 hits (definition + call site) |

### §6.2 — Codebase audit (8 checks)

Checks 1-8 from §2.1 above. All must return expected counts.

### §6.3 — Auth wiring (3 checks)

Checks 9-11 from §2.2 above. All must return expected counts.

### §6.4 — Build (1 check)

```bash
cd ios && xcodegen generate && xcodebuild -scheme RoleVault -destination 'platform=iOS Simulator,name=iPhone 16' build 2>&1 | tail -5
```
Expected: ** BUILD SUCCEEDED **

---

## §7 — Self-Check

- [ ] CI-1 through CI-5 all pass — CI is the prerequisite gate
- [ ] Re-read §4 locked decisions — all 9 honored
- [ ] Re-read §5 hard walls — zero breaches
- [ ] All 21 verification checks run with pass/fail evidence
- [ ] Diff the changed files — changes are intentional and minimal
- [ ] No stray prints/NSLog
- [ ] LoginView has Apple button + email toggle + gear icon — exactly three elements

---

## §8 — Bring-Back Format

After completing all work, **overwrite** `~/PROJECTS/rolevault/docs/user_bring_back.md` with:

```
## Bring-Back Report

### Model Used
<model name>

### Files Changed
- <path>: <summary>

### CI Diagnosis
- What the generated pbxproj showed for Release signing settings:
  ```
  <paste rg output from Step 0.1>
  ```
- Root cause identified: <explanation>
- Fix applied: <description>

### Verification Results
| # | Check | Result | Output |
|---|-------|--------|--------|
| CI-1 | Manual signing in pbxproj | ✅/❌ | … |
| CI-2 | Profile specifier in pbxproj | ✅/❌ | … |
| CI-3 | Signing identity in pbxproj | ✅/❌ | … |
| CI-4 | Local archive test | ✅/❌ | … |
| CI-5 | CI passes | ✅/❌ | … |
| C1 | No hardcoded "gpt-4o" | ✅/❌ | … |
| C2 | Empty fallback | ✅/❌ | … |
| C3 | Guard against empty model | ✅/❌ | … |
| C4 | fetchConfig at startup | ✅/❌ | … |
| 1-8 | Dead code sweep (§2.1) | ✅/❌ | … |
| 9-11 | Auth wiring (§2.2) | ✅/❌ | … |
| 16 | Build succeeds | ✅/❌ | … |

### Self-Check
| # | Item | Status |
|---|------|--------|
| 1 | CI signing gates pass | ✅/❌ |
| 2 | 9 locked decisions honored | ✅/❌ |
| 3 | Hard walls respected | ✅/❌ |
| 4 | 21 verification checks run | ✅/❌ |
| 5 | Diff intentional + minimal | ✅/❌ |
| 6 | No stray prints/NSLog | ✅/❌ |
| 7 | Three auth elements present | ✅/❌ |

### Deviations
- (list; "none" if none)

### Kimi Session
Session ID: <uuid>
Session Path: ~/.kimi/sessions/<uuid>/
Export Path: ~/.kimi/sessions/<uuid>/session.jsonl

### Production Readiness Verdict
🟢 GO — ship to TestFlight
🟡 GO-WITH-NITS — ship but note warnings below
🔴 NO-GO — blocking issues remain (CI still failing)

### Warnings (if any)
- <warning>
```

---

### Post-Verification Steps (after GO verdict)

```bash
cd ~/PROJECTS/rolevault
git add <changed files>
git commit -m "feat: fix CI signing, configurable model from backend, production-readiness verified"
git push
```

Then:
1. Confirm CI passes at GitHub Actions (should be a formality at this point)
2. Wait for TestFlight processing (~15-30 min)
3. Install from TestFlight on physical iPhone
4. Verify: Apple Sign-In → character chat → magic link sign-in → character chat
5. If all flows work: 🚀 **RoleVault is production-grade**
