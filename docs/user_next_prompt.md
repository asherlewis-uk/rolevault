# RoleVault — Wire Hermes API Server Into the iOS Stack

**Working directory:** ~/PROJECTS/rolevault
**Branch:** main
**Goal:** Rewire RoleVault’s backend integration so the app can talk directly to Hermes’s OpenAI-compatible API server as its AI backend, while preserving the app’s native SwiftUI architecture and the existing runtime-configurable backend setting for the current custom backend context (afewbits).

**⚠️ FRESH START:** The file `docs/user_bring_back.md` contains stale results from a different rotation. Ignore it completely. This is a NEW task. Do not reuse, merge, or reference anything from that file.

---

## §1 — Mandatory Skills

No special skill loading is required for the executor beyond normal Swift source inspection. Use Kimi CLI for all source inspection and edits. Do not assume anything about the current implementation without checking the Swift files first.

---

## §2 — Verified Inputs

1. RoleVault is the native iOS client in this repo, and the active backend context here is afewbits, the user’s custom LibreChat deployment. The backend URL is runtime-configurable in `UserDefaults` under `librechat_base_url` with default `http://localhost:3080` (`AGENTS.md:225`).
2. `AGENTS.md` also says the app uses SwiftUI, SwiftData, `@Observable`, and `URLSession` + `async/await` + SSE streaming (`AGENTS.md:7-14`, `AGENTS.md:11`, `AGENTS.md:171-177`).
3. `AGENTS.md` says physical devices require HTTPS for non-localhost backends (`AGENTS.md:228`).
4. `librechat-integration.md` documents the current backend-specific routes used by the custom LibreChat stack: `/api/auth/login`, `/api/auth/refresh`, `/api/auth/logout`, `/api/ask`, `/api/convos`, `/api/messages/{conversationId}`, `/api/agents`, and `/api/config` (`librechat-integration.md:7-31`).
5. The Hermes frontend integration spec for this thread defines the target backend shape: OpenAI-compatible base URL `http://<hermes-host>:8642/v1` and model `hermes-agent`.
6. The repo currently has these likely touch points for backend wiring: `ios/RoleVault/API/RoleVaultAPI.swift`, `ios/RoleVault/API/InferenceAPI.swift`, `ios/RoleVault/API/ChatService.swift`, `ios/RoleVault/API/ConfigService.swift`, `ios/RoleVault/API/AuthService.swift`, `ios/RoleVault/API/TokenInterceptor.swift`, `ios/RoleVault/ViewModels/ChatViewModel.swift`, `ios/RoleVault/Views/Chats/ChatDetailView.swift`, `ios/RoleVault/Views/Chats/MessageInputBar.swift`, `ios/RoleVault/Views/Profile/SettingsView.swift`, and `ios/RoleVault/Views/Profile/BackendConfigView.swift`.
7. The current `docs/user_next_prompt.md` content is stale screenshot-audit work and must be replaced entirely for this rotation.

---

## §3 — Locked Decisions

1. Hermes API server is the backend target. Do not wire the dashboard or TUI.
2. Prefer direct Hermes `/v1` integration, not a generic LibreChat shim, unless a tiny compatibility layer is the only safe way to preserve the existing custom backend interface.
3. Keep the app native SwiftUI + URLSession/SSE based. No web views, JS bridge, or new network stack.
4. Preserve the runtime-configurable backend setting. If needed, repurpose `librechat_base_url` cleanly rather than inventing a second backend system or breaking the afewbits custom backend context.
5. Keep auth and local persistence unchanged unless source inspection proves they are tightly coupled to the old backend and must be adjusted for Hermes compatibility.
6. No new dependencies.
7. Any Hermes-specific endpoint or model defaults must be explicit and user-editable.
8. Keep the current UX structure; only change copy/UI required to reflect Hermes as the backend and to surface backend errors clearly.
9. The default model for Hermes wiring is `hermes-agent`.
10. If physical-device support is in scope, honor ATS and use HTTPS for any non-localhost Hermes endpoint.

---

## §4 — Hard Walls

❌ No changes to auth flow unless required for backend compatibility
❌ No SwiftData schema changes
❌ No XcodeGen / `project.yml` / signing / Fastlane / Matchfile / CI edits
❌ No new packages or dependencies
❌ No backend server implementation inside this repo
❌ No broad UI redesign
❌ No git commits or pushes
❌ No touching unrelated files outside the minimal backend/config/UI touch points found by inspection

---

## §5 — Required Output

Use Kimi CLI to inspect the exact Swift files first, then edit only what is necessary.

Expected touch points:

### Backend client / request routing
- `ios/RoleVault/API/RoleVaultAPI.swift` or the current HTTP client wrapper: make the request base URL and endpoint paths Hermes-compatible.
- `ios/RoleVault/API/InferenceAPI.swift` if it currently owns base URL or streaming logic: align it with Hermes `/v1` endpoints.

### Chat and streaming
- `ios/RoleVault/API/ChatService.swift`: switch chat sending and streaming to Hermes OpenAI-compatible request/response shapes.
- `ios/RoleVault/API/Models/ChatModels.swift` and/or `RemoteModels.swift`: update only the minimal models needed to match Hermes responses.
- `ios/RoleVault/ViewModels/ChatViewModel.swift`: ensure send/load state, message parsing, and error handling still work with the new backend shape.

### Config and settings
- `ios/RoleVault/API/ConfigService.swift`: load Hermes model/config state as needed and surface config errors clearly.
- `ios/RoleVault/Views/Profile/BackendConfigView.swift` and/or `ios/RoleVault/Views/Profile/SettingsView.swift`: make the backend setting point at Hermes by default and rename any LibreChat-specific wording to backend/Hermes wording without erasing the afewbits custom-backend framing.

### UI state and error surfacing
- `ios/RoleVault/Views/Chats/MessageInputBar.swift`: keep send disabled until backend config is ready.
- `ios/RoleVault/Views/Chats/ChatDetailView.swift`: surface backend/config errors clearly instead of burying them in the message stream.

### If inspection proves it is needed
- `ios/RoleVault/API/AuthService.swift` and `ios/RoleVault/API/TokenInterceptor.swift`: only if the old custom-LibreChat auth assumptions are still hardwired into the backend path.

Required change intent:
- Replace custom-LibreChat endpoint assumptions with Hermes-compatible backend wiring.
- Use `http://<hermes-host>:8642/v1` for the Hermes backend.
- Use `hermes-agent` as the Hermes model unless the existing code proves a different explicit model selection path is necessary.
- Keep the app’s local data model and navigation structure intact unless source inspection proves a smaller change would break Hermes compatibility.

If you discover additional files during inspection, include them in the bring-back and keep the edit set minimal.

---

## §6 — Verification Checklist

1. Search for leftover LibreChat-specific backend paths and labels:
   `rg -n "LibreChat|librechat|/api/auth|/api/ask|/api/convos|/api/messages|/api/config|/api/agents" ios/RoleVault`
   Expected: only intentional legacy compatibility references, or none in the active Hermes path; no claim that RoleVault’s active backend is generic LibreChat.
2. Search for Hermes/OpenAI-compatible wiring:
   `rg -n "hermes|/v1/models|/v1/chat/completions|hermes-agent|openai" ios/RoleVault`
   Expected: the new backend path is present in the relevant client files.
3. Confirm backend URL persistence and default behavior:
   inspect the config/settings code and verify the runtime backend URL source now defaults to the Hermes host or a cleanly repurposed equivalent.
4. Build the app:
   `cd ios && xcodebuild build -scheme RoleVault -destination 'platform=iOS Simulator,name=iPhone 17' CODE_SIGNING_ALLOWED=NO`
   Expected: `BUILD SUCCEEDED`.
5. Runtime smoke test:
   launch the app, point it at the Hermes API server, and confirm it can fetch model data and send one short chat request successfully.
6. Diff sanity:
   `git diff --stat` should show only the minimal iOS Swift files needed for backend integration and copy changes.

---

## §7 — Self-Check

- [ ] All backend calls now reach Hermes-compatible endpoints
- [ ] Any LibreChat-specific assumptions that remain are deliberate, isolated, and clearly scoped to the custom afewbits backend
- [ ] No auth / persistence / schema / signing / CI drift
- [ ] Default backend behavior matches the new Hermes wiring
- [ ] No new dependency added
- [ ] Build passes
- [ ] Runtime smoke test passes
- [ ] No debug print or NSLog left behind
- [ ] Bring-back is complete and truthful

---

## §8 — Bring-Back Format

Overwrite `docs/user_bring_back.md` with the following exact structure:

```md
## Bring-Back Report

### Model Used
<model name>

### Files Changed
- <path>: <summary of change>

### Verification Results
| # | Check | Result | Output |
|---|-------|--------|--------|
| 1 | ... | ✅ / ❌ | ... |

### Self-Check
| # | Item | Status |
|---|------|--------|
| 1 | ... | ✅ / ❌ |

### Deviations
- none

### Kimi Session
Session ID: <uuid>
Session Path: ~/.kimi/sessions/<uuid>/
Export Path: ~/.kimi/sessions/<uuid>/session.jsonl

### Verdict
PASS | PASS-WITH-NITS | FAIL | BLOCKED
```

If you had to deviate from the requested scope, list every deviation explicitly.

Primary deliverable destination: `~/PROJECTS/rolevault/docs/user_bring_back.md`
