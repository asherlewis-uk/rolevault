# ASH-5 Nit MVP Fix Scope

**Author:** Product Manager
**Date:** 2026-05-16
**Context:** RoleVault web rebrand+rewire (12/12 locked decisions honored, 24/24 checks green)
**Repo:** /Users/asherlewis/PROJECTS/rolevault

---

## Situation Summary

Three nits remain after the ASH-5 rewire. Two are blocking risks. One is a known deferred feature.

| # | Nit | Risk Level | Blocker? |
|---|-----|-----------|----------|
| 1 | Kimi Session ID: N/A (web bring-back) | Medium | Blocks forensic audit chain |
| 2 | /api/auth/me response shape unverified | High | Runtime break risk |
| 3 | Profile save buttons stub "Not yet implemented" | Low | Feature gap, not a regression |

---

## Nit 1: Session Logging Gap — Kimi Session ID: N/A

### Evidence

File: `/Users/asherlewis/PROJECTS/rolevault/docs/user_bring_back-web.md`
Lines 108–111:
```
### Kimi Session
Session ID: N/A (CLI harness)
Session Path: N/A
Export Path: N/A
```

The web bring-back was executed by `kimi-k2.6` via a CLI harness that did not capture the session. By contrast, the iOS bring-back (`docs/user_bring_back.md`, lines 42–45) has a valid session ID (`5a4106b14b97e152992866cf7a88a644`), path, and export path.

### Why This Matters

Without the session export, we cannot:
- Replay the exact tool calls the model made during the web rewire
- Cross-reference `/api/auth/me` discovery findings with the original model context
- Verify that no subtle assumptions were embedded in the model's reasoning that differ from what the code shows
- Run a forensic audit on the bring-back during the next rotation

### MVP Fix

**Single action: Re-run the bring-back with session capture enabled.**

The web bring-back report is complete (21 files changed, 1 file created, 3 directories deleted, 24 verification checks passed). We do NOT need to re-do the work — we only need a capture of the model's session for the rotation pipeline's audit trail.

**Minimal steps:**

1. Using the Kimi Code CLI (not any other harness), re-run `user_bring_back-web.md` as a bring-back task — or, if the session is already lost, re-execute the same prompt that produced `docs/user_bring_back-web.md` using `kimi-k2.6` with `--session` mode enabled.

2. Append the session metadata to the existing bring-back report:
   ```
   Session ID: <captured>
   Session Path: ~/.kimi/sessions/<captured>/
   Export Path: ~/.kimi/sessions/<captured>/session.jsonl
   ```

3. Save the session export alongside the bring-back report for archival.

**Estimated effort:** 15 minutes (one re-run). Zero code changes.

---

## Nit 2: /api/auth/me Response Shape Unverified

### Evidence

File: `/Users/asherlewis/PROJECTS/rolevault/docs/user_bring_back-web.md`
Lines 11–13:
```
- /api/auth/me response shape: not tested with valid token (no valid test credentials),
  but endpoint exists and returns CORS headers correctly
```

File: `/Users/asherlewis/PROJECTS/rolevault/web/src/context/AuthContext.tsx`
Lines 4–8:
```typescript
export interface AuthUser {
  id: string;
  email: string;
  displayName?: string;
}
```

Line 42:
```typescript
apiFetch<{ id: string; email: string; displayName?: string }>("/api/auth/me")
```

### Why This Matters — The Silent Mismatch Risk

1. **The architecture plan uses `display_name` (snake_case).** File `docs/architecture-plan.md` line 79 defines `rolevault_users.display_name`. FastAPI with SQLAlchemy commonly serializes columns using their snake_case names unless an explicit `serialization_alias` or Pydantic model is configured.

2. **The web client expects `displayName` (camelCase).** AuthContext.tsx line 8 declares `displayName?: string`. TypeScript won't throw — it will silently produce `undefined` for the field. The Profile page uses `user?.displayName` (Index.tsx line 22) and `user.displayName` (LandingNav.tsx line 23), so the display name will render as blank/missing with no error.

3. **The login response ALSO assumes the same shape.** Line 57: `apiFetch<{ token: string; user: AuthUser }>` — if `/api/auth/login` returns a user object with snake_case keys, the `AuthUser` will have `id` and `email` populated (since those survive casing differences) but `displayName` will be `undefined`.

4. **Compounding risk: token refresh not implemented.** When the JWT expires and the app hits a 401, `apiFetch` in `client.ts` will throw with the error detail, but there's no interceptor to refresh the token. The `AuthContext` `useEffect` (lines 41–48) catches the `/api/auth/me` failure and removes the token, causing a silent sign-out. This means any auth shape mismatch will cascade into an invisible logout.

### MVP Fix: Discovery-First Verification

**Do NOT change code until we know the truth.** The fix is a pure discovery task:

#### Step 1: Obtain valid test credentials

Obtain or create a test user on the backend at `https://backend.asherlewis.online`. The login endpoint is `POST /api/auth/login` with `{email, password}`. The error response format is confirmed: `{ detail: "Invalid email or password" }`.

#### Step 2: Probe /api/auth/me with a curl/script

```bash
# Login to get a token
TOKEN=$(curl -s -X POST https://backend.asherlewis.online/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@example.com","password":"testpass"}' \
  | jq -r '.token')

# Hit /api/auth/me
curl -s https://backend.asherlewis.online/api/auth/me \
  -H "Authorization: Bearer $TOKEN" \
  | jq .
```

#### Step 3: Compare the actual response shape

Document exactly what `/api/auth/me` returns. Compare against the three assumptions:

| Assumption | Field | Actual | Match? |
|-----------|-------|--------|--------|
| `id: string` | id field name and type | TBD | |
| `email: string` | email field name and type | TBD | |
| `displayName?: string` | display name field name | TBD | |

Also check:
- Is there a `token` or `user` wrapper object or is it flat?
- Are there additional fields (avatar_url, username, created_at)?
- What does `/api/auth/login` return? `{token, user}` or something else?

#### Step 4: Fix only if mismatched

If the response shape matches `{id, email, displayName}`, close the nit with documentation.

If it doesn't match (e.g., snake_case `display_name`):
- Update `AuthUser` interface OR add a mapper/transform in `apiFetch`
- Fix should be a single-file change in `AuthContext.tsx` (the interface + the `useEffect`)
- Verify all consumers still work: `Index.tsx`, `LandingNav.tsx`, `Profile.tsx`, `ProtectedRoute.tsx`

**Estimated effort:** 30 minutes (5 min to probe, 25 min to fix if needed). One file changed at most.

---

## Nit 3: Profile Save Buttons — "Not Yet Implemented" Stub

### Evidence

File: `/Users/asherlewis/PROJECTS/rolevault/docs/user_bring_back-web.md`
Lines 58–59:
```
- Action taken: stubbed — AuthContext retains all three methods returning
  { error: "Not yet implemented" } so Profile page does not crash.
  Profile UI is preserved; save buttons show the stub error.
```

File: `/Users/asherlewis/PROJECTS/rolevault/web/src/context/AuthContext.tsx`
Lines 82–84:
```typescript
const updateUserMeta = async () => ({ error: "Not yet implemented" as string | null });
const updateEmail = async () => ({ error: "Not yet implemented" as string | null });
const updatePassword = async () => ({ error: "Not yet implemented" as string | null });
```

### Disposition

**This is a separate ticket. Do NOT fix in the MVP pass.**

Reasoning:
- The stubs were intentionally preserved per the §3 hard wall: "profile-management endpoints were not in scope"
- The backend endpoints (`PATCH /api/auth/me`, `POST /api/auth/update-email`, `POST /api/auth/update-password`) do not exist yet
- Building them requires backend schema work, authentication validation, and testing — far beyond a nit fix
- The current behavior is a deliberate "graceful degradation" — Profile page loads and displays data, save buttons show a clear message, no crashes

**Flag as: ASH-7 (Profile Editing End-to-End)** — Requires backend endpoints + web client wiring + iOS client wiring. Target next rotation.

---

## Token Refresh — Separate Ticket

### Evidence

File: `/Users/asherlewis/PROJECTS/rolevault/docs/user_bring_back-web.md`
Lines 101–102:
```
- Token refresh not implemented — JWT expiry = silent redirect to signin. Follow-up ticket needed.
```

### Why It's Relevant to This Scope

Token refresh is NOT in the MVP fix scope, but it amplifies the risk of Nit #2. If the `/api/auth/me` shape is wrong:
1. AuthContext's `useEffect` fires on mount
2. `/api/auth/me` returns a misshapen response
3. `apiFetch` may fail (TypeScript won't catch it at runtime, but JSON key mismatch means `displayName` is `undefined`)
4. If it fails entirely, the `.catch` on line 47 removes the token → user is silently logged out
5. With no token refresh, there's no recovery pathway — user must manually sign in again

### Disposition

**Flag as: ASH-6 (Token Refresh Implementation)** — Backend: implement `/api/auth/refresh` endpoint with refresh token rotation. Web: add TokenInterceptor or Axios-style interceptor in `apiFetch`. Target next rotation alongside profile editing.

---

## MVP Fix Scope: Exactly Two Items

### Fix 1: Re-capture session ID for web bring-back
- Action: Re-run bring-back with Kimi Code CLI session capture
- Code changes: None (append metadata to existing report)
- Time: 15 min

### Fix 2: Verify /api/auth/me response shape
- Action: Obtain creds → probe endpoint → document shape → fix if mismatched
- Code changes: At most 1 file (`AuthContext.tsx`), ~5 lines if mismatched
- Time: 30 min

### Deferred to Next Rotation

| Ticket | Description | Scope |
|--------|-------------|-------|
| ASH-6 | Token refresh | Backend endpoint + web client interceptor + iOS TokenInterceptor |
| ASH-7 | Profile editing (updateEmail/updatePassword/updateUserMeta) | Backend endpoints + web client wiring + iOS client wiring |

---

## Verification After Fix

After completing Fix 1 and Fix 2:

1. Confirm `docs/user_bring_back-web.md` now contains a valid session ID + path + export path
2. Confirm `/api/auth/me` response shape is documented and matches or is aligned with `AuthUser`
3. Confirm `npm run build` passes with zero TS errors
4. Confirm `npm run dev` starts without import errors
5. Confirm login flow works end-to-end with valid credentials
6. Open tickets ASH-6 and ASH-7 in the rotation tracker
