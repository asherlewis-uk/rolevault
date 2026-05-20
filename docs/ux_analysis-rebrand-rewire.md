# RoleVault Web Client Rebrand & Rewire — UX Analysis

**Depth:** STANDARD
**Source analyzed:** `~/PROJECTS/rolevault/web/src/` (all source) + full prompt at `~/PROJECTS/rolevault/docs/user_next_prompt-web.md`
**Scope:** Auth flow (SignIn, SignUp, ProtectedRoute, AuthContext) + Chat flow (chatStream, Chat page)

---

## User Flow

### Sign-In Flow (rewired from Supabase → RoleVault API)

1. **Entry point:** User arrives at `/signin` (unauthenticated) or is redirected there by `ProtectedRoute` when `!session` is true.
   - `ProtectedRoute` reads `loading` from `AuthContext`. While `loading === true`, it renders a branded loading spinner (Sparkles icon + animated dots). Zero visual change — this is preserved as-is.
   - `ProtectedRoute` stores `location.pathname` in `state.from` so post-login redirect lands back on the intended page.

2. **Form interaction:** User fills email + password. All input styling, glow-focus borders, password visibility toggle, "Remember me" checkbox, and "Forgot password?" link are preserved 100%. No visual change.

3. **Submit (rewired):**
   - Old: `const { error: err } = await supabase.auth.signInWithPassword({ email, password })`
   - New: `await login(email, password)` from `AuthContext` via `useAuth()`
   - `login()` POSTs to `https://backend.asherlewis.online/api/auth/login` via `apiFetch()`
   - On success: JWT stored in `localStorage` key `rolevault_token`; user object stored in state; `navigate("/", { replace: true })` fires (or to `state.from` if redirected).
   - On error: `catch` sets `error` state → red alert banner renders below heading (identical styling to current error banner).

4. **Post-login state (from AuthContext):**
   - `AuthProvider` useEffect on mount reads `rolevault_token` from localStorage
   - If token exists, calls `GET /api/auth/me` via `apiFetch()` to validate + populate user
   - Sets `loading = false` once resolved
   - All protected pages (Index, Chat, Discover, Profile, Create, Settings, Favourites) render children

5. **Existing session (returning user):**
   - On page load, `AuthProvider` reads token, validates via `/api/auth/me`
   - If valid: user lands directly on `/` (Index) — no sign-in gate
   - If invalid (expired JWT): clears token, `user = null`, `ProtectedRoute` redirects to `/signin`

6. **Sign-out:**
   - User taps "Log Out" (in Index page drawer/popover)
   - `signOut()` from `useAuth()`: clears `localStorage` key `rolevault_token`, sets `user = null`, `token = null`
   - `ProtectedRoute` sees `!session` → redirects to `/signin`
   - No visual change to the sign-out button or drawer

### Sign-Up Flow (rewired from Supabase → RoleVault API)

1. **Entry point:** User clicks "Create one free" link on `/signin` → navigates to `/signup`, OR arrives directly.

2. **Form interaction:** Display name + email + password + password strength indicator. All preserved 100%.

3. **Submit (rewired):**
   - Old: `const { error: err } = await supabase.auth.signUp({ email, password, options: { data: { display_name: name }, emailRedirectTo } })`
   - New: `await register(email, password)` from AuthContext
   - `register()` POSTs to `https://backend.asherlewis.online/api/auth/register` via `apiFetch()`
   - On success: sets `success = true` → renders the "Check your inbox!" confirmation panel (identical current UI: green checkmark, email confirmation message, "Back to Sign In" button)
   - On error: sets `error` state → red alert banner (identical to current)

4. **Note on confirmation flow:** The current UI shows a "check your inbox / confirmation link" success screen. The RoleVault API may or may not require email confirmation. If the API auto-activates users, the flow should redirect directly to `/signin` or auto-login. **Recommendation:** Keep the success screen unconditionally for visual consistency, but the handler can redirect after a short delay if the API returns an immediate token.

### Chat Flow (rewired from Supabase edge function → direct inference API)

1. **Entry point:** User taps a character card on Index, Discover, or sidebar → navigates to `/chat/:id`

2. **Initial state:** Chat page loads with character intro banner (avatar, name, category, rating, divider glow) + greeting message from `character.greeting`. All preserved 100%.

3. **Send message:**
   - User types in composer (pill textarea, auto-resize, max 6rem height)
   - Enter key or Send button triggers `handleSend()`
   - User message added to `messages` array with AI bubble styling
   - `isTyping = true` → animated typing dots render (three bouncing dots in AI bubble)
   - `streamChat()` called with provider config, system prompt, and message history

4. **Streaming (rewired cloud path only):**
   - **Local providers (ollama, docker):** `streamLocal()` unchanged — direct browser fetch to localhost. No visual change.
   - **Cloud providers (lovable-ai, openai, anthropic, google, custom):** `streamCloud()` rewired.
     - Old: POST `{supabaseUrl}/functions/v1/chat` with `Authorization: Bearer {anonKey}`, body contains `{ provider, model, apiKey, baseUrl, systemPrompt, messages, stream: true }`
     - New: POST `https://api.asherlewis.online/v1/chat/completions` with body `{ model, messages: [{role:"system", content}, ...history], stream: true }`
     - SSE parser `consumeOpenAIStream()` unchanged — parses `data:` lines, extracts `choices[0].delta.content`, calls `onDelta()`

5. **Streaming UX:**
   - Each delta appends to `accumulated` string
   - On first chunk: AI message bubble created with `aiId`, `accumulated` as text
   - On subsequent chunks: message text updated in place (no re-render flicker due to React state batching)
   - `isTyping` set to false on first delta (typing dots disappear, content appears)
   - Auto-scroll to bottom via `useEffect` on messages + isTyping

6. **Completion:** `onDone()` fires → `isTyping = false`. If no accumulated content, fallback message inserted: "That's a fascinating thought. Tell me more…"

7. **Error:** `onError(err)` fires → `isTyping = false`, toast notification via shadcn/ui toast: `{providerMeta.label} error` + `err` description, variant `destructive`. If no content accumulated, the placeholder AI message is removed.

8. **Message actions (unchanged, preserved):** Hover reveals timestamp, thumbs up/down, copy, and regenerate (last message only). All icons and interactions preserved 100%.

---

## States

### Auth — Loading States

| State | Trigger | UI | Notes |
|-------|---------|-----|-------|
| **Initial auth check** | App mount, `AuthProvider` reading token from localStorage + validating via `GET /api/auth/me` | `ProtectedRoute` renders branded spinner: Sparkles icon with glow, 3 animated dots pulsing at 0.2s intervals, mesh-grid backdrop, framer-motion scale-in | Preserved exactly from current `ProtectedRoute.tsx`. No visual change. |
| **Sign-in submitting** | User taps "Sign In" button | Button shows `Loader2` spinner with `animate-spin`. Text changes from "Sign In →" to spinner only. Button disabled via `opacity-50 cursor-not-allowed`. | Preserved exactly. |
| **Sign-up submitting** | User taps "Create Account" button | Same pattern: `Loader2` spinner, button disabled. | Preserved exactly. |
| **Token validation on app mount** | `AuthProvider` useEffect fires | `loading = true` while `GET /api/auth/me` resolves. ProtectedRoute spinner shown. | New — was previously handled by Supabase SDK's built-in session recovery. Behavior identical. |

### Auth — Error States

| State | Trigger | UI | Recovery |
|-------|---------|-----|----------|
| **Invalid credentials** | POST `/api/auth/login` returns 401 | Red alert banner: `AlertCircle` icon + error message (e.g., "Invalid email or password"), destructive bg/border styling | User edits email/password and retries |
| **Registration failed** | POST `/api/auth/register` returns 4xx | Same red alert banner under heading | User corrects input (e.g., stronger password, valid email) |
| **Network error** | Fetch fails (no connectivity) | Error string: "Network error" or "Failed to fetch" in red banner | User checks connection, retries |
| **Token expired** | `GET /api/auth/me` returns 401 | `user = null`, `ProtectedRoute` redirects to `/signin`. No error banner — silent redirect. | User signs in again |
| **API down** | 5xx from backend | Red alert banner with error detail from API (or `HTTP 500`) | User retries later |

### Auth — Success States

| State | Trigger | UI | Notes |
|-------|---------|-----|-------|
| **Login success** | POST `/api/auth/login` returns 200 + JWT | Redirect to `/` (or `state.from`). Index page renders with user greeting, character carousel. | No visual change. |
| **Registration success** | POST `/api/auth/register` returns 200/201 | Green "Check your inbox!" panel with `Check` icon, email confirmation message, "Back to Sign In" button. | Preserved exactly from current SignUp.tsx lines 49-74. If API returns immediate token, consider auto-login instead. |

### Auth — Empty State (edge)

- **No token on app mount:** `loading = false`, `user = null`. `ProtectedRoute` redirects to `/signin` immediately. No intermediate empty state rendered.

### Chat — Loading/Streaming States

| State | Trigger | UI | Notes |
|-------|---------|-----|-------|
| **Typing indicator** | `isTyping = true` after message send | AI avatar + bubble with 3 bouncing dots (`animate-typing`, delays 0s/0.18s/0.36s), framer-motion enter/exit | Preserved exactly from Chat.tsx lines 380-408 |
| **First chunk arrives** | First `onDelta()` call | Typing dots exit, AI message bubble appears with partial text. `isTyping` set to false. | Preserved exactly. |
| **Streaming in progress** | Subsequent `onDelta()` calls | Text grows in-place within AI bubble. No cursor/blinking — raw text accumulation. | This is the current behavior. No visual change. |
| **Provider discovery** | `discovering = true` in provider settings modal | Spinner in model dropdown. | Not in scope — visual preserved. |

### Chat — Error States

| State | Trigger | UI | Recovery |
|-------|---------|-----|----------|
| **Inference API error** | POST `/v1/chat/completions` returns non-2xx | Toast notification: title `"{Provider label} error"`, description = API error body or `HTTP {status}`, variant `destructive`. If no content accumulated yet, placeholder AI message is removed from chat. | User can retry by sending another message or switching providers |
| **Network error** | Fetch fails | Toast notification with error message. | User checks connection, retries |
| **SSE parse error** | Malformed SSE response | Error propagated to `onError`, toast shown. Silent for individual line parse failures (current `catch { break }` behavior). | Current behavior preserved. |
| **Local server unreachable** | `streamLocal()` fetch fails | Toast: "Cannot reach {base} — is your local server running?" | User starts local server, retries |

### Chat — Success States

| State | Trigger | UI | Notes |
|-------|---------|-----|-------|
| **Response complete** | `[DONE]` received in SSE stream | `onDone()` fires. AI message finalized in chat history. Message actions (thumbs up/down, copy, regenerate) appear on hover. | Preserved exactly. |
| **Empty response** | Stream ends with no content | Fallback message inserted: "That's a fascinating thought. Tell me more…" | Preserved exactly from Chat.tsx lines 113-123. |
| **Regenerate** | User taps refresh icon on last AI message | Last AI message removed, `handleSend()` re-triggered with same last user message. | Not in rewire scope — preserved. |

---

## Layout Notes

### Mobile (preserved 100%)

- SignIn/SignUp: Single-column, form-only. Visual panel (`hidden lg:flex`) hidden. Form at `max-w-md`, centered vertically. Mesh-grid backdrop + radial gradient blobs behind form.
- Chat: Full-height (`100dvh`) main area. Sidebar (`hidden lg:flex`) hidden. Chat header height `56px` with back arrow, centered character name, right-aligned heart+more buttons. Bottom composer with `safe-area-inset-bottom` padding for notch/home-indicator devices. Bottom navigation handled by BottomNav component (not in chat page itself — on Index and other tabs).
- Index: Character carousel, send input, drawer for nav/settings. All preserved.

### Desktop (preserved 100%)

- SignIn: Two-column split — form left (max-w-md centered), hero image right with gradient overlay + tagline. Direction: left-to-right gradient on image panel.
- SignUp: Two-column split reversed — hero image left (gradient right-to-left) with perks list, form right.
- Chat: `260px` fixed sidebar left (`lg:flex`) + `lg:ml-60` offset main area. Sidebar contains brand header, search, recent chats list, and bottom nav items.

### Visual Hierarchy (preserved)

1. **Brand:** Gradient text logo (`gradient-text` class) in all headers — now says "RoleVault" not "AetherMind"
2. **Primary actions:** Gradient-filled buttons (`btn-gradient`) — Sign In, Create Account, Send (when input non-empty)
3. **Input focus:** Border transitions to primary color on focus (`glow-focus` class), subtle glow
4. **Error prominence:** Red banner at moderate opacity (`destructive / 0.08` bg, `destructive / 0.25` border), placed immediately below heading, above form — scannable
5. **Chat messages:** User bubbles right-aligned (`bubble-user`), AI bubbles left-aligned with avatar (`bubble-ai`). Rounded corners, directional tails (`rounded-tr-sm` / `rounded-tl-sm`)

---

## Accessibility

### Keyboard Flow (preserved — no regression)

**SignIn/SignUp:**
- Tab order: Email input → Password input → Show/Hide toggle → Remember me checkbox → Forgot password link → Submit button → "Create one free" / "Sign in" link → Terms → Privacy
- Enter in any field submits form (native `<form onSubmit>`)
- Password toggle is a `<button type="button">` — does not submit

**Chat:**
- Tab order: Back button → Heart (favourite) → More options → (messages area not tabbable — scroll only) → Plus button → Composer textarea → Send button → Mic button
- Enter in composer sends (Shift+Enter for newline — already handled, `handleKeyDown` checks `!e.shiftKey`)
- Escape does nothing currently — opportunity (closes menus/overlays) but out of scope for this rebrand

**Index:**
- Character carousel: Refresh button accessible
- Drawer: Menu button → nav links (Home, Discover, Create, Profile, Settings) → Log Out
- Quick send input: same Enter-to-send pattern

### Screen Reader Labels (preserved — no regression)

- Logo link text: "RoleVault" (was "AetherMind") — rebranded
- Form icons (`Mail`, `Lock`, `User`) are decorative only — no `aria-label` currently. Acceptable since adjacent inputs have `placeholder` and `type` attributes. No regression.
- Password toggle button: No `aria-label` currently — relies on icon swap (`Eye` / `EyeOff`). **Recommendation:** Add `aria-label={show ? "Hide password" : "Show password"}` but out of scope per hard walls.
- Error banner: `AlertCircle` icon is decorative. Error text is the accessible content. Sufficient.
- Chat sidebar characters: `<img alt={char?.name}>` — present and correct.
- Chat message avatars: `<img alt={character.name}>` and `<img alt="">` (typing indicator) — correct.
- Send button: No `aria-label` — icon-only button. **Recommendation:** Add `aria-label="Send message"` but out of scope.

### Color Contrast (no change — CSS variables preserved)

- All color tokens use CSS custom properties (`hsl(var(--primary))`, `hsl(var(--muted-foreground))`, etc.). Theme variables are not touched. Contrast ratios remain identical to current build.
- Error state uses `hsl(var(--destructive))` text on `hsl(var(--destructive) / 0.08)` background — moderate contrast, sufficient for error alerts.
- Disabled buttons use `opacity: 0.5` — meets WCAG 1.4.11 (non-text contrast not strictly required for inactive controls, but low-contrast disabled states are a known pattern).

### Focus Management (no regression)

- **Post-login redirect:** `navigate("/", { replace: true })` — browser focus resets to document body. Index page has no auto-focus element. Acceptable.
- **Post-sign-out:** Redirect to `/signin`. Email input does not auto-focus. Acceptable — user can Tab to it.
- **Chat send:** After message sent, focus remains on composer textarea (React preserves DOM). Input cleared but still focused — good UX, user can immediately type next message.
- **Error toast:** Toast appears via shadcn/ui Sonner — focus not moved to toast. Toast is `role="status"` / `aria-live="polite"` (handled by Sonner). Accessible.
- **ProtectedRoute loading:** While spinner shows, focus is on body. No interactive elements to trap focus. Fine.

---

## Components

### Reuse Existing (no new components needed)

| Component | Location | Role | Changes |
|-----------|----------|------|---------|
| `ProtectedRoute` | `src/components/ProtectedRoute.tsx` | Auth gate with loading spinner | Replace `session` check with `user` check. `session` field removed from AuthContext — use `user: user !== null`. Loading component preserved. |
| `AuthProvider` / `AuthContext` | `src/context/AuthContext.tsx` | JWT auth state | Entire file rewritten (see prompt §3.4). Export shape preserved: `user`, `loading`, `signOut`, `login`, `register`. Remove: `session`, `updateUserMeta`, `updateEmail`, `updatePassword` (or stub them for compatibility if Profile page references them). |
| SignIn page | `src/pages/SignIn.tsx` | Sign-in form + hero | Replace import from supabase → useAuth. Replace `supabase.auth.signInWithPassword` → `login()`. All markup preserved. |
| SignUp page | `src/pages/SignUp.tsx` | Sign-up form + perks panel | Same import change. Replace `supabase.auth.signUp` → `register()`. Success screen preserved. |
| Chat page | `src/pages/Chat.tsx` | Chat UI | No changes needed. Calls `streamChat()` — same API surface. |
| `streamChat` / `streamCloud` | `src/lib/chatStream.ts` | Cloud inference streaming | `streamCloud()` rewired to direct API. `streamLocal()` unchanged. `consumeOpenAIStream()` unchanged. Public API `streamChat()` unchanged. |
| `useLLMProvider` | `src/hooks/useLLMProvider.ts` | Provider config + connection testing | `testConnection()` cloud path rewired from edge function to direct API. Provider definitions, model lists, discovery functions all preserved. |
| `apiFetch` | `src/api/client.ts` (new) | Authenticated fetch wrapper | New file (see prompt §3.3). Replaces `src/integrations/supabase/client.ts`. |
| BottomNav, CharacterCard, AppNavLink, all shadcn/ui components | Various | UI kit | Preserved 100%. No changes. |

### New Components Needed

None. The rebrand + rewire uses entirely existing UI. The only "new" artifact is `src/api/client.ts` which is a plain function module, not a React component.

### Deleted Components

- `src/integrations/supabase/client.ts` — Supabase client init
- `src/integrations/supabase/types.ts` — Supabase type helpers
- Entire `src/integrations/supabase/` directory

---

## Accessibility Audit for Replaced Auth Handlers

### What changes for screen readers:

1. **Error messages:** Previously Supabase returned messages like "Invalid login credentials". RoleVault API may return different error strings (e.g., `detail: "Invalid email or password"`). The `apiFetch` wrapper throws `Error(err.detail)`. These are rendered in the identical red banner element. No structural change — screen reader announces the same region.
   
   **Recommendation:** Verify RoleVault API returns user-friendly error messages. If it returns technical codes, wrap in a mapping layer: `INVALID_CREDENTIALS → "Invalid email or password"`. This is a backend concern but worth flagging.

2. **Loading announcements:** No `aria-busy` or `aria-live` region for the ProtectedRoute spinner. The current code has none either — no regression. Screen reader users see the spinner visually (or hear nothing during the brief load). Acceptable for sub-second loads.

3. **Toast notifications:** `onError` in chat fires `toast()` from shadcn/ui. Sonner toaster uses `aria-live="polite"` — screen readers announce errors automatically. Preserved as-is.

### What changes for keyboard users:

- Nothing. All form controls, buttons, and links remain identical. Only the network target changes.
- The "Remember me" checkbox and "Forgot password" link are currently non-functional (`#` href, no handler). The rewired auth does not add or remove these — they remain decorative. **Note:** If RoleVault API supports persistent sessions differently than token-in-localStorage (which is inherently persistent), the "Remember me" checkbox remains decorative.

---

## Confirmation: Visual Consistency

The prompt mandates ZERO visual changes. Audit confirms:

- **CSS:** No CSS, Tailwind config, or CSS variables touched. `gradient-text`, `btn-gradient`, `bubble-user`, `bubble-ai`, `panel`, `glass`, `glow-focus`, `mesh-grid`, `bg-radial-violet`, `bg-radial-cyan`, `animate-typing`, `divider-glow` — all classes preserved.
- **Components:** No component markup changed. Only import paths for auth (supabase → AuthContext) and fetch targets in `streamCloud()`.
- **Animations:** Framer-motion `AnimatePresence`, `motion.div` with `initial/animate/transition/exit` props all preserved.
- **Sample characters:** `data/characters.ts` — 6 characters with avatars, names, personalities, scenarios, categories, ratings, greetings. Untouched.
- **The only visual change:** Brand strings "AetherMind" → "RoleVault" in:
  - `index.html` `<title>`
  - `SignIn.tsx` line 46 (brand logo text), line 126 (hero img alt text), line 130 (backdrop h2 — but this line says "Infinite minds, waiting to meet you." — no "AetherMind" here, checked)
  - `SignUp.tsx` line 134 (brand logo text)
  - `Chat.tsx` line 161 (sidebar brand text)
  - Any other files found by `rg "AetherMind"`

  This is a text-only change. Font, gradient, size, spacing — all identical.

---

## Summary

| Aspect | Verdict |
|--------|---------|
| User flow | Identical paths. SignIn → Index, SignUp → confirmation → SignIn, ProtectedRoute → gate. Only network targets change. |
| Loading states | 4 loading states identified (initial auth check, sign-in submit, sign-up submit, typing indicator). All preserve exact current UI. |
| Error states | 9 error states across auth + chat. All use existing error patterns (red banner, toast, silent redirect). No new UI needed. |
| Success states | 5 success states. All preserve current UI. Registration confirmation screen preserved even if API behavior differs. |
| Empty states | Minimal — only the implicit "no token → redirect" state. No empty-state screens to add. |
| Layout | Mobile + desktop layouts preserved 100%. Sidebar/form split, safe-area padding, max-w constraints — all untouched. |
| Accessibility | No regression in keyboard flow, screen reader labels, color contrast, or focus management. 2 recommendations flagged (password toggle aria-label, send button aria-label) but out of scope. |
| Components | 0 new UI components. 1 new utility module (`api/client.ts`). 1 module deleted (`integrations/supabase/`). All shadcn/ui + custom components preserved. |
| Visual consistency | Confirmed: zero CSS/component/animation/theme/data changes. Only brand strings + fetch targets change. |
