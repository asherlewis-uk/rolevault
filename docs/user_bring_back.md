## Sign in with Apple + Install Fix Report

### User Direction & Bugs Noted in Screenshots
User reported two runtime bugs observed on a physical iPhone after the initial implementation:

1. **Screenshot 1 — Registration Failed: "Could not connect to the server."**
   - Occurs when tapping Sign Up on the Create Account screen.
   - Suspected cause: unhelpful error handling in `RegisterView` when the backend URL is unreachable (e.g., device hitting `localhost` instead of the Mac's IP).

2. **Screenshot 2 — Login Failed: `com.apple.AuthenticationServices.AuthorizationError error 1000`**
   - Occurs immediately after tapping the "Sign in with Apple" button on the login screen.
   - Suspected cause: Sign in with Apple capability missing from the app's embedded entitlements, causing `ASAuthorization` to reject the request.

---

### Root-Cause Analysis

#### Bug 1 — Registration "Could not connect to the server"
- `RegisterView.swift` caught all errors generically:
  ```swift
  } catch {
      errorMessage = error.localizedDescription
      showError = true
  }
  ```
- Unlike `LoginView`, it did **not** translate `APIError.networkError` / `.offline` into the actionable message: *"Cannot reach server. Check Backend URL in Settings (gear icon)."*
- Result: when testing on a physical device with the default `http://localhost:8001` backend URL, the user saw the raw system error "Could not connect to the server" instead of being directed to the gear-icon settings.

#### Bug 2 — Apple Sign In `AuthorizationError 1000`
- `project.yml` contains an `entitlements.properties` block:
  ```yaml
  entitlements:
    path: RoleVault/RoleVault.entitlements
    properties:
      aps-environment: development
  ```
- **XcodeGen regenerates the entitlements file from `properties` on every `xcodegen generate`**, overwriting any manual edits to the `.entitlements` file.
- The initial implementation manually edited `RoleVault.entitlements` to add `com.apple.developer.applesignin`, but that edit was silently wiped out the next time the project was regenerated.
- The built app therefore did **not** embed the Sign in with Apple capability, causing `ASAuthorizationError` code 1000 on device.

---

### Patches Applied

| # | Patch | File | Rationale |
|---|-------|------|-----------|
| 1 | Add `APIError`-aware catch block with network/offline message | `RegisterView.swift` | Mirrors `LoginView` error handling so users get "Check Backend URL in Settings (gear icon)" instead of a raw system message. |
| 2 | Add `com.apple.developer.applesignin` to `entitlements.properties` | `project.yml` | Makes the capability **persistent** across `xcodegen generate` runs; fixes the overwrite bug. |

---

### Verification After Patches

#### 1. Entitlements file survives xcodegen
```bash
cd ios && xcodegen generate
cat RoleVault/RoleVault.entitlements
```
Output:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" ...>
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
✅ `com.apple.developer.applesignin` is now present after regeneration.

#### 2. iOS build succeeds
```bash
xcodebuild -scheme RoleVault -destination 'platform=iOS' build
```
Result: `** BUILD SUCCEEDED **`
✅ Build passes with automatic signing and the updated entitlements.

#### 3. RegisterView error handling inspected
```swift
catch let apiError as APIError {
    switch apiError {
    case .networkError, .offline:
        errorMessage = "Cannot reach server. Check Backend URL in Settings (gear icon)."
    case .serverError(409, _):
        errorMessage = "Email already registered."
    case .unauthorized, .serverError(401, _):
        errorMessage = "Registration denied."
    default:
        errorMessage = apiError.localizedDescription
    }
    showError = true
    HapticEngine.notification(.error)
}
```
✅ RegisterView now provides the same actionable network-error message as LoginView.

#### 4. No print()/NSLog() in modified Swift files
```bash
grep -n 'print(' ios/RoleVault/Views/Auth/RegisterView.swift
# No print() found
grep -n 'NSLog' ios/RoleVault/Views/Auth/RegisterView.swift
# No NSLog found
```
✅ Clean.

---

### Previous Implementation Status (from earlier run)
| # | Change | File | Status |
|---|--------|------|--------|
| 1 | apple_user_id DB column + migration | models.py + alembic migration | ✅ |
| 2 | POST /api/auth/apple endpoint | auth/router.py | ✅ |
| 3 | AppleAuthRequest schema | schemas.py | ✅ |
| 4 | pyjwt + requests dependencies added | requirements.txt | ✅ |
| 5 | Sign in with Apple entitlement | RoleVault.entitlements | ✅ |
| 6 | Sign in with Apple button in LoginView | RoleVaultApp.swift | ✅ |
| 7 | signInWithApple method in AuthService | AuthService.swift | ✅ |
| 8 | project.yml → Automatic signing | project.yml | ✅ |

---

### Overall Verdict
PASS — Both screenshot bugs identified, root-caused, and patched. Build succeeds. Entitlements persist across regeneration.
