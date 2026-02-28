# DevNet StudyLab -- Environment Variables

> **File location:** `apps/web/.env.local`

All environment variables used by the Next.js web application.

---

## Required Variables

### `DATABASE_URL`

PostgreSQL connection string for the application database.

| Property | Value |
|----------|-------|
| Required | Yes (for full functionality) |
| Default | None |
| Format | `postgresql://USER:PASSWORD@HOST:PORT/DATABASE` |

**Development default:**

```
DATABASE_URL=postgresql://studylab:studylab_dev_2024@localhost:5432/studylab
```

When unset, the app runs in file-only mode: content loads from JSON files and progress is not persisted to the database.

---

### `AUTH_SECRET`

Encryption key for Auth.js JWT sessions. Used to sign and verify session tokens.

| Property | Value |
|----------|-------|
| Required | Yes (for authentication) |
| Default | `devnet-studylab-dev-secret-change-in-production` (dev fallback) |
| Format | Base64 string, 32+ bytes |

**Generate a secure value:**

```bash
openssl rand -base64 32
```

The dev fallback is set automatically when `AUTH_SECRET` is unset, so authentication works without explicit configuration in development. Always set a unique value in production.

---

## Optional Variables

### `TUTOR_ANTHROPIC_KEY`

API key for Claude (Anthropic) powering the AI Tutor feature. This variable is intentionally named `TUTOR_ANTHROPIC_KEY` rather than `ANTHROPIC_API_KEY` to avoid conflicts with the Claude Code CLI, which reserves `ANTHROPIC_API_KEY` for its own use.

| Property | Value |
|----------|-------|
| Required | No |
| Default | None |
| Format | `sk-ant-api03-...` |

When unset, the AI Tutor page loads but returns a 401 error when sending messages. All other features work without this key.

**Get a key:** [console.anthropic.com](https://console.anthropic.com/)

---

### `SKIP_AUTH`

Bypasses authentication middleware. Used for E2E testing and development without a database.

| Property | Value |
|----------|-------|
| Required | No |
| Default | Not set (authentication enabled) |
| Values | `"true"` to skip auth |

When set to `"true"`:
- The middleware does not redirect unauthenticated users to `/login`
- `getCurrentUserId()` returns `null` (progress is not saved to DB)
- The app behaves as if no user is logged in

Set automatically by Playwright in `playwright.config.ts`:

```typescript
webServer: {
  env: {
    SKIP_AUTH: "true",
  },
},
```

---

### `POSTGRES_PASSWORD`

PostgreSQL password used by Docker Compose. This is a Docker-level variable, not a Next.js variable.

| Property | Value |
|----------|-------|
| Required | No |
| Default | `studylab_dev_2024` |
| Used by | `docker/docker-compose.yml` |

If changed, update `DATABASE_URL` to match.

---

## Example `.env.local`

```env
# ── Database ────────────────────────────────────────────
DATABASE_URL=postgresql://studylab:studylab_dev_2024@localhost:5432/studylab

# ── Auth.js ─────────────────────────────────────────────
AUTH_SECRET=your-generated-base64-secret-here

# ── AI Tutor (optional) ────────────────────────────────
# TUTOR_ANTHROPIC_KEY=sk-ant-api03-...

# ── Testing (do not set in production) ─────────────────
# SKIP_AUTH=true
```

---

## Variable Summary

| Variable | Required | Default | Used By |
|----------|----------|---------|---------|
| `DATABASE_URL` | For DB features | None | `lib/db/index.ts`, `middleware.ts`, `lib/auth-helpers.ts` |
| `AUTH_SECRET` | For auth | Dev fallback | `lib/auth.ts` (Auth.js) |
| `TUTOR_ANTHROPIC_KEY` | For AI Tutor | None | `api/chat/route.ts` |
| `SKIP_AUTH` | For testing | Not set | `middleware.ts`, `lib/auth-helpers.ts` |
| `POSTGRES_PASSWORD` | For Docker | `studylab_dev_2024` | `docker/docker-compose.yml` |
