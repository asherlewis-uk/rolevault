# RoleVault — User Next Prompt

**Working directory:** ~/PROJECTS/rolevault
**Branch:** main
**Goal:** End-to-end audit of the current build state (~5,267 lines across 21 modified + 4 new Swift files + backend Python). Cross-reference every file against the locked decisions from the reactivity prompt and the architecture pivot plan. Identify regressions, scope violations, dead code, missing imports, and inconsistencies.

This is a READ-ONLY audit. No code is written.

---

## §1 — What Changed

The previous prompt was: "Fix @Query→@State reactivity loss in 4 views." The agent also implemented the architecture pivot (RoleVault API + LM Studio inference) in the same run. Full scope:

### Modified (21 files)
`AuthService.swift`, `ChatService.swift`, `ConfigService.swift`, `TokenInterceptor.swift`, `AuthModels.swift`, `ChatModels.swift`, `DependencyContainer.swift`, `RoleVaultApp.swift`, `CharacterStore.swift`, `Character.swift`, `ChatViewModel.swift`, `CreateCharacterViewModel.swift`, `HomeViewModel.swift`, `ProfileViewModel.swift`, `BackendConfigView.swift`, `ChatsGalleryView.swift`, `ActivityCenterView.swift`, `PersonaManagerView.swift`, `ChatDetailView.swift`, `EditCharacterSheet.swift`, `project.pbxproj`

### New (4 files)
`RoleVaultAPI.swift`, `InferenceAPI.swift`, `RemoteModels.swift`, `RegisterView.swift`

### Deleted (3 files)
`AgentService.swift`, `LibreChatAPI.swift`, `ConfigModels.swift`

### Backend (new — ~1,630 lines)
`backend/` — FastAPI app with auth, characters, conversations, personas, journals, gallery, config routers. SQLAlchemy models, Pydantic schemas, Alembic migrations, Dockerfile, docker-compose.yml, requirements.txt.

---

## §2 — Audit Dimensions

For every file listed in §1, evaluate against these 5 dimensions:

### A: Architecture Correctness
Does this file conform to the pivot plan?

- **AuthService** → hits RoleVaultAPI (port 8001), NOT LibreChat. Has register() + login(). No migrateUnscopedData().
- **ChatService** → CRUD to RoleVaultAPI, inference to InferenceAPI (LM Studio :1234). No LibreChat endpoints.
- **CharacterStore** → syncs to RoleVaultAPI. No AgentService references. No libreChatAgentId.
- **ConfigService** → hits RoleVaultAPI `/api/config`. Returns inference URL + model list.
- **TokenInterceptor** → refreshes against RoleVault API `/api/auth/refresh`. No LibreChat refresh.
- **New API clients** → RoleVaultAPI has JWT injection + snake_case. InferenceAPI has no auth + OpenAI SSE.
- **Deleted files** → AgentService, LibreChatAPI, ConfigModels are actually gone.
- **Backend** → matches the schema plan (rolevault_* tables). Auth registers into LibreChat users table + rolevault_users.
- **App routing** → RoleVaultApp includes RegisterView. Navigation works from login → register → home.

### B: Scope Integrity
Did the agent touch anything outside the allowed list from the original reactivity prompt §2?

Allowed: the 4 reactivity views (ChatsGalleryView, ActivityCenterView, PersonaManagerView, ChatDetailView)
Everything else is scope creep. Flag it but don't fail on it — the user accepted the drift.

What to check:
- Dead imports from deleted files (e.g., `import AgentService` anywhere left)
- Stale references to `LibreChatAPI`
- `libreChatAgentId` references still present anywhere

### C: Reactivity Fix Quality (the actual task)
For the 4 target views:

- Pattern used: `.task(id: AuthService.shared.currentUser?.id)` — the fallback pattern
- Does userId filtering exist? (`#Predicate { $0.userId == userId }` or equivalent)
- Does `.task(id:)` re-fire correctly when currentUser changes?
- Any .onAppear fetches that should have been removed still present?
- Is there a clear data-flow: guard → fetch → populate → display?

### D: Backend Completeness
For the `backend/` tree:

- Do routers exist for every domain? (auth, characters, conversations, personas, journals, gallery, config)
- Do SQLAlchemy models map to the planned schema? (rolevault_users, rolevault_characters, etc.)
- Do Pydantic schemas have create/update/response variants?
- Is Alembic configured? (env.py exists, migration pending?)
- Dockerfile complete? (multi-stage, non-root, healthcheck?)
- docker-compose.yml complete? (networks, env vars, no host ports?)
- Does auth router handle register→dual-insert (LibreChat users + rolevault_users)?
- Does config endpoint return inference URL?

### E: Build Integrity
- `project.pbxproj` modified — were new files added to targets correctly?
- xcodebuild succeeds?
- No duplicate file entries?
- Deleted files removed from all targets?
- Any circular imports?

---

## §3 — Locked Decisions (from Original Prompt)

These were the constraints on the reactivity fix. Audit whether they held:

1. Only edit the 4 files — **breached**, but accepted by user
2. @Query preferred over .task(id:) — **partial** — agent used fallback for all 4
3. userId filtering preserved — must confirm
4. Sort order preserved — must confirm
5. No new Swift packages — must confirm
6. No project.yml changes — must confirm (project.pbxproj modified, not project.yml)
7. No git commits — confirmed

---

## §4 — Hard Walls

- ❌ Don't trust any file at face value — verify every claim with rg/xcodebuild/ls
- ❌ Don't write code — audit only
- ❌ Don't read Swift source past what's needed for mechanical checks
- ❌ Don't make git operations

---

## §5 — Verification Checklist (Mechanical)

Run every check. Capture exact output. Mark PASS/FAIL.

### Architecture Correctness

```
1. LibreChat endpoint audit:
   rg "librechat\|LibreChat\|LIBRECHAT" ios/RoleVault/API/AuthService.swift ios/RoleVault/API/ChatService.swift ios/RoleVault/API/ConfigService.swift ios/RoleVault/API/TokenInterceptor.swift
   → Should only appear in comments/docs explaining the pivot, or in the backend reading LibreChat's users table

2. LM Studio inference audit:
   rg "chat/completions\|/v1/chat" ios/RoleVault/API/InferenceAPI.swift
   → Must hit standard OpenAI path

3. RoleVaultAPI target audit:
   rg "8001\|rolevault.*api\|ROLEVAULT" ios/RoleVault/API/RoleVaultAPI.swift
   → Must target port 8001

4. AgentService deletion audit:
   ls ios/RoleVault/API/AgentService.swift 2>&1
   → Should return "No such file"

5. LibreChatAPI deletion audit:
   ls ios/RoleVault/API/LibreChatAPI.swift 2>&1
   → Should return "No such file"

6. libreChatAgentId audit:
   rg "libreChatAgentId\|libreChatAgentId" ios/RoleVault/ --include="*.swift"
   → Should return 0 hits (or only in comments)

7. AgentService reference audit:
   rg "AgentService" ios/RoleVault/ --include="*.swift"
   → Should return 0 hits
```

### Reactivity Fix Quality

```
8. Reactivity pattern audit (all 4 views):
   rg "\.task\(id:.*currentUser\|@Query" ios/RoleVault/Views/Chats/ChatsGalleryView.swift ios/RoleVault/Views/Activity/ActivityCenterView.swift ios/RoleVault/Views/Profile/PersonaManagerView.swift ios/RoleVault/Views/Chats/ChatDetailView.swift
   → Each view must show reactive trigger

9. userId filtering audit (all 4 views):
   rg "userId\|ownerUserId\|#Predicate.*userId" ios/RoleVault/Views/Chats/ChatsGalleryView.swift ios/RoleVault/Views/Activity/ActivityCenterView.swift ios/RoleVault/Views/Profile/PersonaManagerView.swift ios/RoleVault/Views/Chats/ChatDetailView.swift
   → userId scoping must exist

10. Orphaned .onAppear data fetches:
    rg "\.onAppear.*\{.*fetch\|\.onAppear.*\{.*load" ios/RoleVault/Views/Chats/ChatsGalleryView.swift ios/RoleVault/Views/Activity/ActivityCenterView.swift ios/RoleVault/Views/Profile/PersonaManagerView.swift
    → Should return 0 hits for data-load blocks (UI setup blocks are fine)
```

### Backend Completeness

```
11. Backend router inventory:
    ls backend/app/*/router.py backend/app/auth/router.py 2>/dev/null
    → Expected: auth, characters, conversations, personas, journals, gallery, config_endpoint

12. Backend models audit:
    rg "class.*\(Base\)" backend/app/models.py
    → Expected: User, Character, CharacterCustomization, Conversation, Message, Persona, JournalEntry, GalleryMoment (or equivalent names)

13. Backend Dockerfile audit:
    grep -c "FROM\|EXPOSE\|HEALTHCHECK\|CMD\|ENTRYPOINT" backend/Dockerfile
    → Expected: at least 5 matches (complete Dockerfile)

14. Backend compose audit:
    rg "8001\|networks:\|environment:" backend/docker-compose.yml
    → Expected: port 8001, network config, env vars

15. Alembic configuration:
    ls backend/alembic/env.py backend/alembic.ini 2>/dev/null
    → Both must exist
```

### Build Integrity

```
16. project.pbxproj has new files:
    rg "RoleVaultAPI.swift\|InferenceAPI.swift\|RemoteModels.swift\|RegisterView.swift" ios/RoleVault.xcodeproj/project.pbxproj
    → All 4 new files must appear

17. project.pbxproj missing deleted files:
    rg "AgentService.swift\|LibreChatAPI.swift\|ConfigModels.swift" ios/RoleVault.xcodeproj/project.pbxproj
    → Should return 0 hits (or commented out)

18. Compilation:
    cd ios && xcodegen generate 2>&1 | tail -3
    xcodebuild -scheme RoleVault -destination 'platform=iOS Simulator,name=iPhone 16' build 2>&1 | grep "BUILD"
    → Expected: ** BUILD SUCCEEDED **

19. No circular imports:
    rg "import.*AuthService\|import.*ChatService\|import.*CharacterStore" ios/RoleVault/API/*.swift
    → Flag any cross-API import that creates a cycle
```

---

## §6 — Self-Check

- [ ] Every mechanical check in §5 run with exact output captured
- [ ] Dead code search done (stale imports, orphaned references)
- [ ] Backend files actually exist on disk (not just in git index)
- [ ] xcodebuild passes without errors or warnings
- [ ] No assumptions — every claim backed by rg/ls/xcodebuild output

---

## §7 — Bring-Back: Overwrite `docs/user_bring_back.md`

After completing the audit, **overwrite** `~/PROJECTS/rolevault/docs/user_bring_back.md` with:

```
## End-to-End Audit Report

### Model Used
<model name> (e.g., kimi k2.6, gpt-5.5, etc.)

### Architecture Correctness
| # | Check | Result | Evidence |
|---|-------|--------|----------|
| 1 | LibreChat endpoint audit | ✅/❌ | <rg output excerpt> |
| 2 | LM Studio inference audit | ✅/❌ | <rg output excerpt> |
| ... | ... | ... | ... |

### Scope Integrity
- Dead imports found: <list or "none">
- Stale libreChatAgentId references: <count or "none">
- Other scope issues: <list or "none">

### Reactivity Fix Quality
| # | Check | Result | Evidence |
|---|-------|--------|----------|
| 8 | Reactivity pattern audit | ✅/❌ | <per-view summary> |
| 9 | userId filtering audit | ✅/❌ | <rg output excerpt> |
| 10 | Orphaned .onAppear | ✅/❌ | <rg output excerpt> |

### Backend Completeness
| # | Check | Result | Evidence |
|---|-------|--------|----------|
| 11 | Router inventory | ✅/❌ | <ls output> |
| 12 | Models audit | ✅/❌ | <rg output> |
| ... | ... | ... | ... |

### Build Integrity
| # | Check | Result | Evidence |
|---|-------|--------|----------|
| 16 | pbxproj new files | ✅/❌ | <rg output> |
| 17 | pbxproj deleted files | ✅/❌ | <rg output> |
| 18 | Compilation | ✅/❌ | <build output> |
| 19 | Circular imports | ✅/❌ | <rg output> |

### Findings Summary
- Critical issues (block commit): <list or "none">
- High issues (fix before push): <list or "none">
- Medium issues (fix before TestFlight): <list or "none">
- Low issues (cosmetic/deferred): <list or "none">

### Overall Verdict
PASS — build is clean, no regressions, proceed to commit
PASS-WITH-ISSUES — build passes but found issues above
FAIL — build fails or found critical issues

### Kimi Session
Session ID: <uuid>
Session Path: ~/.kimi/sessions/<uuid>/
Export Path: ~/.kimi/sessions/<uuid>/session.jsonl
```
