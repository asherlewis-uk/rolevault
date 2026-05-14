# RoleVault — User Next Prompt

**Working directory:** ~/PROJECTS/rolevault
**Branch:** main
**Goal:** Fix `@Query→@State` reactivity loss in 4 views. Views currently use `@State` + manual one-shot fetch and never auto-refresh when the SwiftData database changes. Restore live reactivity.

---

## §1 — Verified Inputs

From `BRANCH_AUDIT_REPORT.md §5: Hidden Regressions §728-774` and `REMEDIATION_REPORT.md Remediation 8 §1738-2084`:

| View | File | Current Behavior | Why Broken |
|------|------|------------------|------------|
| ChatsGalleryView | `ios/RoleVault/Views/Chats/ChatsGalleryView.swift` | `@State private var conversations: [Conversation] = []` + `.onAppear { fetch() }` | No auto-refresh on conversation CRUD |
| ActivityCenterView | `ios/RoleVault/Views/Activity/ActivityCenterView.swift` | `@State private var activities: [JournalEntry] = []` + manual fetch | Journal entries added elsewhere don't appear |
| PersonaManagerView | `ios/RoleVault/Views/Profile/PersonaManagerView.swift` | `@State private var personas: [Persona] = []` + manual fetch | Persona changes from other screens invisible |
| ChatDetailView | `ios/RoleVault/Views/Chats/ChatDetailView.swift` | `@State private var messages: [MessageWrapper] = []` + `.task(id:)` load | New messages from SSE streaming append, but external changes (e.g., deletions from gallery) not reflected |

**Technical context (`AGENTS.md`):**
- App uses `@Observable` (iOS 17+), not `ObservableObject`
- SwiftData `@Query` auto-updates when the database changes — this is the correct pattern
- `@State` + manual fetch loses this reactivity entirely
- Views are `@MainActor` — all SwiftData contexts are main-thread-bound

**The fix pattern (from REMEDIATION_REPORT.md Remediation 8):**

Replace `@State` + manual fetch with `@Query` using a dynamic `FetchDescriptor`:

```swift
// CURRENT (broken):
@State private var items: [Model] = []

// FIXED:
@Query private var items: [Model]
```

But `@Query` with a dynamic predicate (e.g., filtering by `userId`) requires `FetchDescriptor` with `predicate: #Predicate { $0.userId == currentUserId }`. This works in SwiftData but the predicate must be a compile-time `#Predicate` macro — you can't pass a dynamic value directly.

**Recommended pattern from REMEDIATION_REPORT.md:**
```swift
@Query(sort: \Model.createdAt, order: .reverse) 
private var allItems: [Model]

// Filter in computed property (SwiftUI will recompute when @Query updates)
private var filteredItems: [Model] {
    allItems.filter { $0.userId == currentUserId }
}
```

Or use `.task(id:)` with a `FetchDescriptor` that triggers on `currentUserId` change.

---

## §2 — Locked Decisions

1. Only edit the 4 files listed in §1 — no other files
2. Replace `@State` + manual fetch with reactive pattern in all 4 views
3. Preferred pattern: `@Query` with broad fetch + computed filter property. Fallback: `FetchDescriptor` in `.task(id:)` with `currentUserId` as the trigger
4. Keep filter by `userId` — data scope must remain per-user (`AGENTS.md` Data Model Boundaries)
5. Sorting: preserve existing sort order (typically reverse chronological)
6. Remove any `.onAppear` fetch blocks that are replaced by `@Query`
7. No new Swift packages or pod installs
8. No changes to `project.yml`, `Info.plist`, or build config
9. No git commits or pushes

---

## §3 — Hard Walls

- ❌ No SwiftData schema changes
- ❌ No new Swift packages
- ❌ No pod install / CocoaPods
- ❌ No changes to project.yml / build config
- ❌ No git commits or pushes
- ❌ No edits outside the 4 files listed in §1
- ❌ No print() or NSLog() debugging left in code
- ❌ Do not change the data model boundaries — userId filtering stays

---

## §4 — Required Output

### File 1: `ios/RoleVault/Views/Chats/ChatsGalleryView.swift`
- Replace `@State private var conversations: [Conversation] = []` with `@Query` or reactive pattern
- Remove `.onAppear { fetchConversations() }` if replaced
- Keep delete logic intact (already fixed to use CascadeStore)

### File 2: `ios/RoleVault/Views/Activity/ActivityCenterView.swift`
- Replace `@State private var activities: [JournalEntry] = []` with reactive pattern
- Filter by `userId`
- Keep trigger-phrase display logic

### File 3: `ios/RoleVault/Views/Profile/PersonaManagerView.swift`
- Replace `@State private var personas: [Persona] = []` with reactive pattern
- Filter by `userId`
- Keep activate/delete logic

### File 4: `ios/RoleVault/Views/Chats/ChatDetailView.swift`
- `messages` already loaded via `.task(id:)` — this is the SSE streaming path, which is correct
- Focus: ensure message list reacts to external changes (deletions from gallery, cascade deletes)
- Consider: keep `.task(id:)` for SSE-loaded conversation but add `@Query` for cache reads
- OR: verify `.task(id:)` re-fires when conversation changes externally

---

## §5 — Verification Checklist

```
1. ChatsGalleryView reactivity:
   rg "@State.*conversations\|@Query.*conversations" ios/RoleVault/Views/Chats/ChatsGalleryView.swift
   → Confirm @Query (or reactive pattern) replacing @State

2. ActivityCenterView reactivity:
   rg "@State.*activities\|@Query.*activities\|@State.*journal" ios/RoleVault/Views/Activity/ActivityCenterView.swift
   → Confirm reactive pattern

3. PersonaManagerView reactivity:
   rg "@State.*personas\|@Query.*personas" ios/RoleVault/Views/Profile/PersonaManagerView.swift
   → Confirm reactive pattern

4. ChatDetailView review:
   rg "\.task\(id:\|onAppear.*messages\|\Query.*messages" ios/RoleVault/Views/Chats/ChatDetailView.swift
   → Confirm no regression (keep .task(id:) for SSE, ensure reactivity for external changes)

5. No orphaned manual fetches:
   rg "\.onAppear.*\{.*fetch\|\.onAppear.*\{.*load" ios/RoleVault/Views/Chats/ChatsGalleryView.swift ios/RoleVault/Views/Activity/ActivityCenterView.swift ios/RoleVault/Views/Profile/PersonaManagerView.swift
   → Should return 0 hits for replaced fetches (some .onAppear for UI setup is fine — flag only data-load ones)

6. userId filtering preserved:
   rg "userId\|currentUserId\|CurrentUser" ios/RoleVault/Views/Chats/ChatsGalleryView.swift ios/RoleVault/Views/Activity/ActivityCenterView.swift ios/RoleVault/Views/Profile/PersonaManagerView.swift
   → Confirm userId filtering still present in filter/computed logic

7. Compilation:
   cd ios && xcodegen generate 2>&1 | tail -3
   xcodebuild -scheme RoleVault -destination 'platform=iOS Simulator,name=iPhone 16' build 2>&1 | grep "BUILD"
   → Expected: ** BUILD SUCCEEDED **

8. No stray debug prints (check all 4 files):
   rg "print\(|NSLog\(" ios/RoleVault/Views/Chats/ChatsGalleryView.swift ios/RoleVault/Views/Activity/ActivityCenterView.swift ios/RoleVault/Views/Profile/PersonaManagerView.swift ios/RoleVault/Views/Chats/ChatDetailView.swift
   → Should return 0 NEW hits
```

---

## §6 — Self-Check

- [ ] Re-read §2 locked decisions — every one honored
- [ ] Re-read §3 hard walls — no wall breached
- [ ] Every item in §5 produces a concrete pass/fail result with evidence
- [ ] Diff the 4 changed files — every change intentional and matches §4
- [ ] `@Query` imports working (check for `import SwiftData` in each file)
- [ ] Build succeeds after all changes

---

## §7 — Bring-Back: Overwrite `docs/user_bring_back.md`

After completing all fixes and verification, **overwrite** `~/PROJECTS/rolevault/docs/user_bring_back.md` with:

```
## Bring-Back Report

### Files Changed
- <path>: <summary of change>
- ...

### Verification Results
| # | Check | Result | Output |
|---|-------|--------|--------|
| 1 | ChatsGalleryView reactivity | ✅/❌ | <rg output> |
| 2 | ActivityCenterView reactivity | ✅/❌ | <rg output> |
| 3 | PersonaManagerView reactivity | ✅/❌ | <rg output> |
| 4 | ChatDetailView review | ✅/❌ | <rg output> |
| 5 | No orphaned manual fetches | ✅/❌ | <rg output> |
| 6 | userId filtering preserved | ✅/❌ | <rg output> |
| 7 | Compilation | ✅/❌ | <build output> |
| 8 | No stray debug prints | ✅/❌ | <rg output> |

### Self-Check
| # | Item | Status |
|---|------|--------|
| 1 | Locked decisions honored | ✅ |
| 2 | Hard walls respected | ✅ |
| 3 | All verifications pass | ✅ |
| 4 | Diff intentional | ✅ |
| 5 | @Query imports working | ✅ |

### Deviations
- (list any; "none" if none)

### Kimi Session
Session ID: <uuid>
Session Path: ~/.kimi/sessions/<uuid>/
Export Path: ~/.kimi/sessions/<uuid>/session.jsonl

### Verdict
PASS | PASS-WITH-NITS | FAIL | BLOCKED
```
