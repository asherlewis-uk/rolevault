# RoleVault Architecture Pivot — Plan

**Date:** 2026-05-13
**Status:** DRAFT — awaiting kimi-cli audit via rotation pipeline

> ⚠️ This document is a draft. It must be reviewed by kimi-cli before any code is written.
> Submit it via the rotation pipeline: `docs/user_next_prompt.md` → kimi-cli → `docs/user_bring_back.md`

---

## §0 — Problem

RoleVault currently acts as a thin skin over LibreChat's full application layer:

- LibreChat owns users → RoleVault has no auth system
- Characters become LibreChat agents → no independent character DB
- Conversations live in LibreChat's `/api/convos` → no independent chat storage
- No registration flow → users must be created outside the app
- `AgentService` exists solely to push characters into LibreChat's agent system

This makes RoleVault a LibreChat wrapper, not a standalone product. The fix: RoleVault gets its own backend for auth, character management, conversation sync, and personas — while LibreChat is reduced to a **raw inference engine** only.

---

## §1 — Target Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    PostgreSQL (shared)                   │
│                                                         │
│  ┌──────────────────┐    ┌──────────────────────────┐   │
│  │ LibreChat tables  │    │  rolevault_* tables (new) │   │
│  │  - users (read)   │    │  - rolevault_users       │   │
│  │  - conversations   │    │  - rolevault_characters  │   │
│  │  - messages        │    │  - rolevault_customizations│  │
│  │  - agents          │    │  - rolevault_conversations│  │
│  │  (UNTOUCHED)       │    │  - rolevault_messages    │   │
│  └──────────────────┘    │  - rolevault_personas     │   │
│                          └──────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
         ▲                              ▲
         │                              │
    ┌─────────┐                   ┌──────────────┐
    │LibreChat│                   │RoleVault API │
    │(untchd) │                   │  (NEW)       │
    │         │                   │              │
    │ /api/ask│                   │ FastAPI      │
    │ (SSE)   │                   │ SQLAlchemy   │
    └────┬────┘                   │ asyncpg      │
         │                        └──────┬───────┘
         │                               │
         │    ┌──────────────────┐       │
         └───▶│  RoleVault iOS   │◀──────┘
              │  (dual baseURL)  │
              └──────────────────┘
```

**Two services, one database, one client:**

| Service | Role | Port | Network |
|---------|------|------|---------|
| LibreChat | Inference only (`/api/ask`) | 3080 (unchanged) | `server_internal` |
| RoleVault API | Auth, characters, conversations, personas | 8001 (new) | `server_internal` |
| PostgreSQL | Shared DB (both services) | 5432 | `server_internal` |

---

## §2 — Database Schema (New Tables)

All tables prefixed `rolevault_` to avoid collision with LibreChat's schema.

### `rolevault_users`
> Extends LibreChat's `users` table — mirrors the LibreChat user ID but adds RoleVault-specific fields.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid PK` | matches LibreChat `users.id` |
| `email` | `text UNIQUE` | denormalized from LibreChat for fast lookups |
| `display_name` | `text` | user-set display name |
| `avatar_url` | `text` | nullable |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | |

**Registration flow inserts into BOTH** `users` (LibreChat's table) and `rolevault_users` in a transaction.

### `rolevault_characters`

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid PK` | |
| `owner_user_id` | `uuid FK → rolevault_users.id` | |
| `name` | `text NOT NULL` | |
| `visibility` | `text NOT NULL` | `owned`, `legacy`, `shared` |
| `category` | `text` | nullable |
| `backstory` | `text` | |
| `response_directive` | `text` | |
| `key_memories` | `text` | |
| `greeting_message` | `text` | |
| `example_message` | `text` | |
| `face_detail` | `text` | |
| `interaction_mode` | `text` | |
| `dynamism` | `text` | |
| `avatar_description` | `text` | |
| `avatar_data` | `bytea` | nullable PNG for Tavern import/export |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | |

### `rolevault_character_customizations`

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid PK` | |
| `character_id` | `uuid FK → rolevault_characters.id` | ON DELETE CASCADE |
| `user_id` | `uuid FK → rolevault_users.id` | |
| `is_favorite` | `boolean DEFAULT false` | |
| `backstory_override` | `text` | nullable |
| `response_directive_override` | `text` | nullable |
| `key_memories_override` | `text` | nullable |
| `greeting_message_override` | `text` | nullable |
| `example_message_override` | `text` | nullable |
| `face_detail_override` | `text` | nullable |
| `dynamism_override` | `text` | nullable |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | |

`UNIQUE (character_id, user_id)`

### `rolevault_conversations`

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid PK` | |
| `user_id` | `uuid FK → rolevault_users.id` | |
| `character_id` | `uuid FK → rolevault_characters.id` | nullable (unguided chats) |
| `persona_id` | `uuid FK → rolevault_personas.id` | nullable |
| `title` | `text` | auto-generated from first message |
| `model` | `text` | e.g. `gpt-4o` |
| `is_archived` | `boolean DEFAULT false` | |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | |

### `rolevault_messages`

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid PK` | |
| `conversation_id` | `uuid FK → rolevault_conversations.id` | ON DELETE CASCADE |
| `user_id` | `uuid FK → rolevault_users.id` | |
| `role` | `text NOT NULL` | `user`, `assistant`, `system` |
| `content` | `text NOT NULL` | |
| `created_at` | `timestamptz` | |

### `rolevault_personas`

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid PK` | |
| `user_id` | `uuid FK → rolevault_users.id` | |
| `name` | `text NOT NULL` | |
| `description` | `text` | |
| `is_active` | `boolean DEFAULT false` | one per user |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | |

---

## §3 — RoleVault API Endpoints

All endpoints prefixed `/api/`. Base URL: `http://<host>:8001`.

### Auth

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `POST` | `/api/auth/register` | None | Create user in LibreChat `users` + `rolevault_users`. Returns `{ token, user }` |
| `POST` | `/api/auth/login` | None | Verify against LibreChat `users`. Returns `{ token, user }` |
| `POST` | `/api/auth/refresh` | Bearer | Rotate JWT. Returns `{ token }` |
| `POST` | `/api/auth/logout` | Bearer | Invalidate token server-side |

**JWT:** RoleVault issues its own JWTs (not LibreChat's). Payload: `{ sub: user_id, email }`. Signed with `ROLEVAULT_JWT_SECRET`.

**Password verification:** Reads LibreChat's `users` table directly using LibreChat's own password hashing (bcrypt). Registration inserts into both tables atomically.

### Characters

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/api/characters` | Bearer | List. Query params: `?category=X`, `?owner=me\|user_id`, `?visibility=owned\|shared\|legacy` |
| `POST` | `/api/characters` | Bearer | Create. Owner = authenticated user |
| `GET` | `/api/characters/{id}` | Bearer | Fetch single character with current user's customization merged |
| `PUT` | `/api/characters/{id}` | Bearer | Update. Owner-gated (`owner_user_id == auth_user`) |
| `DELETE` | `/api/characters/{id}` | Bearer | Delete. Owner-gated. Cascades to customizations |
| `GET` | `/api/characters/{id}/customizations` | Bearer | Fetch current user's customization for this character |
| `PUT` | `/api/characters/{id}/customizations` | Bearer | Upsert customization. Overrides only — null fields fall through to base |

### Conversations

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/api/convos` | Bearer | List user's conversations. Query: `?character_id=X`, `?archived=true\|false` |
| `POST` | `/api/convos` | Bearer | Create. Body: `{ character_id?, persona_id?, model? }` |
| `GET` | `/api/convos/{id}` | Bearer | Fetch single conversation metadata |
| `GET` | `/api/convos/{id}/messages` | Bearer | Fetch messages ordered by created_at |
| `PATCH` | `/api/convos/{id}` | Bearer | Update title, archive status |
| `DELETE` | `/api/convos/{id}` | Bearer | Delete. Cascades to messages |

### Personas

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/api/personas` | Bearer | List user's personas |
| `POST` | `/api/personas` | Bearer | Create |
| `GET` | `/api/personas/{id}` | Bearer | Fetch single |
| `PUT` | `/api/personas/{id}` | Bearer | Update |
| `DELETE` | `/api/personas/{id}` | Bearer | Delete |
| `PUT` | `/api/personas/{id}/activate` | Bearer | Set as active. Deactivates all others atomically |

### Config

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/api/config` | Bearer | Returns available models, inference URL, app version info |

---

## §4 — iOS Client Refactor

### Architecture Changes

**Current:**
```
iOS → LibreChatAPI (one baseURL) → LibreChat (everything)
```

**Target:**
```
iOS → RoleVaultAPI (baseURL) → RoleVault Backend (auth, CRUD, sync)
iOS → InferenceAPI (inferenceURL) → LibreChat (inference only)
```

Two separate API clients, each with their own base URL, token handling, and error mapping.

### File-by-File Changes

#### 1. `ios/RoleVault/API/LibreChatAPI.swift` → Split into two

| New File | Purpose | Base URL default |
|----------|---------|-----------------|
| `RoleVaultAPI.swift` | Auth + CRUD calls to RoleVault Backend | `http://<roleVaultHost>:8001` |
| `InferenceAPI.swift` | Chat streaming calls to LibreChat | `http://<libreChatHost>:3080` |

Both share `TokenInterceptor` (JWT injection + 401 refresh logic) but with minor differences:
- RoleVaultAPI's token is the RoleVault JWT
- InferenceAPI doesn't need auth (LibreChat's /api/ask can accept unauthenticated requests if configured, or uses a service-level API key)

#### 2. `ios/RoleVault/API/AuthService.swift` — Rewrite

**DELETE:**
- `POST /api/auth/login` → LibreChat

**ADD:**
- `POST /api/auth/register` → RoleVaultAPI (email, password, display_name) → `{ token, user }`
- `POST /api/auth/login` → RoleVaultAPI (email, password) → `{ token, user }`
- `POST /api/auth/logout` → RoleVaultAPI
- `POST /api/auth/refresh` → RoleVaultAPI

**RENAME:** `isAuthenticated` stays. `currentUser` stays but now sourced from RoleVault Backend response, not LibreChat.

**DELETE:**
- Legacy unscoped data migration (`migrateUnscopedData`) — no longer needed since RoleVault Backend owns all data from day one

#### 3. `ios/RoleVault/API/AgentService.swift` — DELETE

Entire file. No agents. Characters are independent entities.

#### 4. `ios/RoleVault/API/ChatService.swift` — Rewrite

**DELETE:**
- `POST /api/ask` → LibreChat with `endpoint: "agents"`, `agentOptions.agentId`
- `GET /api/convos` → LibreChat
- `GET /api/messages/{id}` → LibreChat

**ADD:**
- `POST /api/ask` → InferenceAPI (LibreChat) — simplified payload:
  ```json
  { "text": "user message", "conversationId": "...", "instructions": "<character prompt>", "model": "gpt-4o" }
  ```
  NO `endpoint`. NO `agentOptions`. NO `persona` field.
- `GET /api/convos` → RoleVaultAPI
- `POST /api/convos` → RoleVaultAPI
- `GET /api/convos/{id}/messages` → RoleVaultAPI
- `PATCH /api/convos/{id}` → RoleVaultAPI
- `DELETE /api/convos/{id}` → RoleVaultAPI

**SSE streaming unchanged** — `URLSession.AsyncBytes.lines` still works for `/api/ask`.

#### 5. `ios/RoleVault/API/ConfigService.swift` — Rewrite

**DELETE:**
- `GET /api/config` → LibreChat

**ADD:**
- `GET /api/config` → RoleVaultAPI — returns model list and inference URL

#### 6. `ios/RoleVault/Data/CharacterStore.swift` — Rewrite

**DELETE:**
- Local-only SwiftData CRUD (characters, customizations)
- `libreChatAgentId` field on Character

**ADD:**
- All CRUD calls go through RoleVaultAPI
- Local SwiftData cache mirrors remote state
- `ownerUserId` remains for permission gating

#### 7. `ios/RoleVault/Data/SwiftDataContainer.swift` — Minimal changes

Models stay. `libreChatAgentId` removed from `Character`. Local cache models now mirror the rolevault_* table shapes exactly. Sync strategy: fetch-on-launch, write-through on mutations, conflict resolution server-wins.

#### 8. `ios/RoleVault/Views/Profile/SettingsView.swift` — Add second URL field

Current: one `Backend URL` text field.
Target: two fields:
- `RoleVault Server` — base URL for RoleVaultAPI
- `Inference Server` — base URL for InferenceAPI (LibreChat)

Both persisted in `UserDefaults` under separate keys.

#### 9. `ios/RoleVault/Views/Auth/` — Add RegisterView.swift

New view: registration form (email, password, confirm password, display name). Calls `AuthService.register()`. Transitions to home on success.

Existing `LoginView.swift` gains a "Don't have an account? Sign up" button.

#### 10. Models — Remove `libreChatAgentId`

- `Character.swift`: delete `libreChatAgentId: String?`
- `ChatModels.swift`: simplify `AskRequest` — remove `endpoint`, `agentOptions`, `persona`

---

## §5 — Deployment

### RoleVault Backend

```yaml
# Added to existing docker-compose.yml alongside LibreChat
services:
  rolevault-api:
    image: git.asherlewis.online/asher/rolevault-api:prod
    container_name: rolevault-api
    restart: unless-stopped
    networks:
      - server_internal
    environment:
      - DATABASE_URL=postgresql+asyncpg://rolevault:${ROLEVAULT_DB_PASSWORD}@postgres:5432/rolevault
      - LIBRECHAT_DB_URL=postgresql+asyncpg://librechat:${LIBRECHAT_DB_PASSWORD}@postgres:5432/librechat
      - JWT_SECRET=${ROLEVAULT_JWT_SECRET}
      - INFERENCE_URL=http://librechat:3080
    # No host ports — accessed through Caddy/CF Tunnel
```

### Database

New PostgreSQL role `rolevault` with its own database `rolevault`:

```sql
CREATE ROLE rolevault WITH LOGIN PASSWORD '...';
CREATE DATABASE rolevault OWNER rolevault;
-- Or: use same database, different schema
CREATE SCHEMA rolevault AUTHORIZATION rolevault;
```

**Option: same DB, separate schema** (cleaner — one connection string, namespace isolation).

### CI/CD

New Forgejo Actions workflow for `rolevault-api` repo:
- Build Python Docker image on push to main
- Tag with `<git-sha>` + `:prod`
- Push to Forgejo registry

iOS CI unchanged — GitHub Actions + Fastlane + TestFlight stays exactly as-is.

---

## §6 — Migration Path

This is a clean break, not an in-place migration. The old LibreChat-backed data is incompatible with the new schema.

**Strategy:** Fresh start. First launch after update:

1. App detects no local SwiftData cache + no server data → shows registration screen
2. User registers → RoleVault Backend creates user in both `users` (LibreChat's table) and `rolevault_users`
3. Empty state — no characters, no conversations. User creates from scratch or imports Tavern cards

**No data migration from LibreChat's agents/conversations.** Those were LibreChat constructs. Starting fresh.

---

## §7 — Rotation Plan

| Rotation | Scope | Deliverable | Effort |
|----------|-------|------------|--------|
| **R1** | RoleVault Backend — scaffold | FastAPI project, DB models (SQLAlchemy), migrations (Alembic), Dockerfile, docker-compose entry, health endpoint | 2-3 hrs |
| **R2** | RoleVault Backend — auth | Register, login, logout, refresh endpoints. JWT utilities. LibreChat password verification. User CRUD. Tests. | 2-3 hrs |
| **R3** | RoleVault Backend — characters | Full CRUD + customizations endpoints. Ownership gating. Tests. | 2-3 hrs |
| **R4** | RoleVault Backend — conversations + personas | Conversation CRUD, message storage, persona CRUD, config endpoint. Tests. | 2-3 hrs |
| **R5** | RoleVault Backend — deploy | Docker image build, push to Forgejo, deploy to Legion, verify health | 1 hr |
| **R6** | iOS — API layer refactor | Split LibreChatAPI → RoleVaultAPI + InferenceAPI. Rewrite AuthService, ChatService, ConfigService. RegisterView. | 3-4 hrs |
| **R7** | iOS — data layer refactor | CharacterStore → backend calls. Remove AgentService. Remove libreChatAgentId. Sync strategy. | 3-4 hrs |
| **R8** | iOS — UI polish + build | SettingsView dual URL. Registration flow. Remove agent references. Build + TestFlight. | 2-3 hrs |

**Total: ~18-24 hours across 8 rotations.**

---

## §8 — Locked Decisions

1. **Backend stack:** Python 3.12, FastAPI, SQLAlchemy 2.0 (async), Alembic, asyncpg, Pydantic v2
2. **Database:** Same PostgreSQL, new `rolevault` schema, new `rolevault` DB role
3. **Auth:** RoleVault issues its own JWTs. Registers users into LibreChat's `users` table + `rolevault_users` atomically
4. **Inference:** LibreChat's `/api/ask` only. No agents. No endpoint routing. Raw `instructions` field built from character.
5. **iOS client:** Dual base URLs. Two API clients. Settings screen gets two URL fields.
6. **AgentService:** Deleted entirely. Characters are independent entities.
7. **Data migration:** None. Fresh start. Old LibreChat data is incompatible.
8. **TestFlight:** Unchanged. iOS CI pipeline stays exactly as-is.
9. **Deployment:** Same docker-compose, same `server_internal` network, new `rolevault-api` container
10. **No hardcoded secrets** — everything through env vars
