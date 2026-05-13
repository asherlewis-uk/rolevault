# Branch Audit Report
## `feat--Enhance-character-and-user-management-with-per-user-customizations`
**Base:** `main` (`37128b8`)  
**Feature Commit:** `ee4cc3350a8ddd31e7eac7b01dfb24fe71cf2ae8`  
**Date:** 2026-05-13  
**Auditor:** Kimi Code CLI  

---

## 1. Executive Summary

This branch introduces a **multi-user data-scoping layer** on top of RoleVault's previously unscoped SwiftData schema. It adds `UserAccount` persistence, per-user `CharacterCustomization` overlays, and `userId`/`ownerUserId` foreign keys across `Conversation`, `MessageWrapper`, `Persona`, `JournalEntry`, `GalleryMoment`, and `Character`. The architectural intent is sound — separating shared canonical characters from per-user customizations — but the implementation contains **critical data-integrity, security, and reactivity regressions** that make it unsafe to merge without remediation.

**Key findings:**
- **Orphaned data on deletion**: Removing SwiftData `@Relationship` cascade rules without adding manual cleanup in `CharacterStore.delete(_:)` causes permanent orphaned `JournalEntry`, `GalleryMoment`, `Conversation`, `MessageWrapper`, and `CharacterCustomization` records.
- **Cross-user data leakage**: `AuthService.migrateUnscopedData(to:)` runs on every login, unconditionally claiming all legacy unscoped data for the newly-authenticated user. If user A logs out and user B logs in on the same device, B inherits A's conversations, messages, personas, journal entries, gallery moments, and character ownership.
- **Reactivity loss**: Replacing `@Query` with `@State` + one-shot `.task` in `ChatsGalleryView`, `ActivityCenterView`, `PersonaManagerView`, and `ChatDetailView` breaks live SwiftData updates. Users will see stale conversation previews, missing gallery moments, and outdated persona lists until views are recreated.
- **Silent failures**: `EditCharacterSheet.save()`, `PersonaManagerView.save()`, and `ChatViewModel.loadConversation()` all silently drop errors or return early without user feedback, producing misleading success haptics or invisible no-ops.
- **Race condition**: `AuthService.init` spawns an unstructured `Task` to fetch `currentUser`, creating a race with views that read `AuthService.shared.currentUser?.id` synchronously in `.task`/`.onAppear`.

**Merge readiness:** **NOT READY** without fixes. The branch introduces more regressions than it solves. A targeted fix pass (estimated 8–12 files, ~200 lines) can bring it to mergeable state.

---

## 2. Branch Overview

### 2.1 Commit Metadata
```
commit ee4cc3350a8ddd31e7eac7b01dfb24fe71cf2ae8
Author: Kasey Upton <ceo@asherlewis.uk>
Date:   Wed May 13 13:34:21 2026 -0500

    feat: Enhance character and user management with per-user customizations
```

### 2.2 Changed Files (non-binary, non-.DS_Store)
| File | Δ Lines | Nature |
|------|---------|--------|
| `AGENTS.md` | +47 / −13 | Documentation update (partially incorrect) |
| `ios/RoleVault.xcodeproj/project.pbxproj` | +8 | Adds `CharacterCustomization.swift`, `UserAccount.swift` to build |
| `ios/RoleVault/API/AuthService.swift` | +138 / −1 | User account persistence, migration logic, `currentUser` state |
| `ios/RoleVault/API/TokenInterceptor.swift` | +1 | Clears `currentUser` on token refresh failure |
| `ios/RoleVault/Data/CharacterStore.swift` | +173 / −49 | Customization CRUD, effective prompt builder, journal entry helpers |
| `ios/RoleVault/Data/Models/Character.swift` | +21 / −21 | Adds `ownerUserId`, removes `isFavorite`, removes `@Relationship` properties |
| `ios/RoleVault/Data/Models/CharacterCustomization.swift` | +94 | **New** per-user overlay model |
| `ios/RoleVault/Data/Models/Conversation.swift` | +3 | Adds `userId` optional |
| `ios/RoleVault/Data/Models/GalleryMoment.swift` | +9 / −1 | Adds `userId`, removes `var character: Character?` |
| `ios/RoleVault/Data/Models/JournalEntry.swift` | +9 / −1 | Adds `userId`, removes `var character: Character?` |
| `ios/RoleVault/Data/Models/MessageWrapper.swift` | +4 / −1 | Adds `userId` optional |
| `ios/RoleVault/Data/Models/Persona.swift` | +5 / −1 | Adds `userId` optional |
| `ios/RoleVault/Data/Models/UserAccount.swift` | +39 | **New** local user account model |
| `ios/RoleVault/Data/SwiftDataContainer.swift` | +4 / −2 | Registers `UserAccount`, `CharacterCustomization` in schema |
| `ios/RoleVault/ViewModels/ChatViewModel.swift` | +52 / −33 | User-scoped message caching, conversation management |
| `ios/RoleVault/ViewModels/CreateCharacterViewModel.swift` | +27 / −7 | Associates journal entries with creating user, sets `ownerUserId` |
| `ios/RoleVault/ViewModels/HomeViewModel.swift` | +9 / −2 | Per-user favorite toggle/query |
| `ios/RoleVault/ViewModels/ProfileViewModel.swift` | +56 / −8 | User-scoped persona/cache clearing |
| `ios/RoleVault/Views/Activity/ActivityCenterView.swift` | +25 / −5 | Loads user-scoped conversations/moments |
| `ios/RoleVault/Views/Chats/ChatDetailView.swift` | +17 / −6 | Replaces `@Query personas` with `@State` + `loadPersonas()` |
| `ios/RoleVault/Views/Chats/ChatsGalleryView.swift` | +26 / −5 | Replaces `@Query` with `@State` + `loadData()` |
| `ios/RoleVault/Views/Chats/EditCharacterSheet.swift` | +51 / −7 | Owner vs non-owner edit paths |
| `ios/RoleVault/Views/Profile/PersonaManagerView.swift` | +27 / −5 | Replaces `@Query` with `@State` + `loadPersonas()` |

### 2.3 Functional Changes
- **Multi-user scoping**: All chat-related local data now carries an optional `userId` or `ownerUserId`.
- **Character ownership**: `Character.ownerUserId` determines edit rights. Non-owners create a `CharacterCustomization` overlay instead of mutating the base.
- **User account persistence**: `AuthService` now maintains a `currentUser: UserAccount?` fetched from SwiftData.
- **Legacy migration**: On every login, unscoped rows (`userId == nil` / `ownerUserId == nil`) are claimed by the current user.
- **Favorites per-user**: `Character.isFavorite` removed from base model; moved to `CharacterCustomization.isFavorite`.

### 2.4 Architectural Changes
- **Relationship → Foreign Key**: SwiftData `@Relationship` properties on `Character` (to `JournalEntry`, `GalleryMoment`) were removed in favor of scalar `UUID` foreign keys. This breaks cascade deletion.
- **View reactivity model shift**: Four views moved from `@Query` (reactive) to `@State` + manual fetch (non-reactive).
- **Prompt assembly duplication**: `CharacterStore.effectiveSystemPrompt(character:userId:)` duplicates the prompt-building logic from `Character.formattedSystemPrompt` with customization merging.

### 2.5 Security Implications
- **Data leakage between users** (Critical): `migrateUnscopedData` runs on every login without a device-scoped gate, allowing user B to inherit user A's legacy data.
- **Orphaned data accumulation** (High): Deleted characters leave behind all related records, which may contain sensitive chat history, journal entries, and gallery moments.
- **Persona active-state bleed** (Medium): `Persona.isActive` is not globally scoped; two users can simultaneously have active personas, and unscoped queries may return the wrong one.

### 2.6 Performance Implications
- **O(N) per-cell database fetches** (Medium): `HomeViewModel.isFavorite(_:)` performs a synchronous `fetchCustomization` on every view evaluation. A list of 50 characters triggers 50 separate SwiftData fetches.
- **Multiple saves in batch operations** (Low): `ProfileViewModel.clearAllLocalData()` delegates to helpers that each call `save()`, then calls `save()` again at the end.

### 2.7 Database/Model/Schema Impacts
- **Schema additions**: `UserAccount`, `CharacterCustomization` added to `ModelContainer`. SwiftData will auto-migrate existing stores.
- **Relationship removal**: Removing `@Relationship(deleteRule: .cascade)` from `Character` means existing data is unaffected, but future deletions will orphan rows.
- **Optional foreign keys**: All new `userId` fields are `UUID?`, preserving backwards compatibility for unscoped legacy rows.

### 2.8 API Contract Changes
- **Tavern V2 export regression**: `buildTavernV2JSON` hard-codes `"entries": []`, dropping journal/lorebook data from exported PNGs.
- **Tavern V2 import regression**: `parseTavernV2JSON` no longer parses `character_book.entries` into `JournalEntry` records (relationship removal side effect).

### 2.9 UI/UX Changes
- EditCharacterSheet now shows a customization note for non-owners.
- Name/subtitle fields are disabled for non-owners.
- ChatsGalleryView, ActivityCenterView, PersonaManagerView, ChatDetailView load data scoped to current user.
- **UX regression**: Stale data in lists due to `@Query` → `@State` migration.
- **UX regression**: Silent save failures in EditCharacterSheet and PersonaManagerView.

### 2.10 Dependency/Configuration Changes
- `project.pbxproj` updated to include new Swift files. No new external dependencies.

---


## 3. File-by-File Audit

### 3.1 `ios/RoleVault/Data/Models/Character.swift`
**Base lines:** 213  
**Feature lines:** 210  
**Key changes:**
- Added `ownerUserId: UUID?` (line 16).
- Removed `isFavorite: Bool` (was line 11).
- Removed `@Relationship(deleteRule: .cascade, inverse: \JournalEntry.character) var journalEntries: [JournalEntry]?` (was lines 36–37).
- Removed `@Relationship(deleteRule: .nullify, inverse: \GalleryMoment.character) var galleryMoments: [GalleryMoment]?` (was lines 39–40).
- Updated `formattedSystemPrompt` comment to reference `CharacterStore.effectiveSystemPrompt`.

**Impact:** The removal of `@Relationship` properties means `CharacterStore.delete(_:)` no longer triggers cascade/nullify deletion. `JournalEntry`, `GalleryMoment`, `Conversation`, `MessageWrapper`, and `CharacterCustomization` records referencing the deleted character's ID will become orphaned. This is a **data-integrity regression**.

**Call paths affected:**
- `CharacterStore.delete(_:)` → `context.delete(character)` → `context.save()`
- `HomeViewModel.deleteCharacter(_:)` → `CharacterStore.shared.delete(character)`
- Any view calling `HomeViewModel.deleteCharacter`

---

### 3.2 `ios/RoleVault/Data/Models/CharacterCustomization.swift` (NEW)
**Lines:** 94  
**Purpose:** Per-user overlay on a shared `Character`.

**Schema:**
- `@Attribute(.unique) var id: UUID`
- `var userId: UUID`, `var characterId: UUID` (scalar foreign keys, **not** `@Relationship`)
- Optional override fields: `backstory`, `greetingMessage`, `awayMessage`, etc.
- `var interactionModeRaw: String?` with computed `interactionMode: InteractionMode?`
- `var isFavorite: Bool`

**Issue:** The computed `interactionMode` property (lines 69–77) is **not persisted** by SwiftData. Only `interactionModeRaw` is stored. `#Predicate { $0.interactionMode == .companion }` will **not compile** because `interactionMode` is a computed property. This diverges from `Character.interactionMode` which is a stored `RawRepresentable` enum directly supported by SwiftData.

**Call paths:**
- `CharacterStore.ensureCustomization(characterId:userId:)` → creates instance
- `CharacterStore.updateCustomization(_:)` → saves changes
- `CharacterStore.effectiveSystemPrompt(character:userId:)` → reads override fields
- `EditCharacterSheet.save()` → writes override fields

---

### 3.3 `ios/RoleVault/Data/Models/UserAccount.swift` (NEW)
**Lines:** 39  
**Purpose:** Local cache of authenticated LibreChat user.

**Schema:**
- `id: UUID` (local), `remoteId: String` (server), `email`, `name`, `username`, `avatarUrl`
- `isCurrent: Bool` — exactly one user should be `isCurrent == true` at a time.

**Issue:** No unique constraint or index on `isCurrent`. The code in `AuthService.persistUserAccount` loops over all users to set `isCurrent = false`, which is an O(N) operation. If multiple `UserAccount` records somehow end up with `isCurrent == true`, `fetchCurrentUser()` returns the first match arbitrarily.

**Call paths:**
- `AuthService.login(email:password:)` → `persistUserAccount(remoteUser:)`
- `AuthService.init` → `Task { fetchCurrentUser() }`
- `AuthService.checkAuth()` → `Task { fetchCurrentUser() }`
- All views reading `AuthService.shared.currentUser?.id`

---

### 3.4 `ios/RoleVault/Data/Models/Conversation.swift`
**Change:** Added `userId: UUID?` (line 17, init line 30).

**Impact:** Existing conversations get `userId == nil` (legacy). New conversations created by `ChatViewModel.ensureLocalConversation(character:persona:userId:)` are correctly scoped. The `ChatViewModel.updateConversationPreview` and `ChatViewModel.loadCachedMessages` predicates now include `userId` filtering.

**Call paths:**
- `ChatViewModel.ensureLocalConversation(...)` → insert with `userId`
- `ChatsGalleryView.loadData()` → fetch with `#Predicate { $0.userId == userId }`
- `ActivityCenterView.loadUserScopedData()` → same
- `ProfileViewModel.clearConversationCache()` → delete where `userId == userId`

---

### 3.5 `ios/RoleVault/Data/Models/GalleryMoment.swift`
**Change:** Added `userId: UUID?`; removed `var character: Character?`.

**Impact:** Similar to `Conversation`. The removal of `var character: Character?` means no inverse relationship; deleting a `Character` does not clean up associated `GalleryMoment` records.

**Call paths:**
- `ChatViewModel.saveGalleryMoment(...)` → insert with `userId`
- `ChatsGalleryView.loadData()` → fetch with `userId` filter
- `ProfileViewModel.clearGalleryCache()` → delete where `userId == userId`

---

### 3.6 `ios/RoleVault/Data/Models/JournalEntry.swift`
**Change:** Added `userId: UUID?`; removed `var character: Character?`.

**Impact:** `JournalEntry` is now created with `userId` in `CreateCharacterViewModel.save()` and fetched with `userId` in `CharacterStore.fetchJournalEntries(characterId:userId:)`. The removal of `var character: Character?` breaks the old cascade delete and the old import path (see `CharacterStore.parseTavernV2JSON`).

**Call paths:**
- `CreateCharacterViewModel.save()` → `CharacterStore.insertJournalEntry(entry)`
- `ChatViewModel.triggeredJournalEntries(...)` → `CharacterStore.fetchJournalEntries(characterId:userId:)`
- `CharacterStore.buildTavernV2JSON` → no longer serializes entries (hardcodes `[]`)

---

### 3.7 `ios/RoleVault/Data/Models/MessageWrapper.swift`
**Change:** Added `userId: UUID?`.

**Impact:** Messages are now cached with `userId` in `ChatViewModel.cacheMessage` and loaded with `userId` in `loadCachedMessages`. Existing unscoped messages remain visible to all users until migration runs.

**Call paths:**
- `ChatViewModel.cacheMessage` → insert with `userId`
- `ChatViewModel.loadCachedMessages` → fetch with `userId` filter
- `ProfileViewModel.clearAllLocalData()` → delete where `userId == userId`

---

### 3.8 `ios/RoleVault/Data/Models/Persona.swift`
**Change:** Added `userId: UUID?`.

**Impact:** Personas are now created with `userId` and fetched with `userId` filter. However, `isActive` remains a plain boolean on the model without user-scoping. `ProfileViewModel.setActivePersona(_:)` correctly limits the toggle to personas matching the current `userId`, but the underlying model still allows two users to each have an active persona.

**Call paths:**
- `ProfileViewModel.createPersona(...)` → insert with `userId`
- `PersonaManagerView.loadPersonas()` → fetch with `userId` filter
- `ChatDetailView.loadPersonas()` → fetch with `userId` filter
- `ProfileViewModel.setActivePersona(_:)` → toggle within filtered set

---

### 3.9 `ios/RoleVault/Data/SwiftDataContainer.swift`
**Change:** Added `UserAccount.self` and `CharacterCustomization.self` to schema array.

**Impact:** SwiftData will auto-migrate existing stores to include the new models. No destructive changes.

---

### 3.10 `ios/RoleVault/Data/CharacterStore.swift`
**Major changes:**
1. **Customization CRUD** (lines 63–92): `fetchCustomization`, `ensureCustomization`, `updateCustomization`, `deleteCustomization`, `toggleFavorite`, `effectiveIsFavorite`.
2. **Effective prompt builder** (lines 111–161): `effectiveSystemPrompt(character:userId:)` — duplicates `Character.formattedSystemPrompt` logic with customization merging.
3. **Journal helpers** (lines 165–183): `fetchJournalEntries`, `insertJournalEntry`, `deleteJournalEntry`.
4. **Tavern V2 export** (line 247): `"entries": []` hardcoded.
5. **Tavern V2 import** (lines 255–279): `parseTavernV2JSON` no longer parses `character_book.entries`; `ownerUserId` parameter added.

**Issues:**
- `delete(_:)` still only deletes the `Character`; no cleanup of related records.
- `effectiveSystemPrompt` duplicates logic and omits `awayMessage` (coincidentally matching base, but maintenance hazard).
- `buildTavernV2JSON` drops journal entries from exports.
- `parseTavernV2JSON` drops journal entries from imports.

**Call paths:**
- `HomeViewModel.toggleFavorite` → `toggleFavorite(characterId:userId:)`
- `HomeViewModel.isFavorite` → `effectiveIsFavorite(character:userId:)` (called from view body)
- `ChatViewModel.buildSystemPrompt` → `effectiveSystemPrompt(character:userId:)`
- `CreateCharacterViewModel.save` → `insertJournalEntry`
- `CharacterStore.exportToPNG` → `buildTavernV2JSON`
- `CharacterStore.importFromPNG` → `parseTavernV2JSON`

---

### 3.11 `ios/RoleVault/API/AuthService.swift`
**Major changes:**
1. Added `var currentUser: UserAccount?` (line 10).
2. `init` spawns `Task { @MainActor in self.currentUser = try? fetchCurrentUser() }` (lines 14–16).
3. `login` calls `persistUserAccount(remoteUser:)` (lines 35–37).
4. `logout` sets `currentUser = nil` (line 50).
5. `checkAuth` spawns another `Task` to reload `currentUser` (lines 57–59).
6. `persistUserAccount` marks previous users as not current, finds/creates `UserAccount`, saves, then calls `migrateUnscopedData(to:)` (lines 65–106).
7. `migrateUnscopedData` fetches all unscoped records and assigns `userId` / `ownerUserId` (lines 122–175).

**Issues:**
- Unstructured `Task` in `init` creates race with views (Copilot #3).
- `migrateUnscopedData` runs on every login, leaking data between users (Copilot #5).
- Redundant conditional casts `as? [Conversation]` etc. (Copilot #4).
- `try? context.save()` in `persistUserAccount` silently ignores save failures.

**Call paths:**
- App launch → `AuthService.shared` (lazy static) → `init` → async `fetchCurrentUser`
- Login flow → `AuthService.login` → `persistUserAccount` → `migrateUnscopedData`
- Logout flow → `AuthService.logout` → `currentUser = nil`
- Token refresh failure → `TokenInterceptor.clearTokens` → `AuthService.shared.currentUser = nil`
- All view `.task` / `.onAppear` blocks reading `AuthService.shared.currentUser?.id`

---

### 3.12 `ios/RoleVault/API/TokenInterceptor.swift`
**Change:** Added `AuthService.shared.currentUser = nil` on token refresh failure (line 64).

**Impact:** Positive — ensures local user state is cleared when auth is invalidated.

---

### 3.13 `ios/RoleVault/ViewModels/ChatViewModel.swift`
**Changes:**
- `loadConversation` now `guard let userId = AuthService.shared.currentUser?.id else { return }` after setting `currentCharacterId` and `currentPersonaId` (lines 16–19).
- `sendMessage` adds `guard let userId = AuthService.shared.currentUser?.id else { return }` (line 55).
- `buildSystemPrompt` now calls `CharacterStore.shared.effectiveSystemPrompt(character:userId:)` (line 149).
- `triggeredJournalEntries` now fetches via `CharacterStore.fetchJournalEntries(characterId:userId:)` (lines 163–166).
- `saveGalleryMoment` now requires `userId` (lines 180–191).
- `ensureLocalConversation` predicate now includes `userId` (line 218).
- `cacheMessage` and `loadCachedMessages` now include `userId` filtering.

**Issues:**
- In `loadConversation`, `currentCharacterId` and `currentPersonaId` are mutated **before** the `guard let userId` check. If `userId` is nil, the method returns early leaving `messages` unchanged (stale data) but IDs pointing to the new character (Copilot #7).
- In `sendMessage`, the user message is appended to `messages` before the `userId` guard. If `userId` is nil, the message is visible locally but never cached.
- `buildSystemPrompt` and `triggeredJournalEntries` are now `@MainActor` but called from nonisolated `sendMessage` via `await`. This is correct (`await` hops to MainActor).

**Call paths:**
- `ChatDetailView.task` → `loadConversation(character:persona:)`
- `ChatDetailView.sendMessage` → `viewModel.sendMessage(text:character:persona:)`
- `ChatDetailView.setActivePersona` → `viewModel.switchPersona(to:character:)` → `loadConversation`
- `EditCharacterSheet.onRefreshChat` → `viewModel.refreshChat(for:)` → `loadConversation`

---

### 3.14 `ios/RoleVault/ViewModels/CreateCharacterViewModel.swift`
**Changes:**
- `buildCharacter()` now sets `ownerUserId = AuthService.shared.currentUser?.id` (lines 132, 146).
- `save()` now extracts `userId` and inserts journal entries via `CharacterStore.shared.insertJournalEntry(entry)` with `userId` (lines 94–110).
- Removed `character.journalEntries?.append(entry)` from `buildCharacter()`.

**Issues:**
- If user is not authenticated, `ownerUserId` is nil and journal entries are not persisted. The character is still inserted into the shared pool. This matches the documented intent ("Nil for legacy data or globally-shared imports").
- Journal entries from `buildCharacter()` are no longer attached to the character model directly. This is fine since the relationship was removed, but it means `Character.journalEntries` is always nil in the new schema.

**Call paths:**
- `CreateCharacterView` → `viewModel.save()` → `buildCharacter()` + `insertJournalEntry`

---

### 3.15 `ios/RoleVault/ViewModels/HomeViewModel.swift`
**Changes:**
- `toggleFavorite` now takes `characterId` and `userId`, calls `CharacterStore.shared.toggleFavorite(characterId:userId:)` (lines 41–48).
- Added `isFavorite(_:)` which calls `CharacterStore.shared.effectiveIsFavorite(character:userId:)` (lines 52–55).

**Issues:**
- `isFavorite` is called from SwiftUI view body (e.g., inside `ForEach` to render star icons). Each call performs a synchronous SwiftData fetch (`fetchCustomization`). For a list of N characters, this is N database queries per view update (Copilot #11).
- `deleteCharacter` does not delete associated `CharacterCustomization` records for the character. If a character is deleted, its customizations become orphaned.

**Call paths:**
- `HomeView` body → `HomeViewModel.isFavorite(character)` (per cell)
- `HomeView` → `HomeViewModel.toggleFavorite(character)`
- `HomeView` → `HomeViewModel.deleteCharacter(character)`

---

### 3.16 `ios/RoleVault/ViewModels/ProfileViewModel.swift`
**Changes:**
- `createPersona` now passes `userId = AuthService.shared.currentUser?.id` (lines 22–30).
- `setActivePersona` now filters by `userId` (lines 43–52).
- `clearConversationCache` and `clearGalleryCache` now filter by `userId` (lines 78–103).
- `clearAllLocalData` now filters all deletions by `userId` and adds `CharacterCustomization` cleanup (lines 106–147).

**Issues:**
- `clearAllLocalData` calls `clearConversationCache()` and `clearGalleryCache()`, each with its own `guard let userId` and `try? context.save()`. After those, it performs more deletes and another `try? context.save()`. If an intermediate save fails, partial state occurs with no error surfaced (Copilot #12).
- `createPersona` allows nil `userId`. The persona is inserted with `userId == nil` and becomes invisible to all filtered queries (also noted in CodeRabbit comment).

**Call paths:**
- `ProfileView` → `ProfileViewModel.logout()` / `clearAllLocalData()`
- `PersonaManagerView` → `ProfileViewModel.createPersona(...)` / `setActivePersona(...)` / `deletePersona(...)`

---

### 3.17 `ios/RoleVault/Views/Chats/EditCharacterSheet.swift`
**Changes:**
- Added `isOwner` and `showCustomizationNote` state (lines 14–15).
- `onAppear` computes `isOwner = (character.ownerUserId == currentUserId)` (lines 68–69).
- `save()` branches: owner edits base character directly; non-owner creates/updates `CharacterCustomization` (lines 81–111).

**Issues:**
- `isOwner = (character.ownerUserId == currentUserId)`: If `ownerUserId` is nil (legacy/shared), `isOwner` is `false`, forcing the customization path. This prevents editing legacy characters even if the current user is the only user on the device (Copilot #15).
- Empty string fields stored as `nil` (`greeting.isEmpty ? nil : greeting`). Non-owners cannot blank out a base field — clearing the text restores the base value (Copilot #9).
- `save()` silently swallows errors from `ensureCustomization`/`updateCustomization` with only a comment (line 105), then unconditionally triggers success haptic and dismisses (Copilot #10).
- Owner branch uses `try? SwiftDataContainer.shared.context.save()` — also silently ignored.

**Call paths:**
- `ChatDetailView` → `EditCharacterSheet(character:onRefreshChat:)`
- `EditCharacterSheet.save()` → `CharacterStore.ensureCustomization` / `updateCustomization` OR direct character mutation

---

### 3.18 `ios/RoleVault/Views/Chats/ChatsGalleryView.swift`
**Changes:**
- Replaced `@Query` properties with `@State private var conversations: [Conversation] = []` and `@State private var moments: [GalleryMoment] = []` (lines 5–6).
- Added `loadData()` that fetches scoped records (lines 92–108).
- Uses `.task { await loadData() }` (line 35).

**Issues:**
- No reactive updates. If `ChatViewModel` creates/updates a conversation or gallery moment while this view is on-screen (e.g., via navigation), the list won't refresh until the view is recreated (Copilot #6).
- `deleteConversation` deletes from context but doesn't verify `userId` matches. However, since `conversations` was loaded with `userId` filter, the UI only shows the user's own conversations, making this a non-issue in practice.

**Call paths:**
- App navigation → `ChatsGalleryView` → `.task` → `loadData()`
- `ChatDetailView` pop → `ChatsGalleryView` (stale data unless recreated)

---

### 3.19 `ios/RoleVault/Views/Activity/ActivityCenterView.swift`
**Changes:**
- `recentConversations` and `recentMoments` moved from `@Query` to `@State` with `loadUserScopedData()` (lines 8–9, 74–90).
- `recentCharacters` remains `@Query(sort: \Character.createdAt, order: .reverse)` (line 7) — **unscoped**.

**Issues:**
- `recentCharacters` shows characters from all users (including other accounts whose data was migrated), inconsistent with the rest of the feed (CodeRabbit comment).
- `recentConversations` and `recentMoments` suffer from the same reactivity loss as `ChatsGalleryView`.

**Call paths:**
- `HomeView` → `ActivityCenterView` → `.task` → `loadUserScopedData()`

---

### 3.20 `ios/RoleVault/Views/Chats/ChatDetailView.swift`
**Changes:**
- Replaced `@Query private var personas: [Persona]` with `@State private var personas: [Persona] = []` (line 12).
- Added `loadPersonas()` that filters by `userId` (lines 198–208).
- `.task` now calls `loadPersonas()` before `loadConversation` (line 87).

**Issues:**
- Reactivity loss for persona list. If a persona is created/deleted elsewhere, this view won't reflect it.
- `setActivePersona` (line 148) iterates over local `personas` array and sets `isActive`. This is scoped to the current user's personas because `loadPersonas` filters by `userId`, but it bypasses `ProfileViewModel.setActivePersona` which performs the same logic via a fetch. No functional issue, but code duplication.

**Call paths:**
- Navigation → `ChatDetailView` → `.task` → `loadPersonas()` + `loadConversation()`
- User taps persona button → `showPersonaMenu` → `setActivePersona()`

---

### 3.21 `ios/RoleVault/Views/Profile/PersonaManagerView.swift`
**Changes:**
- Replaced `@Query` with `@State personas` and `loadPersonas()` (lines 5, 48–59).
- `CreatePersonaSheet.save()` passes `userId = AuthService.shared.currentUser?.id` (line 140).

**Issues:**
- Same reactivity loss.
- `save()` allows nil `userId`, creating orphaned invisible personas (CodeRabbit comment).

**Call paths:**
- `ProfileView` → `PersonaManagerView` → `.onAppear` → `loadPersonas()`
- `PersonaManagerView` → `CreatePersonaSheet` → `save()` → insert persona

---


## 4. Copilot Comment Analysis (All 16)

---

### Copilot #1 — Orphaned Records on Character Deletion
**File:** `ios/RoleVault/Data/Models/Character.swift`  
**Line:** 37 (diff hunk around relationship removal)  
**Comment:** Removing `@Relationship` means `CharacterStore.delete(_:)` no longer cleans up dependent rows. `JournalEntry`, `GalleryMoment`, `Conversation`, `MessageWrapper`, and `CharacterCustomization` will be orphaned.

**Validity:** ✅ **VALID** — Confirmed by direct source inspection.

**Evidence:**
```swift
// Character.swift (feature) — lines 35-37
// MARK: - Metadata
var createdAt: Date
var updatedAt: Date
// No @Relationship properties present

// CharacterStore.swift (feature) — lines 39-43
@MainActor
func delete(_ character: Character) throws {
    SwiftDataContainer.shared.context.delete(character)
    try SwiftDataContainer.shared.context.save()
}
```

The base version had:
```swift
// Character.swift (base) — lines 36-40
@Relationship(deleteRule: .cascade, inverse: \JournalEntry.character)
var journalEntries: [JournalEntry]?

@Relationship(deleteRule: .nullify, inverse: \GalleryMoment.character)
var galleryMoments: [GalleryMoment]?
```

**Runtime impact:** Every time a user deletes a character, all associated `JournalEntry`, `GalleryMoment`, `Conversation`, `MessageWrapper`, and `CharacterCustomization` records remain in the SQLite store forever. Over time this accumulates dead data and may cause privacy leaks (old conversations/moments from deleted characters still present on disk).

**Mitigated elsewhere?** No. `HomeViewModel.deleteCharacter` simply forwards to `CharacterStore.delete`. No other code cleans up related records.

**Fix:** Add manual cleanup to `CharacterStore.delete(_:)`:
```swift
func delete(_ character: Character) throws {
    let context = SwiftDataContainer.shared.context
    let charId = character.id
    
    // Clean up customizations
    let custDesc = FetchDescriptor<CharacterCustomization>(
        predicate: #Predicate { $0.characterId == charId }
    )
    if let customs = try? context.fetch(custDesc) {
        customs.forEach(context.delete)
    }
    
    // Clean up journal entries
    let journalDesc = FetchDescriptor<JournalEntry>(
        predicate: #Predicate { $0.characterId == charId }
    )
    if let journals = try? context.fetch(journalDesc) {
        journals.forEach(context.delete)
    }
    
    // Clean up conversations (and their messages via further cleanup or cascade)
    let convoDesc = FetchDescriptor<Conversation>(
        predicate: #Predicate { $0.characterId == charId }
    )
    if let convos = try? context.fetch(convoDesc) {
        convos.forEach(context.delete)
    }
    
    // Clean up gallery moments
    let momentDesc = FetchDescriptor<GalleryMoment>(
        predicate: #Predicate { $0.characterId == charId }
    )
    if let moments = try? context.fetch(momentDesc) {
        moments.forEach(context.delete)
    }
    
    context.delete(character)
    try context.save()
}
```

**Severity:** 🔴 **Critical**

---

### Copilot #2 — Tavern V2 Export Drops Journal Entries
**File:** `ios/RoleVault/Data/CharacterStore.swift`  
**Line:** 248  
**Comment:** `"entries": []` hardcodes empty lorebook, regressing interoperability.

**Validity:** ✅ **VALID** — Confirmed.

**Evidence:**
```swift
// CharacterStore.swift (feature) — lines 246-248
"character_book": [
    "entries": []
]
```

Base version (lines 130–136):
```swift
"character_book": [
    "entries": (character.journalEntries ?? []).map { entry in
        [
            "name": entry.triggerKeyphrase,
            "content": entry.content,
            "keys": [entry.triggerKeyphrase]
        ]
    }
]
```

**Runtime impact:** Exported PNGs no longer contain journal/lorebook data. Users sharing characters lose their memory triggers. Other Tavern V2 tools will see an empty character book.

**Call path:** `CharacterStore.exportToPNG(character:image:)` → `buildTavernV2JSON(character:)` → hardcoded `[]`

**Mitigated elsewhere?** No. `fetchJournalEntries(characterId:userId:)` exists but is not called here.

**Fix:**
```swift
private func buildTavernV2JSON(character: Character, userId: UUID? = nil) -> String {
    let entries: [[String: Any]]
    if let uid = userId,
       let journalEntries = try? fetchJournalEntries(characterId: character.id, userId: uid) {
        entries = journalEntries.map { entry in
            [
                "name": entry.triggerKeyphrase,
                "content": entry.content,
                "keys": [entry.triggerKeyphrase]
            ]
        }
    } else {
        entries = []
    }
    // ... use entries in dict
}
```

Also update `exportToPNG` to accept/pass `userId`.

**Severity:** 🟠 **Major**

---

### Copilot #3 — Race Condition in AuthService.init
**File:** `ios/RoleVault/API/AuthService.swift`  
**Line:** 16  
**Comment:** Unstructured `Task` in `init` races with views reading `currentUser` synchronously.

**Validity:** ✅ **VALID** — Confirmed.

**Evidence:**
```swift
// AuthService.swift (feature) — lines 12-16
private init() {
    self.isAuthenticated = (try? KeychainManager.shared.retrieveJWT()) != nil
    Task { @MainActor in
        self.currentUser = try? fetchCurrentUser()
    }
}
```

Callers that read `currentUser?.id` in `.task`/`.onAppear`:
```swift
// ChatsGalleryView.swift — line 94
private func loadData() async {
    guard let userId = AuthService.shared.currentUser?.id else { return }
    // ...
}

// ActivityCenterView.swift — line 76
private func loadUserScopedData() async {
    guard let userId = AuthService.shared.currentUser?.id else { return }
    // ...
}

// PersonaManagerView.swift — line 50
private func loadPersonas() {
    guard let userId = AuthService.shared.currentUser?.id else { return }
    // ...
}
```

**Runtime impact:** On cold launch, `AuthService.shared` is instantiated lazily when first accessed. The `Task` in `init` may not complete before views run their `.task` or `.onAppear`. All three views above will hit the `guard let` and return silently, showing empty lists. Since these views use `@State` (not `@Query`), they will **not** auto-refresh when `currentUser` eventually populates.

**Mitigated elsewhere?** No. `AuthService` is `@Observable`, but the views' `.task` blocks capture the value once and never retry.

**Fix:** Load synchronously on the main thread in `init`:
```swift
private init() {
    self.isAuthenticated = (try? KeychainManager.shared.retrieveJWT()) != nil
    if isAuthenticated {
        self.currentUser = try? fetchCurrentUser()
    }
}
```
`fetchCurrentUser` is `@MainActor` and performs a lightweight SwiftData fetch; running it synchronously in `init` (which is already called on the main actor via lazy static access from SwiftUI) is safe and eliminates the race.

**Severity:** 🔴 **Critical**

---

### Copilot #4 — Redundant Conditional Casts in migrateUnscopedData
**File:** `ios/RoleVault/API/AuthService.swift`  
**Line:** 172  
**Comment:** `convos.filter { $0.userId == nil } as? [Conversation]` is redundant.

**Validity:** ✅ **VALID** — Confirmed.

**Evidence:**
```swift
// AuthService.swift (feature) — lines 127-132
if let convos = try? context.fetch(FetchDescriptor<Conversation>()),
   let unscoped = convos.filter({ $0.userId == nil }) as? [Conversation] {
    for convo in unscoped {
        convo.userId = userId
    }
}
```

`filter` on a typed array returns `[Conversation]`. The `as? [Conversation]` cast always succeeds and produces a compiler warning in Swift 6. The same pattern repeats for `MessageWrapper`, `Persona`, `JournalEntry`, `GalleryMoment`, and `Character`.

**Runtime impact:** None functional; code smell and compiler noise.

**Fix:** Replace all six occurrences with plain `let`:
```swift
let unscopedConvos = convos.filter { $0.userId == nil }
for convo in unscopedConvos { convo.userId = userId }
```

**Severity:** 🟡 **Minor**

---

### Copilot #5 — migrateUnscopedData Leaks Data Between Users
**File:** `ios/RoleVault/API/AuthService.swift`  
**Line:** 175  
**Comment:** Migration runs on every login, claiming all unscoped rows for the new user.

**Validity:** ✅ **VALID** — Confirmed.

**Evidence:**
```swift
// AuthService.swift (feature) — lines 105-106
// Migrate any legacy unscoped data to this user
await migrateUnscopedData(to: account)

// migrateUnscopedData — lines 122-175
@MainActor
private func migrateUnscopedData(to user: UserAccount) async {
    let context = SwiftDataContainer.shared.context
    let userId = user.id
    // ... fetches ALL records with nil userId and assigns userId
}
```

`migrateUnscopedData` is called from `persistUserAccount`, which is called from `login` (line 36). There is no `UserDefaults` gate or check for whether migration has already run.

**Runtime impact:**
1. User A logs in. Their unscoped data is migrated to `userId = A`.
2. User A logs out. Some data may still be unscoped (e.g., if created while offline).
3. User B logs in on the same device. `migrateUnscopedData` finds any remaining unscoped rows (including any that A created after step 1) and assigns them to `userId = B`.
4. B now sees A's conversations, messages, personas, journal entries, gallery moments, and gains ownership of A's characters.

**Mitigated elsewhere?** No.

**Fix:** Gate migration with a `UserDefaults` flag keyed to the device/install:
```swift
private let migrationKey = "unscoped_data_migrated"

private func migrateUnscopedData(to user: UserAccount) async {
    guard !UserDefaults.standard.bool(forKey: migrationKey) else { return }
    // ... perform migration ...
    UserDefaults.standard.set(true, forKey: migrationKey)
}
```
Alternatively, restrict migration to first-ever login by checking if any `UserAccount` existed before.

**Severity:** 🔴 **Critical**

---

### Copilot #6 — @Query → @State Reactivity Loss
**File:** `ios/RoleVault/Views/Chats/ChatsGalleryView.swift`  
**Line:** 6  
**Comment:** Views no longer reactively update when SwiftData changes.

**Validity:** ✅ **VALID** — Confirmed across four views.

**Evidence:**

`ChatsGalleryView` (feature, lines 5–6):
```swift
@State private var conversations: [Conversation] = []
@State private var moments: [GalleryMoment] = []
```

Base version:
```swift
@Query(sort: \Conversation.lastMessageAt, order: .reverse) private var conversations: [Conversation]
@Query(sort: \GalleryMoment.createdAt, order: .reverse) private var moments: [GalleryMoment]
```

Same pattern in:
- `ActivityCenterView` (`recentConversations`, `recentMoments`)
- `PersonaManagerView` (`personas`)
- `ChatDetailView` (`personas`)

**Runtime impact:**
- `ChatsGalleryView`: After sending a message in `ChatDetailView` and popping back, `lastMessagePreview` and `lastMessageAt` are stale.
- `ActivityCenterView`: New conversations/moments created while the sheet is presented don't appear.
- `PersonaManagerView`: Creating a persona from another flow won't reflect until view recreation.
- `ChatDetailView`: Persona changes made in `PersonaManagerView` won't reflect until view recreation.

**Mitigated elsewhere?** No. The views have no `NotificationCenter` observers or `onChange` hooks on store state.

**Fix (minimal):** Add `.task(id:)` keyed to `currentUser.id` and `.onAppear` reload:
```swift
.task(id: AuthService.shared.currentUser?.id) {
    await loadData()
}
.onAppear {
    Task { await loadData() }
}
```
**Better fix:** Restore `@Query` with `#Predicate { $0.userId == userId }` where possible, or use `NotificationCenter` to broadcast SwiftData changes.

**Severity:** 🟠 **Major**

---

### Copilot #7 — ChatViewModel Inconsistent State on nil userId
**File:** `ios/RoleVault/ViewModels/ChatViewModel.swift`  
**Line:** 20  
**Comment:** `currentCharacterId` and `currentPersonaId` mutated before `guard let userId` check.

**Validity:** ✅ **VALID** — Confirmed.

**Evidence:**
```swift
// ChatViewModel.swift (feature) — lines 15-19
func loadConversation(character: Character, persona: Persona?) async {
    currentCharacterId = character.id
    currentPersonaId = persona?.id

    guard let userId = AuthService.shared.currentUser?.id else { return }
```

**Runtime impact:** If `currentUser` is nil (race on launch, or logged-out state), the method returns after mutating the IDs. `messages` retains the previous conversation's content. The UI shows the new character's name in the navigation bar but the old chat messages. This is a visually jarring inconsistency.

**Mitigated elsewhere?** No. `refreshChat(for:)` also calls `loadConversation` and would hit the same issue.

**Fix:** Move the guard above the ID assignments, or reset `messages = []` before the guard:
```swift
func loadConversation(character: Character, persona: Persona?) async {
    guard let userId = AuthService.shared.currentUser?.id else {
        currentCharacterId = nil
        currentPersonaId = nil
        messages = []
        return
    }
    currentCharacterId = character.id
    currentPersonaId = persona?.id
    // ...
}
```

**Severity:** 🟠 **Major**

---

### Copilot #8 — effectiveSystemPrompt Duplicates Prompt Logic
**File:** `ios/RoleVault/Data/CharacterStore.swift`  
**Line:** 162  
**Comment:** `effectiveSystemPrompt` re-implements `Character.formattedSystemPrompt` with subtle differences.

**Validity:** ⚠️ **PARTIALLY VALID** — The duplication exists, but the "subtle differences" claim is overstated.

**Evidence:**
```swift
// CharacterStore.swift (feature) — lines 111-161
func effectiveSystemPrompt(character: Character, userId: UUID) -> String {
    // ... builds parts by calling customization.effectiveX(base:) ...
}
```

Comparing field-by-field with `Character.formattedSystemPrompt`:
| Field | Base | Effective |
|-------|------|-----------|
| backstory | ✅ | ✅ |
| responseDirective | ✅ | ✅ |
| keyMemories | ✅ | ✅ |
| exampleMessage | ✅ | ✅ |
| greetingMessage | ✅ | ✅ |
| avatarDescription | ✅ | ✅ |
| faceDetail | ✅ | ✅ |
| interactionMode | ✅ | ✅ |
| dynamism | ✅ | ✅ |
| awayMessage | ❌ | ❌ |

Both omit `awayMessage`. Copilot's claim that "`awayMessage` is not included here (nor is it in `formattedSystemPrompt`, so that's coincidentally consistent)" is correct. The duplication is real and is a **maintainability hazard**, but there is no functional divergence today.

**Runtime impact:** None currently. Future edits to `Character.formattedSystemPrompt` (e.g., adding `awayMessage`) may not be mirrored in `effectiveSystemPrompt`, causing owners and non-owners to see different prompts.

**Mitigated elsewhere?** No.

**Fix:** Extract a shared prompt builder that takes resolved field values:
```swift
static func buildPrompt(
    backstory: String, directive: String, memories: String,
    example: String, greeting: String, appearance: String,
    face: String, mode: InteractionMode, dynamism: Double
) -> String { ... }
```
Then `Character.formattedSystemPrompt` calls it with base values, and `effectiveSystemPrompt` calls it with merged values.

**Severity:** 🟡 **Minor** (maintainability)

---


### Copilot #9 — Empty Field = nil Fallback in EditCharacterSheet
**File:** `ios/RoleVault/Views/Chats/EditCharacterSheet.swift`  
**Line:** 102  
**Comment:** Non-owners cannot blank out a field because empty string stores as `nil`, falling back to base.

**Validity:** ⚠️ **PARTIALLY VALID** — This is an intentional design choice, but it is **undocumented in the UI**.

**Evidence:**
```swift
// EditCharacterSheet.swift (feature) — lines 100-102
customization.greetingMessage = greeting.isEmpty ? nil : greeting
customization.backstory = background.isEmpty ? nil : background
customization.awayMessage = awayMessage.isEmpty ? nil : awayMessage
```

The `CharacterCustomization` extension provides:
```swift
func effectiveGreetingMessage(base: String) -> String { greetingMessage ?? base }
```

So if a non-owner clears the greeting field, `greetingMessage` becomes `nil`, and the effective value falls back to `character.greetingMessage`. There is genuinely no way for a non-owner to enforce a blank greeting.

**Runtime impact:** Non-owners editing shared characters may be confused when "clearing" a field restores the base value. The UI does not explain this behavior.

**Mitigated elsewhere?** No. The `showCustomizationNote` text (line 22) says edits "will be saved as a personal customization" but does not mention the nil-fallback behavior.

**Fix:** Either:
1. Add UI copy explaining that empty fields revert to the base character's value, OR
2. Support explicit blank overrides (e.g., store empty string as `""` and change `effectiveGreetingMessage` to `greetingMessage ?? base`, which already does this — the issue is the `isEmpty ? nil : greeting` assignment preventing empty-string storage).

If option 2 is desired, remove the `isEmpty ? nil :` ternary:
```swift
customization.greetingMessage = greeting // allow explicit empty string
customization.backstory = background
customization.awayMessage = awayMessage
```
The `effectiveX(base:)` helpers already handle `nil` fallback correctly.

**Severity:** 🟡 **Minor** (UX confusion)

---

### Copilot #10 — Silent Failure on Save in EditCharacterSheet
**File:** `ios/RoleVault/Views/Chats/EditCharacterSheet.swift`  
**Line:** 106  
**Comment:** Errors from `ensureCustomization`/`updateCustomization` are silently swallowed.

**Validity:** ✅ **VALID** — Confirmed.

**Evidence:**
```swift
// EditCharacterSheet.swift (feature) — lines 95-111
} else {
    do {
        let customization = try CharacterStore.shared.ensureCustomization(
            characterId: character.id,
            userId: currentUserId
        )
        customization.greetingMessage = greeting.isEmpty ? nil : greeting
        customization.backstory = background.isEmpty ? nil : background
        customization.awayMessage = awayMessage.isEmpty ? nil : awayMessage
        try CharacterStore.shared.updateCustomization(customization)
    } catch {
        // Silently fail for now; in production we'd surface this error
    }
}

HapticEngine.notification(.success)
dismiss()
```

**Runtime impact:** If SwiftData throws (disk full, model validation error, concurrency conflict), the user sees a success haptic and the sheet dismisses, believing their edits were saved. The data is lost.

**Mitigated elsewhere?** No.

**Fix:**
```swift
private func save() {
    guard let currentUserId = AuthService.shared.currentUser?.id else {
        HapticEngine.notification(.error)
        return
    }
    var didSucceed = true
    if isOwner {
        character.name = name
        character.greetingMessage = greeting
        character.subtitle = subtitle
        character.backstory = background
        character.awayMessage = awayMessage.isEmpty ? nil : awayMessage
        character.touch()
        do { try SwiftDataContainer.shared.context.save() } catch { didSucceed = false }
    } else {
        do {
            let customization = try CharacterStore.shared.ensureCustomization(...)
            // ... set fields ...
            try CharacterStore.shared.updateCustomization(customization)
        } catch {
            didSucceed = false
        }
    }
    HapticEngine.notification(didSucceed ? .success : .error)
    if didSucceed { dismiss() }
}
```

**Severity:** 🟠 **Major** (data loss UX)

---

### Copilot #11 — O(N) Database Fetches in HomeViewModel.isFavorite
**File:** `ios/RoleVault/ViewModels/HomeViewModel.swift`  
**Line:** 55  
**Comment:** `isFavorite` performs a synchronous SwiftData fetch on every view body invocation.

**Validity:** ✅ **VALID** — Confirmed.

**Evidence:**
```swift
// HomeViewModel.swift (feature) — lines 52-55
@MainActor
func isFavorite(_ character: Character) -> Bool {
    guard let userId = AuthService.shared.currentUser?.id else { return false }
    return CharacterStore.shared.effectiveIsFavorite(character: character, userId: userId)
}

// CharacterStore.swift (feature) — lines 102-107
func effectiveIsFavorite(character: Character, userId: UUID) -> Bool {
    guard let customization = try? fetchCustomization(characterId: character.id, userId: userId) else {
        return false
    }
    return customization.isFavorite
}
```

If `HomeView` renders a `ForEach` over 50 characters and calls `isFavorite` in each row, that's 50 SQLite queries per view update. Scroll, search, or state changes will re-trigger these.

**Runtime impact:** Jank/lag in the home screen character list, especially on older devices or with many characters.

**Mitigated elsewhere?** No.

**Fix:** Batch-load favorites once in `HomeViewModel.refresh()` or `filteredCharacters()`:
```swift
var favoriteCharacterIds: Set<UUID> = []

func refresh() async {
    // ... existing refresh logic ...
    if let userId = AuthService.shared.currentUser?.id,
       let allCustomizations = try? CharacterStore.shared.fetchAllCustomizations(for: userId) {
        favoriteCharacterIds = Set(allCustomizations.filter(\.isFavorite).map(\.characterId))
    }
}

func isFavorite(_ character: Character) -> Bool {
    favoriteCharacterIds.contains(character.id)
}
```

**Severity:** 🟠 **Major** (performance)

---

### Copilot #12 — Partial Clear State in ProfileViewModel.clearAllLocalData
**File:** `ios/RoleVault/ViewModels/ProfileViewModel.swift`  
**Line:** 146  
**Comment:** Multiple independent saves; partial clear state possible.

**Validity:** ✅ **VALID** — Confirmed.

**Evidence:**
```swift
// ProfileViewModel.swift (feature) — lines 106-147
@MainActor
func clearAllLocalData() {
    guard let userId = AuthService.shared.currentUser?.id else { return }
    clearConversationCache()  // has its own save()
    clearGalleryCache()       // has its own save()
    // ... more deletes ...
    try? context.save()       // final save
}
```

`clearConversationCache` (lines 78–89):
```swift
func clearConversationCache() {
    guard let userId = AuthService.shared.currentUser?.id else { return }
    // ... fetch and delete ...
    try? context.save()
}
```

**Runtime impact:** If `clearConversationCache` succeeds but `clearGalleryCache` fails (e.g., due to a transient I/O error), the user is left with conversations cleared but gallery intact. Because all errors are `try?`, no feedback is provided.

**Mitigated elsewhere?** No.

**Fix:** Perform all deletes against the same context and save once:
```swift
@MainActor
func clearAllLocalData() throws {
    guard let userId = AuthService.shared.currentUser?.id else { return }
    let context = SwiftDataContainer.shared.context
    
    let descriptors: [any FetchDescriptorProtocol] = [
        FetchDescriptor<Conversation>(predicate: #Predicate { $0.userId == userId }),
        FetchDescriptor<GalleryMoment>(predicate: #Predicate { $0.userId == userId }),
        FetchDescriptor<Character>(predicate: #Predicate { $0.ownerUserId == userId }),
        FetchDescriptor<Persona>(predicate: #Predicate { $0.userId == userId }),
        FetchDescriptor<JournalEntry>(predicate: #Predicate { $0.userId == userId }),
        FetchDescriptor<MessageWrapper>(predicate: #Predicate { $0.userId == userId }),
        FetchDescriptor<CharacterCustomization>(predicate: #Predicate { $0.userId == userId })
    ]
    
    for descriptor in descriptors {
        // Use typed fetch via helper or explicit typed loops
    }
    
    try context.save()
}
```
Alternatively, keep the helper methods but remove their internal `save()` calls, returning the items to delete, and let `clearAllLocalData` orchestrate all deletions + one save.

**Severity:** 🟠 **Major**

---

### Copilot #13 — Persona.isActive Not Globally Scoped
**File:** `ios/RoleVault/Data/Models/Persona.swift`  
**Line:** 12  
**Comment:** Two personas belonging to different users can both have `isActive == true`.

**Validity:** ✅ **VALID** — Confirmed.

**Evidence:**
```swift
// Persona.swift (feature) — line 11
var isActive: Bool
```

`ProfileViewModel.setActivePersona` correctly scopes the toggle:
```swift
// ProfileViewModel.swift (feature) — lines 43-52
func setActivePersona(_ persona: Persona) {
    guard let userId = AuthService.shared.currentUser?.id else { return }
    let descriptor = FetchDescriptor<Persona>(predicate: #Predicate { $0.userId == userId })
    // ... toggle within filtered set ...
}
```

However, `ChatDetailView.activePersona` (feature, lines 14–16):
```swift
var activePersona: Persona? {
    personas.first { $0.isActive }
}
```

`personas` is loaded with `userId` filter (line 205), so this is safe **today**. But any future code doing a global `FetchDescriptor<Persona>(predicate: #Predicate { $0.isActive == true })` will return the wrong user's active persona.

**Runtime impact:** Latent bug. Current code paths are safe, but the schema invariant is not enforced.

**Mitigated elsewhere?** Partially. All current reads filter by `userId` first.

**Fix:** Move active-persona tracking to `UserAccount`:
```swift
// UserAccount.swift
var activePersonaId: UUID?
```
Or enforce the invariant in `setActivePersona` by clearing all other active flags globally (not just scoped to current user). However, the cleaner architectural fix is tracking on `UserAccount`.

**Severity:** 🟡 **Minor** (latent)

---

### Copilot #14 — AGENTS.md Incorrect Cascade Documentation
**File:** `AGENTS.md`  
**Line:** 149  
**Comment:** Docs claim `CharacterCustomization` uses `.cascade`, but the model has no `@Relationship`.

**Validity:** ✅ **VALID** — Confirmed.

**Evidence:**
```markdown
<!-- AGENTS.md (feature) -->
**Delete rules**: `CharacterCustomization` uses `.cascade` for its dependent data.
```

`CharacterCustomization.swift` (feature):
```swift
@Model
final class CharacterCustomization {
    @Attribute(.unique) var id: UUID
    var userId: UUID
    var characterId: UUID
    // No @Relationship declarations
}
```

**Impact:** Misleading documentation for future developers. No actual cascade behavior exists.

**Fix:** Correct the documentation:
```markdown
**Delete rules**: Referential integrity is now managed manually. `CharacterStore.delete(_:)` must explicitly fetch and delete related `CharacterCustomization`, `JournalEntry`, `GalleryMoment`, and `Conversation` records.
```

**Severity:** 🟡 **Minor** (documentation)

---

### Copilot #15 — Legacy Characters Uneditable Due to nil ownerUserId
**File:** `ios/RoleVault/Views/Chats/EditCharacterSheet.swift`  
**Line:** 69  
**Comment:** `ownerUserId == nil` forces `isOwner = false`, preventing edits on legacy/shared characters.

**Validity:** ✅ **VALID** — Confirmed.

**Evidence:**
```swift
// EditCharacterSheet.swift (feature) — lines 68-69
let currentUserId = AuthService.shared.currentUser?.id
isOwner = (character.ownerUserId == currentUserId)
```

If `character.ownerUserId` is nil (legacy data, or imported shared character), `isOwner` is `false` even if `currentUserId` is non-nil. The user is forced into the customization overlay path and cannot edit the base character's name, subtitle, etc.

**Runtime impact:** Users cannot edit legacy characters they created before this branch. Imported shared characters are permanently non-editable by anyone.

**Mitigated elsewhere?** `migrateUnscopedData` assigns `ownerUserId` to unscoped characters on login, but:
1. It only runs on login.
2. It only affects characters with `ownerUserId == nil` at that moment.
3. Characters created while offline (after migration) may still have nil `ownerUserId`.
4. Imported characters (via `importFromPNG`) receive `ownerUserId` only if explicitly passed.

**Fix:** Treat nil `ownerUserId` as "ownable by current user" in the UI:
```swift
isOwner = (character.ownerUserId == nil || character.ownerUserId == currentUserId)
```
This allows the first user to edit a legacy/shared character as the owner, which aligns with `migrateUnscopedData`'s intent.

**Severity:** 🟠 **Major** (UX regression)

---

### Copilot #16 — CharacterCustomization.interactionMode Not Queryable
**File:** `ios/RoleVault/Data/Models/CharacterCustomization.swift`  
**Line:** 77  
**Comment:** Computed `interactionMode` is not persisted; `#Predicate` won't work on it.

**Validity:** ✅ **VALID** — Confirmed.

**Evidence:**
```swift
// CharacterCustomization.swift (feature) — lines 69-77
var interactionMode: InteractionMode? {
    get {
        guard let raw = interactionModeRaw else { return nil }
        return InteractionMode(rawValue: raw)
    }
    set {
        interactionModeRaw = newValue?.rawValue
    }
}
```

SwiftData `#Predicate` operates on stored properties only. A query like `#Predicate { $0.interactionMode == .companion }` will fail to compile because `interactionMode` is a computed property.

**Runtime impact:** None currently, because no code queries `CharacterCustomization` by `interactionMode`. However, it is a latent trap for future developers.

**Mitigated elsewhere?** No.

**Fix:** Add a documentation comment:
```swift
/// ⚠️ Computed property — not queryable via SwiftData `#Predicate`.
/// Use `interactionModeRaw` for predicates.
var interactionMode: InteractionMode? { ... }
```

**Severity:** 🟡 **Minor** (latent)

---


## 5. Hidden Regressions (Not Mentioned by Copilot)

### HR-1 — ChatViewModel.sendMessage Appends Message Before userId Guard
**File:** `ios/RoleVault/ViewModels/ChatViewModel.swift`, lines 53–68  
**Evidence:**
```swift
func sendMessage(_ text: String, character: Character, persona: Persona?) async {
    guard !text.trimmingCharacters(in: .whitespaces).isEmpty else { return }
    guard let userId = AuthService.shared.currentUser?.id else { return }
    // ...
    await MainActor.run {
        messages.append(userMessage)
    }
    // ...
}
```
Wait — re-reading the code, the user message is appended **after** the `guard let userId` check (line 66). So this is actually safe. However, `loadConversation` (line 19) mutates IDs before the guard. **This is Copilot #7, already covered.**

Actually, a true hidden regression: `sendMessage` returns early if `userId` is nil, but the message was **not** yet appended. So no data loss. But `loadConversation` does mutate IDs before guard. Let me find a real hidden regression.

### HR-1 — ProfileViewModel.clearAllLocalData Deletes Owned Characters But Not Customizations on Shared Characters
**File:** `ios/RoleVault/ViewModels/ProfileViewModel.swift`, lines 111–116  
**Evidence:**
```swift
let charDescriptor = FetchDescriptor<Character>(
    predicate: #Predicate { $0.ownerUserId == userId }
)
if let chars = try? context.fetch(charDescriptor) {
    chars.forEach { context.delete($0) }
}
```

If user A has created customizations on user B's shared characters, `clearAllLocalData` **does** delete those customizations (lines 139–144). So this is actually handled. However, `HomeViewModel.deleteCharacter` (which deletes a single character) does **not** delete customizations. If user A deletes a shared character they own, other users' customizations on that character become orphaned. This is a variant of Copilot #1 but at the ViewModel level.

**Severity:** 🟠 **Major**

---

### HR-2 — CreateCharacterViewModel.save() Loses Journal Entries If Not Logged In
**File:** `ios/RoleVault/ViewModels/CreateCharacterViewModel.swift`, lines 94–110  
**Evidence:**
```swift
let userId = AuthService.shared.currentUser?.id
// ...
if let currentUserId = userId {
    for draft in journalEntries {
        let entry = JournalEntry(characterId: character.id, userId: currentUserId, ...)
        try CharacterStore.shared.insertJournalEntry(entry)
    }
}
```

If the user is not authenticated, journal entries are silently discarded. The character is still saved. There is no error or warning to the user.

**Severity:** 🟡 **Minor**

---

### HR-3 — ChatViewModel.saveGalleryMoment Uses try? Without Checking userId Before Insert
**File:** `ios/RoleVault/ViewModels/ChatViewModel.swift`, lines 180–191  
**Evidence:**
```swift
func saveGalleryMoment(message: LibreChatMessage, conversationId: String, character: Character) {
    guard let userId = AuthService.shared.currentUser?.id else { return }
    let moment = GalleryMoment(characterId: character.id, userId: userId, ...)
    SwiftDataContainer.shared.context.insert(moment)
    try? SwiftDataContainer.shared.context.save()
}
```

This is actually correct — it guards on `userId`. But `try?` silently ignores save failures. Not a new regression (base also uses `try?`).

---

### HR-4 — ChatsGalleryView.deleteConversation Does Not Verify userId
**File:** `ios/RoleVault/Views/Chats/ChatsGalleryView.swift`, lines 79–85  
**Evidence:**
```swift
private func deleteConversation(_ convo: Conversation) {
    withAnimation {
        SwiftDataContainer.shared.context.delete(convo)
        try? SwiftDataContainer.shared.context.save()
        conversations.removeAll { $0.id == convo.id }
    }
}
```

Although `conversations` is loaded with `userId` filter, if a bug or race condition causes another user's conversation to appear in the list, this code will delete it without verification. Defense-in-depth missing.

**Severity:** 🟡 **Minor**

---

### HR-5 — CharacterStore.effectiveSystemPrompt Silently Swallows Fetch Errors
**File:** `ios/RoleVault/Data/CharacterStore.swift`, lines 112–115  
**Evidence:**
```swift
func effectiveSystemPrompt(character: Character, userId: UUID) -> String {
    guard let customization = try? fetchCustomization(characterId: character.id, userId: userId) else {
        return character.formattedSystemPrompt
    }
```

If `fetchCustomization` throws (database locked, model mismatch, etc.), the method silently falls back to the base prompt. The chat continues with the base personality without warning the user that their customization could not be loaded.

**Severity:** 🟡 **Minor**

---

### HR-6 — AGENTS.md Documentation Now Out of Sync With Actual Schema
**File:** `AGENTS.md`  
Beyond Copilot #14, the AGENTS.md update in this branch states:
> "**Delete rules**: `CharacterCustomization` uses `.cascade` for its dependent data."

This is false. Additionally, the docs were updated to describe the new multi-user architecture, but they do not mention:
- The `@Query` → `@State` reactivity loss.
- The `migrateUnscopedData` security risk.
- The `effectiveSystemPrompt` duplication.

**Severity:** 🟡 **Minor**

---

## 6. Risk Assessment

| Risk Area | Severity | Likelihood | Impact | Risk Score |
|-----------|----------|------------|--------|------------|
| Data leakage between users (migrateUnscopedData) | 🔴 Critical | High | Severe | **Critical** |
| Orphaned records on character deletion | 🔴 Critical | High | High | **Critical** |
| AuthService.init race → empty lists | 🔴 Critical | High | High | **Critical** |
| Silent save failures (EditCharacterSheet) | 🟠 Major | Medium | High | **High** |
| Reactivity loss (@Query → @State) | 🟠 Major | High | Medium | **High** |
| ChatViewModel inconsistent state | 🟠 Major | Medium | Medium | **High** |
| O(N) isFavorite fetches | 🟠 Major | Medium | Medium | **High** |
| Partial clear in ProfileViewModel | 🟠 Major | Low | Medium | **Medium** |
| Legacy character uneditable | 🟠 Major | Medium | Medium | **Medium** |
| Tavern V2 export/import regression | 🟠 Major | Low | Low | **Medium** |
| Persona active-state bleed | 🟡 Minor | Low | Low | **Low** |
| Redundant casts | 🟡 Minor | High | None | **Low** |
| CharacterCustomization query limitation | 🟡 Minor | Low | None | **Low** |
| Empty-field fallback UX | 🟡 Minor | Medium | Low | **Low** |
| effectiveSystemPrompt duplication | 🟡 Minor | Low | None | **Low** |

**Aggregate Assessment:** The branch introduces **3 Critical** and **6 High** risks. Without remediation, merging would degrade data integrity, security, and user experience.

---

## 7. Recommended Fixes (Ordered by Severity)

### 🔴 Critical — Must Fix Before Merge

1. **Fix `AuthService.init` race condition**
   - **File:** `ios/RoleVault/API/AuthService.swift`
   - **Action:** Remove unstructured `Task` in `init`; load `currentUser` synchronously.
   - **Lines:** 14–16

2. **Gate `migrateUnscopedData` to run once per device**
   - **File:** `ios/RoleVault/API/AuthService.swift`
   - **Action:** Add `UserDefaults` flag; return early if migration already completed.
   - **Lines:** 122–175

3. **Add manual cascade cleanup in `CharacterStore.delete(_:)`**
   - **File:** `ios/RoleVault/Data/CharacterStore.swift`
   - **Action:** Fetch and delete related `CharacterCustomization`, `JournalEntry`, `GalleryMoment`, `Conversation`, and `MessageWrapper` records before deleting the character.
   - **Lines:** 39–43

### 🟠 Major — Should Fix Before Merge

4. **Fix `ChatViewModel.loadConversation` inconsistent state**
   - **File:** `ios/RoleVault/ViewModels/ChatViewModel.swift`
   - **Action:** Move `guard let userId` above ID assignments, or reset `messages = []` before early return.
   - **Lines:** 15–19

5. **Restore reactivity or add reload triggers to `@State` views**
   - **Files:** `ChatsGalleryView.swift`, `ActivityCenterView.swift`, `PersonaManagerView.swift`, `ChatDetailView.swift`
   - **Action:** Add `.task(id: AuthService.shared.currentUser?.id)` and `.onAppear { Task { await loadData() } }` to all four views. Long-term: revert to `@Query` with `userId` predicate.

6. **Surface save errors in `EditCharacterSheet`**
   - **File:** `ios/RoleVault/Views/Chats/EditCharacterSheet.swift`
   - **Action:** Capture `didSucceed` flag; only dismiss and haptic-success on actual save success.
   - **Lines:** 81–111

7. **Batch-load favorites in `HomeViewModel`**
   - **File:** `ios/RoleVault/ViewModels/HomeViewModel.swift`
   - **Action:** Load all customizations for current user once into a `Set<UUID>`; `isFavorite` checks the set.
   - **Lines:** 40–55

8. **Single-transaction clear in `ProfileViewModel`**
   - **File:** `ios/RoleVault/ViewModels/ProfileViewModel.swift`
   - **Action:** Remove internal `save()` calls from helpers; perform all deletes in `clearAllLocalData` and save once. Propagate errors.
   - **Lines:** 78–147

9. **Fix legacy character ownership in `EditCharacterSheet`**
   - **File:** `ios/RoleVault/Views/Chats/EditCharacterSheet.swift`
   - **Action:** `isOwner = (character.ownerUserId == nil || character.ownerUserId == currentUserId)`.
   - **Lines:** 68–69

10. **Restore journal entries in Tavern V2 export/import**
    - **File:** `ios/RoleVault/Data/CharacterStore.swift`
    - **Action:** Call `fetchJournalEntries` in `buildTavernV2JSON`; parse `character_book.entries` in `parseTavernV2JSON`.
    - **Lines:** 246–248, 255–279

### 🟡 Minor — Fix Before Next Release

11. **Remove redundant `as?` casts in `migrateUnscopedData`**
    - **File:** `ios/RoleVault/API/AuthService.swift`
    - **Lines:** 127–172

12. **Document `CharacterCustomization.interactionMode` query limitation**
    - **File:** `ios/RoleVault/Data/Models/CharacterCustomization.swift`
    - **Lines:** 69–77

13. **Correct AGENTS.md cascade documentation**
    - **File:** `AGENTS.md`
    - **Lines:** ~149

14. **Add `activePersonaId` to `UserAccount` or enforce global active uniqueness**
    - **File:** `ios/RoleVault/Data/Models/UserAccount.swift` or `ProfileViewModel.swift`

15. **Defend `ChatsGalleryView.deleteConversation` with userId check**
    - **File:** `ios/RoleVault/Views/Chats/ChatsGalleryView.swift`
    - **Lines:** 79–85

---

## 8. Final Merge Recommendation

**Status: ❌ DO NOT MERGE**

The branch implements a sound architectural concept (per-user scoping and character customization overlays) but the execution contains **critical data-integrity and security flaws** that outweigh the benefits:

1. **Cross-user data leakage** (`migrateUnscopedData`) is a privacy violation.
2. **Orphaned records** will accumulate indefinitely, bloating the database and potentially leaking deleted character data.
3. **Race on launch** will cause empty lists and confused users.
4. **Silent failures** and **stale UI** degrade the user experience.

**Path to merge readiness:**
- Estimated effort: **1–2 developer days**.
- Files to touch: `AuthService.swift`, `CharacterStore.swift`, `ChatViewModel.swift`, `HomeViewModel.swift`, `ProfileViewModel.swift`, `EditCharacterSheet.swift`, `ChatsGalleryView.swift`, `ActivityCenterView.swift`, `PersonaManagerView.swift`, `ChatDetailView.swift`, `CharacterCustomization.swift`, `AGENTS.md`.
- After fixes, a second audit focused on the changed lines should be performed before merging.

**If merging is urgent:** Consider a **feature flag** or **branch protection** approach where the new user-scoping code is disabled by default and can be toggled via a compile-time flag or runtime setting, allowing the rest of the app to ship while the scoping layer is hardened.

---

*Report generated by Kimi Code CLI on 2026-05-13.*
*All line numbers reference commit `ee4cc3350a8ddd31e7eac7b01dfb24fe71cf2ae8`.*

