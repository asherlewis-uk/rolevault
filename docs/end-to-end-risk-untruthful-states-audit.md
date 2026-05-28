# End-to-End Risk and Untruthful States Audit

Audit focus: updated web, iOS, and backend auth/config hardening after removing password auth UI and user-configurable endpoint controls.

## Executive Summary

The core hardening direction is partially in place: active web and iOS code now use hardcoded backend/inference constants, web sign-in uses Apple plus magic link, and the backend accepts both the iOS app ID and the web Services ID for Apple identity tokens.

The remaining risk is not mostly "password fields still visible." It is a mix of production auth gaps, public infrastructure exposure through client-side inference calls, and UI that still promises account, billing, privacy, notification, persona, and model behavior that is either stubbed or local-only.

Highest priority:

1. iOS magic-link auth is production-broken because the Swift response model requires a dev-only token and the email link targets the web app, not iOS.
2. The inference URL is hardcoded, but still public to every web client and iOS binary because chat calls it directly. If that endpoint is not independently authenticated/rate-limited, this is an abuse surface.
3. Web profile/account/persona/settings screens expose controls that do not persist or call real backend behavior.

## Confirmed Good States

- Web runtime constants are hardcoded in [web/src/lib/runtimeConfig.ts](../web/src/lib/runtimeConfig.ts#L1-L4).
- Web sign-in initializes Apple with `com.rolevault.web` and `https://rolevault.asherlewis.online/signin` in [web/src/pages/SignIn.tsx](../web/src/pages/SignIn.tsx#L86-L94).
- Web auth now uses Apple and magic-link routes, not login/register password routes, in [web/src/context/AuthContext.tsx](../web/src/context/AuthContext.tsx#L75-L100).
- iOS backend and inference base URLs are immutable constants in [ios/RoleVault/API/RoleVaultAPI.swift](../ios/RoleVault/API/RoleVaultAPI.swift#L7) and [ios/RoleVault/API/InferenceAPI.swift](../ios/RoleVault/API/InferenceAPI.swift#L7).
- Backend endpoint and Apple client IDs are reset after env loading in [backend/app/config.py](../backend/app/config.py#L42-L47), so env values no longer override those runtime constants.
- Backend Apple auth accepts both iOS bundle ID and web Services ID audiences in [backend/app/auth/router.py](../backend/app/auth/router.py#L152-L156).

## Findings

### 1. iOS Magic-Link Sign-In Is Production-Broken

Severity: High  
Area: iOS auth, backend auth, user onboarding

Evidence:

- Backend only includes `token` in the magic-link request response when `debug` and `magic_link_dev_tokens` are both enabled in [backend/app/auth/router.py](../backend/app/auth/router.py#L253-L257).
- Production backend response omits `token` and returns only detail plus `expires_at` in [backend/app/auth/router.py](../backend/app/auth/router.py#L266-L268).
- iOS requires `MagicLinkResponse.token` as a non-optional field in [ios/RoleVault/API/Models/AuthModels.swift](../ios/RoleVault/API/Models/AuthModels.swift#L3-L6).
- iOS then auto-fills `magicLinkToken = response.token` in [ios/RoleVault/App/RoleVaultApp.swift](../ios/RoleVault/App/RoleVaultApp.swift#L301-L304).
- The iOS UI asks the user to check email and paste a token in [ios/RoleVault/App/RoleVaultApp.swift](../ios/RoleVault/App/RoleVaultApp.swift#L177-L184), then disables verification if no token exists in [ios/RoleVault/App/RoleVaultApp.swift](../ios/RoleVault/App/RoleVaultApp.swift#L209-L211).
- Backend email links are web links only: `https://rolevault.asherlewis.online/magic-link?token=...` in [backend/app/auth/router.py](../backend/app/auth/router.py#L42).

Actual behavior:

- In production, iOS magic-link request decoding fails because `token` is absent.
- Even if decoding were made optional, the app has no universal-link/deep-link handoff for the emailed web magic link.
- The "Paste token" UI is dev-token oriented and not a production user flow.

Intended scope:

- iOS email sign-in should either be a real app magic-link flow using associated domains/universal links, or it should be hidden from iOS until implemented.
- Dev token paste can remain only as an explicit local/dev diagnostic, not as the normal production path.

Recommended fix scope:

- Make `MagicLinkResponse.token` optional.
- Add an iOS universal link route for magic-link verification, or remove magic-link sign-in from iOS production UI and keep Apple as the only production iOS auth method until links are wired.
- If keeping paste-token support, gate it behind debug builds only.

### 2. Hardcoded Inference Does Not Mean Hidden Inference

Severity: High if the inference endpoint is unauthenticated or weakly rate-limited; Medium if it is separately protected  
Area: web chat, iOS chat, backend config, infrastructure exposure

Evidence:

- Web hardcodes `ROLEVAULT_INFERENCE_URL = "https://api.asherlewis.online"` in [web/src/lib/runtimeConfig.ts](../web/src/lib/runtimeConfig.ts#L2).
- Web chat sends browser requests directly to `/v1/chat/completions` in [web/src/lib/chatStream.ts](../web/src/lib/chatStream.ts#L82-L92).
- Web model discovery and test connection also call inference directly in [web/src/hooks/useLLMProvider.ts](../web/src/hooks/useLLMProvider.ts#L63-L66) and [web/src/hooks/useLLMProvider.ts](../web/src/hooks/useLLMProvider.ts#L114-L126).
- iOS calls the inference service directly through [ios/RoleVault/API/InferenceAPI.swift](../ios/RoleVault/API/InferenceAPI.swift#L7-L26).
- Backend `/api/config` still returns `inference_url` in [backend/app/config_endpoint/router.py](../backend/app/config_endpoint/router.py#L30-L33), and the schema exposes that field in [backend/app/schemas.py](../backend/app/schemas.py#L242-L245).
- Backend CORS is still `allow_origins=["*"]` with a production TODO in [backend/app/main.py](../backend/app/main.py#L31-L36).

Actual behavior:

- The endpoint is not user-configurable, but it is still visible in the web bundle, browser network panel, iOS binary, and `/api/config` response.
- Chat requests bypass the RoleVault backend auth layer and go straight to inference.

Intended scope:

- If the requirement is only "not configurable by users," the current hardcoded approach satisfies that.
- If the requirement is "do not expose backend/inference infrastructure to frontend clients," direct browser/mobile inference calls do not satisfy it. The intended scope should be an authenticated backend or edge proxy that owns inference access, metering, abuse controls, and CORS.

Recommended fix scope:

- Decide whether `https://api.asherlewis.online` is a public managed API or private infrastructure.
- If private, move chat streaming and model discovery behind the RoleVault backend or Supabase edge function, require RoleVault JWT auth, and remove `inference_url` from client-facing config.
- Restrict backend CORS to the production web origin plus explicit local dev origins.

### 3. Web Profile and Account Controls Call Stubbed Auth Methods

Severity: Medium  
Area: web profile/account, backend auth, user trust

Evidence:

- Profile imports `updateUserMeta` and `updateEmail` from auth context in [web/src/pages/Profile.tsx](../web/src/pages/Profile.tsx#L66).
- Edit profile calls `updateUserMeta` in [web/src/pages/Profile.tsx](../web/src/pages/Profile.tsx#L120).
- Change email calls `updateEmail` in [web/src/pages/Profile.tsx](../web/src/pages/Profile.tsx#L134).
- Persona save calls `updateUserMeta` in [web/src/pages/Profile.tsx](../web/src/pages/Profile.tsx#L147-L151).
- The active auth context returns `"Not yet implemented"` for both methods in [web/src/context/AuthContext.tsx](../web/src/context/AuthContext.tsx#L111-L112).
- Backend auth routes only expose refresh, me, Apple, magic-link request, magic-link verify, and logout in [backend/app/auth/router.py](../backend/app/auth/router.py#L84-L346).

Actual behavior:

- Users can open Edit Profile, Change Email, and Save Persona flows, but they cannot successfully persist those changes through the current auth stack.
- Some local metadata readers exist, but this profile screen does not write the matching local storage keys on save.

Intended scope:

- Production account UI should reflect only implemented account operations.
- If profile, persona metadata, or email changes are in scope, they need real backend endpoints and state refresh behavior.
- If not in scope, these panels should be removed or explicitly redesigned as noninteractive display.

Recommended fix scope:

- Remove Change Email until a confirmed-email-change backend flow exists.
- Either implement `PATCH /api/auth/me` or remove Edit Profile/Save Persona from this web profile surface.
- Route persona behavior through the existing persona domain if that is the intended product model.

### 4. Web Preferences, Notifications, Privacy, and Billing Are Mostly Local-Only Mock UI

Severity: Medium  
Area: web settings, billing, privacy/safety, notifications

Evidence:

- Preferences store theme, language, AI model, font size, density, and interaction toggles in component `useState` only in [web/src/pages/settings/Preferences.tsx](../web/src/pages/settings/Preferences.tsx#L51-L62).
- Notifications use local `useState` for push/email toggles in [web/src/pages/settings/Notifications.tsx](../web/src/pages/settings/Notifications.tsx#L60-L74).
- Notification copy promises "Master toggle for all alerts" in [web/src/pages/settings/Notifications.tsx](../web/src/pages/settings/Notifications.tsx#L126-L127), but the master toggle has an empty handler.
- Privacy uses local `useState` only in [web/src/pages/settings/Privacy.tsx](../web/src/pages/settings/Privacy.tsx#L60-L72) while showing product claims like "Safety Score: 80%" in [web/src/pages/settings/Privacy.tsx](../web/src/pages/settings/Privacy.tsx#L118-L119).
- Billing shows upgrade, add card, invoice download, and cancel-subscription UI in [web/src/pages/settings/Billing.tsx](../web/src/pages/settings/Billing.tsx#L137-L158) and [web/src/pages/settings/Billing.tsx](../web/src/pages/settings/Billing.tsx#L181-L214), with no payment API integration in the file.

Actual behavior:

- Settings can be toggled visually but are lost on navigation/refresh or never affect product behavior.
- Billing and invoice controls are presentational only.
- Privacy/safety controls imply enforcement that is not connected to backend policy, content filtering, personalization, blocking, or export systems.

Intended scope:

- If these are not production features, they should not appear as real settings.
- If they are production features, each setting should have a persistence owner and an enforcement point.

Recommended fix scope:

- Hide nonimplemented settings from production routes, or add a shared preferences API and wire each control to real behavior.
- Keep billing screens out of production until a payment provider and plan source of truth exist.
- Avoid static safety scores or invoice histories unless backed by actual account data.

### 5. Web AI Model Picker Is Disconnected From Actual Chat Model Selection

Severity: Medium  
Area: web chat/model selection

Evidence:

- Preferences defines local `aiModel` values `flash`, `pro`, and `ultra` in [web/src/pages/settings/Preferences.tsx](../web/src/pages/settings/Preferences.tsx#L41-L44) and [web/src/pages/settings/Preferences.tsx](../web/src/pages/settings/Preferences.tsx#L53).
- The AI Model buttons only call `setAiModel` in [web/src/pages/settings/Preferences.tsx](../web/src/pages/settings/Preferences.tsx#L186-L190).
- Actual chat uses `useLLMProvider` in [web/src/pages/Chat.tsx](../web/src/pages/Chat.tsx#L47) and passes that config to `streamChat` in [web/src/pages/Chat.tsx](../web/src/pages/Chat.tsx#L92-L97).
- `useLLMProvider` reads and writes the separate `rolevault_model` key in [web/src/hooks/useLLMProvider.ts](../web/src/hooks/useLLMProvider.ts#L43-L55) and [web/src/hooks/useLLMProvider.ts](../web/src/hooks/useLLMProvider.ts#L85-L94).

Actual behavior:

- Selecting Flash/Pro/Ultra in Preferences changes only visual local state.
- Chat continues using the provider hook's active model, not the Preferences choice.

Intended scope:

- There should be one model selection surface and one model source of truth.
- If model selection is not meant for users, remove this panel.

Recommended fix scope:

- Replace the local `aiModel` state with `useLLMProvider().setConfig` and real model IDs, or remove the AI Model preferences block.

### 6. Backend `/api/config` Still Exposes Inference URL

Severity: Medium  
Area: backend config, endpoint hardening, client contracts

Evidence:

- `ConfigResponse` includes `inference_url` in [backend/app/schemas.py](../backend/app/schemas.py#L242-L245).
- `/api/config` returns `settings.inference_url` in [backend/app/config_endpoint/router.py](../backend/app/config_endpoint/router.py#L30-L33).
- iOS rejects mismatched backend config URLs in [ios/RoleVault/API/ConfigService.swift](../ios/RoleVault/API/ConfigService.swift#L24-L34).

Actual behavior:

- Authenticated clients can still retrieve the inference URL from the API.
- iOS still treats a backend-supplied inference URL as part of its config contract, even though it refuses to mutate its hardcoded runtime URL.

Intended scope:

- If `/api/config` is meant only for integrity/model discovery, it should return non-sensitive server-managed status and model IDs, not infrastructure URLs.
- If returning the URL is acceptable, the hardening policy should be clarified as "not user-configurable" rather than "not exposed."

Recommended fix scope:

- Remove `inference_url` from `ConfigResponse` and have clients rely on server status/model lists, or make the route explicitly internal/admin-only.

### 7. iOS Service Failure State Blocks Sending Without a Recovery Path

Severity: Low to Medium  
Area: iOS chat UX, service diagnostics

Evidence:

- App startup silently runs `ConfigService.shared.fetchConfig()` in [ios/RoleVault/App/RoleVaultApp.swift](../ios/RoleVault/App/RoleVaultApp.swift#L22-L25).
- `MessageInputBar` disables send unless `ConfigService.shared.isConfigured` is true in [ios/RoleVault/Views/Chats/MessageInputBar.swift](../ios/RoleVault/Views/Chats/MessageInputBar.swift#L9-L12).
- When not configured, the send button shows "Check service" in [ios/RoleVault/Views/Chats/MessageInputBar.swift](../ios/RoleVault/Views/Chats/MessageInputBar.swift#L53-L55), but the button is disabled by the same condition.
- `ServiceStatusView` exists in [ios/RoleVault/Views/Profile/BackendConfigView.swift](../ios/RoleVault/Views/Profile/BackendConfigView.swift#L3-L22), and `ProfileViewModel.testConnection()` exists in [ios/RoleVault/ViewModels/ProfileViewModel.swift](../ios/RoleVault/ViewModels/ProfileViewModel.swift#L76-L84), but neither is linked from the current profile screen in [ios/RoleVault/Views/Profile/ProfileView.swift](../ios/RoleVault/Views/Profile/ProfileView.swift#L15-L25).

Actual behavior:

- If config probing fails, users see a disabled "Check service" control with no action.
- The old diagnostics path appears to be dead after removing endpoint configuration UI.

Intended scope:

- Because endpoints are managed and non-configurable, failure recovery should be a status/retry/report path, not an editable endpoint path.

Recommended fix scope:

- Make "Check service" open a service status/retry sheet, or replace it with a clear inline error and retry button.
- Remove dead diagnostics state if the product no longer has a diagnostics surface.

### 8. Stale Docs and Local Config Still Describe Removed Password/Endpoint Behavior

Severity: Low  
Area: documentation, onboarding, deployment hygiene

Evidence:

- [AGENTS.md](../AGENTS.md#L180) still documents `AuthService.login(email:password)` and `POST /api/auth/login`.
- [ios/ARCHITECTURE.md](../ios/ARCHITECTURE.md#L90-L103) still documents email/password login and `AuthService.login()`.
- [ios/ARCHITECTURE.md](../ios/ARCHITECTURE.md#L188) still lists `BackendConfigView.swift` as a backend config view.
- [backend/docker-compose.yml](../backend/docker-compose.yml#L31) and [backend/.env](../backend/.env#L4) still carry `INFERENCE_URL`, even though [backend/app/config.py](../backend/app/config.py#L42-L47) forces the production constant after env loading.
- [README.md](../README.md#L137-L139) still refers to `CORS_ORIGINS`, but active backend CORS currently does not read that setting.

Actual behavior:

- Docs imply password login and deploy-time endpoint/CORS knobs that the runtime no longer honors.
- Future agents or maintainers could reintroduce removed surfaces by following stale docs.

Intended scope:

- Documentation should match the hardened contract: Apple plus magic-link auth, no password UI, non-configurable endpoints, and managed-service diagnostics only.

Recommended fix scope:

- Update docs to remove password-login flows and obsolete endpoint knobs.
- Either remove ignored env keys or annotate them as ignored/legacy.
- Rename or remove stale iOS service config files if they no longer represent the product surface.

## Non-Findings From This Pass

- I did not find active web password inputs on the sign-in/profile surfaces inspected.
- I did not find active `VITE_*` endpoint or Apple client configuration in source-controlled web runtime code.
- I did not find iOS user-facing backend or inference URL editors in the inspected current SwiftUI profile/login/settings paths.

## Suggested Fix Order

1. Fix or hide iOS magic-link auth before shipping it as a production option.
2. Decide whether inference is public or private. If private, move chat behind an authenticated proxy before polishing more client UI.
3. Remove or implement web profile/account/persona stubs.
4. Remove or implement local-only web settings and billing screens.
5. Clean stale docs/env entries so future work follows the new hardened contract.
