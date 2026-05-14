# RoleVault — User Next Prompt

**Working directory:** ~/PROJECTS/rolevault  
**Branch:** main  
**Goal:** Add Sign in with Apple (alongside existing email auth) + fix Xcode install error so the app can run on a physical device.

---

## §A — Previous Run Status

| # | Gap | Status |
|---|-----|--------|
| 1 | Login deadlock fixes (6 items) | ✅ Done — merged into RoleVaultApp.swift |
| 2 | Deploy to physical device | ❌ Blocked by signing error `0xe800801f` |

---

## §B — Overview

Two deliverables. Do them in order — Sign in with Apple first, then the install fix. This is the **smallest possible implementation**: add Apple auth alongside existing email auth. Nothing is removed. Nothing is rewritten. Email login still works exactly as before.

---

## §1 — Backend: Apple Auth Endpoint

Working directory: `~/PROJECTS/rolevault/backend`

### §1.1 — DB Migration: add `apple_user_id` column

Add one nullable column to the `rolevault.users` table:

```sql
ALTER TABLE rolevault.users ADD COLUMN apple_user_id TEXT UNIQUE;
```

Create a new Alembic migration file. The existing migration is at `alembic/versions/acf1d10fbf13_initial.py` — create the next one with:

```bash
uv run alembic revision --autogenerate -m "add_apple_user_id"
```

Then run it:

```bash
DATABASE_URL=postgresql+asyncpg://rolevault:rolevault@localhost:5432/rolevault \
uv run alembic upgrade head
```

### §1.2 — Update `app/models.py`

Add the column to the `User` class (inside the class body, with the other columns):

```python
apple_user_id = Column(String(255), unique=True, nullable=True)
```

### §1.3 — Add `pyjwt` dependency

The backend needs to verify Apple's RS256-signed identity token. The existing `jose` library handles RS256, but we need `PyJWT` for its cleaner JWKS handling.

Add to dependencies (if the project has a requirements.txt — if it uses uv with pyproject.toml, just install):

```bash
uv add pyjwt
```

If there's no pyproject.toml, just `pip install pyjwt`.

### §1.4 — New endpoint: `POST /api/auth/apple`

Add to `app/auth/router.py`. The endpoint:

1. Accepts `{ "identity_token": "<Apple ID token string>" }`  
2. Fetches Apple's public keys from `https://appleid.apple.com/auth/keys`  
3. Verifies the identity token using `jwt.decode()` with those public keys, audience = `com.rolevault.app`, issuer = `https://appleid.apple.com`  
4. Extracts `sub` (the user's stable Apple user ID) and `email` from the verified token  
5. Looks up `rolevault.users` by `apple_user_id` — if found, returns a RoleVault JWT for that user  
6. If not found, creates a NEW user in BOTH tables:  

   **a)** `public.users` (LibreChat's table) — insert with `id = gen_random_uuid()`, `email = <from Apple token>`, `password = ''` (empty — this user won't use password login), `name = <Apple email username part>`, `username = <apple_user_id>`  
   
   **b)** `rolevault.users` — insert with `id` matching the LibreChat row, `email = <from Apple token>`, `display_name = <Apple email username part>`, `apple_user_id = <Apple sub>`  

7. Returns `{ "access_token": "<RoleVault JWT>", "refresh_token": "...", "user": {...} }`  

**Full code to add to `app/auth/router.py`:**

```python
import jwt as pyjwt  # alias to avoid conflict with jose
import requests
from app.schemas import AppleAuthRequest

@router.post("/apple", response_model=TokenResponse)
async def apple_auth(payload: AppleAuthRequest, db: AsyncSession = Depends(get_db)):
    """
    Authenticate via Sign in with Apple.
    Verifies the Apple identity token, then finds or creates a user.
    """
    # 1. Fetch Apple's public keys
    jwks_resp = requests.get("https://appleid.apple.com/auth/keys", timeout=10)
    jwks_resp.raise_for_status()
    jwks = jwks_resp.json()

    # 2. Decode the header to find the key ID
    try:
        unverified_header = pyjwt.get_unverified_header(payload.identity_token)
    except pyjwt.PyJWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid identity token")

    # 3. Find the matching key
    kid = unverified_header.get("kid")
    key = next((k for k in jwks["keys"] if k["kid"] == kid), None)
    if key is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Key not found in Apple JWKS")

    public_key = pyjwt.algorithms.RSAAlgorithm.from_jwk(key)

    # 4. Verify the token
    try:
        decoded = pyjwt.decode(
            payload.identity_token,
            public_key,
            algorithms=["RS256"],
            audience="com.rolevault.app",
            issuer="https://appleid.apple.com",
        )
    except pyjwt.PyJWTError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Token verification failed: {str(e)}")

    apple_user_id = decoded.get("sub")
    email = decoded.get("email")
    if not apple_user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing sub claim in Apple token")

    # 5. Look up by apple_user_id
    result = await db.execute(select(User).where(User.apple_user_id == apple_user_id))
    rv_user = result.scalar_one_or_none()

    if rv_user:
        # Existing user — return RoleVault JWT
        access_token = create_access_token(rv_user.id)
        refresh_token = create_refresh_token(rv_user.id)
        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            user=_user_response(rv_user),
        )

    # 6. New user — create in both tables
    display_name = email.split("@")[0] if email else "User"
    new_id = uuid4()

    lc_user = LibreChatUser(
        id=new_id,
        email=email or f"{apple_user_id}@appleid.apple",
        password="",  # Apple users don't use password auth
        name=display_name,
        username=apple_user_id,
    )
    db.add(lc_user)
    try:
        await db.flush()
    except (IntegrityError, ProgrammingError):
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email conflict in LibreChat")

    rv_user = User(
        id=new_id,
        email=email or f"{apple_user_id}@appleid.apple",
        display_name=display_name,
        apple_user_id=apple_user_id,
    )
    db.add(rv_user)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User already exists in RoleVault")

    await db.refresh(rv_user)

    access_token = create_access_token(rv_user.id)
    refresh_token = create_refresh_token(rv_user.id)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=_user_response(rv_user),
    )
```

### §1.5 — Add `AppleAuthRequest` schema to `app/schemas.py`

```python
class AppleAuthRequest(BaseModel):
    identity_token: str
```

Add this next to the other auth schemas (after `RefreshRequest`).

### §1.6 — Add imports to `app/auth/router.py`

At the top, add alongside existing imports:

```python
import jwt as pyjwt
import requests
from app.schemas import AppleAuthRequest
```

And add `uuid4` to the existing uuid import if not already there (it is — `from uuid import uuid4` is line 1).

### §1.7 — Verify

```bash
cd ~/PROJECTS/rolevault/backend
DATABASE_URL="postgresql+asyncpg://rolevault:rolevault@localhost:5432/rolevault" \
uv run uvicorn app.main:app --reload --port 8001

# Check Swagger UI — /api/auth/apple should appear
open http://localhost:8001/docs
```

---

## §2 — iOS: Sign in with Apple Button

Working directory: `~/PROJECTS/rolevault/ios`

### §2.1 — Add capability to entitlements

Edit `RoleVault/RoleVault.entitlements` — add the Sign in with Apple key:

```xml
<key>com.apple.developer.applesignin</key>
<array>
    <string>Default</string>
</array>
```

So the file should look like:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>aps-environment</key>
    <string>development</string>
    <key>com.apple.developer.applesignin</key>
    <array>
        <string>Default</string>
    </array>
</dict>
</plist>
```

### §2.2 — Add Sign in with Apple button to `LoginView`

In `RoleVault/App/RoleVaultApp.swift`, inside `LoginView`'s `body`, add the Apple sign-in button AFTER the existing "Log In" button and BEFORE the "Don't have an account?" link.

Add this state variable to `LoginView` (next to the other `@State` vars):

```swift
@State private var appleSignInInProgress = false
```

Add the button between the existing Log In button's closing `}` and the `NavigationLink`:

```swift
// Sign in with Apple
SignInWithAppleButton(
    .signIn,
    onRequest: { request in
        request.requestedScopes = [.fullName, .email]
    },
    onCompletion: { result in
        Task { await handleAppleSignIn(result) }
    }
)
.signInWithAppleButtonStyle(.black)
.frame(height: 50)
.clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
```

Add this import at the top of the file:

```swift
import AuthenticationServices
```

Add this method to `LoginView` (next to the `login()` and `isValidEmail()` methods):

```swift
private func handleAppleSignIn(_ result: Result<ASAuthorization, Error>) async {
    switch result {
    case .success(let authorization):
        guard let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
              let identityToken = credential.identityToken,
              let tokenString = String(data: identityToken, encoding: .utf8) else {
            errorMessage = "Failed to get Apple identity token"
            showError = true
            return
        }
        isLoading = true
        defer { isLoading = false }
        do {
            _ = try await AuthService.shared.signInWithApple(identityToken: tokenString)
            HapticEngine.notification(.success)
        } catch let apiError as APIError {
            errorMessage = apiError.localizedDescription
            showError = true
            HapticEngine.notification(.error)
        } catch {
            errorMessage = error.localizedDescription
            showError = true
            HapticEngine.notification(.error)
        }
    case .failure(let error):
        errorMessage = error.localizedDescription
        showError = true
        HapticEngine.notification(.error)
    }
}
```

### §2.3 — Add `signInWithApple` to `AuthService`

In `RoleVault/API/AuthService.swift`, add this method (next to the existing `login()` method):

```swift
/// Sign in with Apple. Sends the identity token to the backend which verifies it and returns a RoleVault JWT.
func signInWithApple(identityToken: String) async throws -> TokenResponse {
    let body = try JSONEncoder().encode(["identity_token": identityToken])
    let response: TokenResponse = try await api.request(
        path: "/api/auth/apple",
        method: "POST",
        body: body
    )

    try KeychainManager.shared.saveJWT(response.accessToken)
    try KeychainManager.shared.saveRefreshToken(response.refreshToken)

    await MainActor.run {
        isAuthenticated = true
    }

    await persistUserAccount(remoteUser: response.user)

    return response
}
```

Note: `api.request(path:method:body:)` likely exists on `RoleVaultAPI` for raw data requests. If it doesn't exist and only `api.post(path:body:)` exists, use that instead. The `post` method may require a `Decodable` body type — adapt accordingly. The key is: send `{"identity_token": "..."}` as JSON to `POST /api/auth/apple`, get back a TokenResponse.

### §2.4 — Verify iOS builds

```bash
cd ~/PROJECTS/rolevault/ios
xcodegen generate
xcodebuild -scheme RoleVault -destination 'platform=iOS' build 2>&1 | grep "BUILD"
```

Must see: `** BUILD SUCCEEDED **`

---

## §3 — Fix Install Error (`0xe800801f`)

The `project.yml` is configured for App Store distribution only. For local development / direct Xcode installs, switch to **Automatic signing** for debug builds.

### §3.1 — Edit `project.yml`

Change lines 31-33 from:

```yaml
CODE_SIGN_STYLE: Manual
PROVISIONING_PROFILE_SPECIFIER: match AppStore com.rolevault.app
CODE_SIGN_IDENTITY: Apple Distribution
```

To:

```yaml
CODE_SIGN_STYLE: Automatic
```

Remove the `PROVISIONING_PROFILE_SPECIFIER` and `CODE_SIGN_IDENTITY` lines entirely.

### §3.2 — Regenerate and open

```bash
cd ~/PROJECTS/rolevault/ios
xcodegen generate
open RoleVault.xcodeproj
```

### §3.3 — In Xcode, set your team

1. Click the RoleVault project in the sidebar  
2. Select the "RoleVault" target → "Signing & Capabilities" tab  
3. Under "Team", select your Apple Developer team (S58MT4ATKM or your personal team)  
4. Check "Automatically manage signing" is ON  
5. Xcode will auto-create a development provisioning profile that includes your connected iPhone  

### §3.4 — Build and run to device

Select your physical iPhone from the scheme dropdown → Cmd+R.

**If it still fails:** Go to [developer.apple.com/account](https://developer.apple.com/account) → Certificates, Identifiers & Profiles → Devices → verify your iPhone's UDID is listed. If not, add it.

---

## §4 — Hard Walls

```
❌ Do NOT remove email/password login — Apple auth is ADDED alongside, not replacing
❌ Do NOT touch web client code or docs/user_next_prompt-web.md
❌ Do NOT change the User model's existing columns — only ADD apple_user_id
❌ Do NOT change the login endpoint — it stays exactly as-is
❌ Do NOT commit or push — just apply changes and verify builds
❌ Do NOT add new Swift packages via SPM
❌ Do NOT change Info.plist
❌ Do NOT touch fastlane/ configuration
❌ No print() / NSLog() left in Swift files
```

---

## §5 — Verification Checklist

```
1. Backend migration:
   psql -h localhost -U rolevault -d rolevault -c "\d rolevault.users"
   → apple_user_id column exists, type TEXT, nullable, UNIQUE

2. Backend starts:
   cd ~/PROJECTS/rolevault/backend && DATABASE_URL="postgresql+asyncpg://rolevault:rolevault@localhost:5432/rolevault" uv run uvicorn app.main:app --port 8001 &
   curl http://localhost:8001/health
   → {"status":"ok",...}

3. Swagger shows new endpoint:
   curl http://localhost:8001/docs
   → /api/auth/apple appears in auth section

4. iOS entitlements updated:
   cat RoleVault/RoleVault.entitlements
   → contains com.apple.developer.applesignin

5. iOS project regenerates:
   cd ~/PROJECTS/rolevault/ios && xcodegen generate
   → Success

6. iOS builds:
   xcodebuild -scheme RoleVault -destination 'platform=iOS' build 2>&1 | grep "BUILD"
   → ** BUILD SUCCEEDED **

7. LoginView renders Sign in with Apple button:
   (visual check in Xcode Preview or on device)
   → Black "Sign in with Apple" button visible below the Log In button

8. Existing email login still works:
   → Email + password login flow unchanged

9. Xcode signing set to Automatic:
   Open project in Xcode → RoleVault target → Signing & Capabilities
   → "Automatically manage signing" is ON, team is set

10. App installs on device:
    Cmd+R to physical iPhone
    → No 0xe800801f error, app launches
```

---

## §6 — Self-Check

```
- [ ] Backend model updated with apple_user_id column
- [ ] Alembic migration created and applied
- [ ] pyjwt installed
- [ ] POST /api/auth/apple endpoint exists and appears in /docs
- [ ] AppleAuthRequest schema added to schemas.py
- [ ] iOS entitlements updated with Sign in with Apple capability
- [ ] SignInWithAppleButton added to LoginView (after Log In, before sign up link)
- [ ] handleAppleSignIn method added to LoginView
- [ ] signInWithApple method added to AuthService
- [ ] import AuthenticationServices added to RoleVaultApp.swift
- [ ] email/password login completely untouched — zero lines removed
- [ ] project.yml switched to CODE_SIGN_STYLE: Automatic
- [ ] xcodebuild passes with BUILD SUCCEEDED
- [ ] No print()/NSLog() in modified Swift files
- [ ] No files touched outside the ones listed in this prompt
```

---

## §7 — Bring-Back: Overwrite `docs/user_bring_back.md`

After completing everything, **overwrite** `~/PROJECTS/rolevault/docs/user_bring_back.md`:

```
## Sign in with Apple + Install Fix Report

### Model Used
Kimi Code CLI

### Changes Applied
| # | Change | File | Status |
|---|--------|------|--------|
| 1 | apple_user_id DB column + migration | models.py + alembic migration | ✅/❌ |
| 2 | POST /api/auth/apple endpoint | auth/router.py | ✅/❌ |
| 3 | AppleAuthRequest schema | schemas.py | ✅/❌ |
| 4 | pyjwt dependency added | requirements/pyproject | ✅/❌ |
| 5 | Sign in with Apple entitlement | RoleVault.entitlements | ✅/❌ |
| 6 | Sign in with Apple button in LoginView | RoleVaultApp.swift | ✅/❌ |
| 7 | signInWithApple method in AuthService | AuthService.swift | ✅/❌ |
| 8 | project.yml → Automatic signing | project.yml | ✅/❌ |

### Verification Results
| # | Check | Result | Output |
|---|-------|--------|--------|
| 1 | DB column exists | ✅/❌ | <psql output> |
| 2 | Backend starts | ✅/❌ | <curl health> |
| 3 | /docs shows /api/auth/apple | ✅/❌ | <screenshot or curl> |
| 4 | Entitlements updated | ✅/❌ | <cat output> |
| 5 | xcodegen succeeds | ✅/❌ | |
| 6 | iOS builds | ✅/❌ | ** BUILD SUCCEEDED ** |
| 7 | Sign in button visible | ✅/❌ | <visual confirmation> |
| 8 | Email login still works | ✅/❌ | |
| 9 | Automatic signing ON | ✅/❌ | |
| 10 | Installs on device | ✅/❌ | <no 0xe800801f> |

### Deviations
- <none, or list any intentional deviations from this spec>

### Overall Verdict
PASS | PASS-WITH-NITS | FAIL

### Kimi Session
Session ID: <uuid>
Session Path: ~/.kimi/sessions/<uuid>/
Export Path: ~/.kimi/sessions/<uuid>/session.jsonl
```
