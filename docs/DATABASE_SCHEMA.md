# DevNet StudyLab -- Database Schema

> **Last updated:** 2026-02-27
> **Version:** 1.0.0
> **ORM:** Drizzle ORM (PostgreSQL)
> **Schema file:** `apps/web/src/lib/db/schema.ts`

---

## Table of Contents

1. [Overview](#overview)
2. [Enums](#enums)
3. [Auth Tables](#auth-tables)
4. [Content Tables](#content-tables)
5. [Progress Tables](#progress-tables)
6. [Lab Tables](#lab-tables)
7. [AI Tutor Tables](#ai-tutor-tables)
8. [Entity Relationship Summary](#entity-relationship-summary)
9. [Index Listing](#index-listing)
10. [Migration Strategy](#migration-strategy)

---

## Overview

The database contains **15 tables** and **5 custom enums** organized into five categories:

| Category | Tables | Purpose |
|----------|--------|---------|
| Auth | `users`, `accounts`, `sessions`, `verification_tokens` | Authentication and session management (Auth.js compatible) |
| Content | `domains`, `objectives`, `flashcards`, `practice_questions` | Exam content and study material |
| Progress | `flashcard_progress`, `study_progress`, `practice_attempts`, `practice_answers` | User progress tracking |
| Labs | `labs`, `lab_attempts` | Hands-on lab definitions and submissions |
| AI Tutor | `tutor_conversations`, `tutor_messages` | Chat history with the AI tutor |

**Database:** PostgreSQL 16 (Alpine)
**Extensions:** `uuid-ossp`, `pgcrypto`

---

## Enums

### difficulty

```sql
CREATE TYPE difficulty AS ENUM ('easy', 'medium', 'hard');
```

Used by: `flashcards`, `practice_questions`, `labs`

### question_type

```sql
CREATE TYPE question_type AS ENUM ('multiple_choice', 'multiple_select', 'drag_drop', 'fill_blank');
```

Used by: `practice_questions`

### lab_type

```sql
CREATE TYPE lab_type AS ENUM ('python', 'bash', 'api', 'git', 'docker', 'ansible', 'netconf');
```

Used by: `labs`

### lab_status

```sql
CREATE TYPE lab_status AS ENUM ('started', 'completed', 'failed');
```

Used by: `lab_attempts`

### tutor_role

```sql
CREATE TYPE tutor_role AS ENUM ('user', 'assistant', 'system');
```

Used by: `tutor_messages`

---

## Auth Tables

### users

Primary user table. Compatible with the Auth.js (NextAuth v5) Drizzle adapter.

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | No | `gen_random_uuid()` | **PRIMARY KEY** |
| `name` | `text` | Yes | `null` | |
| `email` | `text` | No | -- | `NOT NULL` |
| `email_verified` | `timestamp` | Yes | `null` | |
| `image` | `text` | Yes | `null` | |
| `hashed_password` | `text` | Yes | `null` | For credential-based auth |
| `created_at` | `timestamp` | No | `now()` | `NOT NULL` |
| `updated_at` | `timestamp` | No | `now()` | `NOT NULL`, auto-updates |

**Indexes:**
- `users_email_idx` -- UNIQUE on `email`

**Relationships:**
- Has many: `accounts`, `sessions`, `flashcard_progress`, `practice_attempts`, `lab_attempts`, `study_progress`, `tutor_conversations`

---

### accounts

OAuth provider accounts linked to users. Auth.js adapter compatible.

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | No | `gen_random_uuid()` | **PRIMARY KEY** |
| `user_id` | `uuid` | No | -- | `NOT NULL`, FK -> `users.id` ON DELETE CASCADE |
| `type` | `text` | No | -- | `NOT NULL` (e.g., "oauth", "email") |
| `provider` | `text` | No | -- | `NOT NULL` (e.g., "github", "google") |
| `provider_account_id` | `text` | No | -- | `NOT NULL` |
| `refresh_token` | `text` | Yes | `null` | |
| `access_token` | `text` | Yes | `null` | |
| `expires_at` | `integer` | Yes | `null` | Unix timestamp |
| `token_type` | `text` | Yes | `null` | |
| `scope` | `text` | Yes | `null` | |
| `id_token` | `text` | Yes | `null` | |
| `session_state` | `text` | Yes | `null` | |

**Indexes:**
- `accounts_provider_account_idx` -- UNIQUE on (`provider`, `provider_account_id`)
- `accounts_user_id_idx` -- on `user_id`

**Relationships:**
- Belongs to: `users` (via `user_id`, CASCADE delete)

---

### sessions

Active user sessions.

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | No | `gen_random_uuid()` | **PRIMARY KEY** |
| `session_token` | `text` | No | -- | `NOT NULL`, UNIQUE |
| `user_id` | `uuid` | No | -- | `NOT NULL`, FK -> `users.id` ON DELETE CASCADE |
| `expires` | `timestamp` | No | -- | `NOT NULL` |

**Indexes:**
- `sessions_user_id_idx` -- on `user_id`

**Relationships:**
- Belongs to: `users` (via `user_id`, CASCADE delete)

---

### verification_tokens

Email verification tokens. Uses a composite primary key.

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `identifier` | `text` | No | -- | `NOT NULL`, part of **PRIMARY KEY** |
| `token` | `text` | No | -- | `NOT NULL`, part of **PRIMARY KEY** |
| `expires` | `timestamp` | No | -- | `NOT NULL` |

**Primary Key:** (`identifier`, `token`)

---

## Content Tables

### domains

The six exam domains with their weights and ordering.

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `serial` | No | auto-increment | **PRIMARY KEY** |
| `slug` | `text` | No | -- | `NOT NULL` |
| `name` | `text` | No | -- | `NOT NULL` |
| `description` | `text` | Yes | `null` | |
| `weight` | `integer` | No | -- | `NOT NULL` (exam percentage) |
| `order_index` | `integer` | No | `0` | `NOT NULL` |

**Indexes:**
- `domains_slug_idx` -- UNIQUE on `slug`

**Relationships:**
- Has many: `objectives`, `study_progress`, `tutor_conversations`

---

### objectives

Individual exam objectives within each domain.

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `serial` | No | auto-increment | **PRIMARY KEY** |
| `domain_id` | `integer` | No | -- | `NOT NULL`, FK -> `domains.id` ON DELETE CASCADE |
| `code` | `text` | No | -- | `NOT NULL` (e.g., "1.1", "2.3") |
| `title` | `text` | No | -- | `NOT NULL` |
| `description` | `text` | Yes | `null` | |

**Indexes:**
- `objectives_domain_id_idx` -- on `domain_id`

**Relationships:**
- Belongs to: `domains` (via `domain_id`, CASCADE delete)
- Has many: `flashcards`, `practice_questions`, `labs`, `study_progress`

---

### flashcards

Flashcard content for spaced repetition study.

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | No | `gen_random_uuid()` | **PRIMARY KEY** |
| `objective_id` | `integer` | No | -- | `NOT NULL`, FK -> `objectives.id` ON DELETE CASCADE |
| `question` | `text` | No | -- | `NOT NULL` (front of card) |
| `answer` | `text` | No | -- | `NOT NULL` (back of card) |
| `explanation` | `text` | Yes | `null` | Extended explanation |
| `source_url` | `text` | Yes | `null` | Reference URL |
| `difficulty` | `difficulty` | No | `'medium'` | `NOT NULL` |
| `tags` | `text[]` | Yes | `null` | Array of tags |

**Indexes:**
- `flashcards_objective_id_idx` -- on `objective_id`

**Relationships:**
- Belongs to: `objectives` (via `objective_id`, CASCADE delete)
- Has many: `flashcard_progress`

---

### practice_questions

Practice exam questions supporting multiple question types.

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | No | `gen_random_uuid()` | **PRIMARY KEY** |
| `objective_id` | `integer` | No | -- | `NOT NULL`, FK -> `objectives.id` ON DELETE CASCADE |
| `type` | `question_type` | No | -- | `NOT NULL` |
| `question` | `text` | No | -- | `NOT NULL` |
| `options` | `jsonb` | Yes | `null` | Answer options (for MC/MS) |
| `correct_answer` | `jsonb` | No | -- | `NOT NULL` (varies by type) |
| `explanation` | `text` | Yes | `null` | |
| `source_url` | `text` | Yes | `null` | |
| `difficulty` | `difficulty` | No | `'medium'` | `NOT NULL` |
| `tags` | `text[]` | Yes | `null` | |

**Indexes:**
- `practice_questions_objective_id_idx` -- on `objective_id`

**Relationships:**
- Belongs to: `objectives` (via `objective_id`, CASCADE delete)
- Has many: `practice_answers`

---

## Progress Tables

### flashcard_progress

SM-2 spaced repetition state per user per flashcard.

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `serial` | No | auto-increment | **PRIMARY KEY** |
| `user_id` | `uuid` | No | -- | `NOT NULL`, FK -> `users.id` ON DELETE CASCADE |
| `flashcard_id` | `uuid` | No | -- | `NOT NULL`, FK -> `flashcards.id` ON DELETE CASCADE |
| `ease` | `real` | No | `2.5` | `NOT NULL` (SM-2 easiness factor) |
| `interval` | `integer` | No | `0` | `NOT NULL` (days until next review) |
| `repetitions` | `integer` | No | `0` | `NOT NULL` (consecutive correct answers) |
| `next_review` | `timestamp` | Yes | `null` | Next scheduled review date |
| `last_review` | `timestamp` | Yes | `null` | Last review date |

**Indexes:**
- `flashcard_progress_user_id_idx` -- on `user_id`
- `flashcard_progress_next_review_idx` -- on `next_review`
- `flashcard_progress_user_card_idx` -- UNIQUE on (`user_id`, `flashcard_id`)

**Relationships:**
- Belongs to: `users` (via `user_id`, CASCADE delete)
- Belongs to: `flashcards` (via `flashcard_id`, CASCADE delete)

---

### study_progress

Per-objective study completion and confidence tracking.

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `serial` | No | auto-increment | **PRIMARY KEY** |
| `user_id` | `uuid` | No | -- | `NOT NULL`, FK -> `users.id` ON DELETE CASCADE |
| `domain_id` | `integer` | No | -- | `NOT NULL`, FK -> `domains.id` ON DELETE CASCADE |
| `objective_id` | `integer` | Yes | `null` | FK -> `objectives.id` ON DELETE SET NULL |
| `completed_at` | `timestamp` | Yes | `null` | |
| `confidence_level` | `integer` | No | `1` | `NOT NULL` (1-5 scale) |
| `notes` | `text` | Yes | `null` | |

**Indexes:**
- `study_progress_user_id_idx` -- on `user_id`
- `study_progress_domain_id_idx` -- on `domain_id`
- `study_progress_objective_id_idx` -- on `objective_id`

**Relationships:**
- Belongs to: `users` (via `user_id`, CASCADE delete)
- Belongs to: `domains` (via `domain_id`, CASCADE delete)
- Belongs to: `objectives` (via `objective_id`, SET NULL on delete)

---

### practice_attempts

Practice exam attempt records.

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | No | `gen_random_uuid()` | **PRIMARY KEY** |
| `user_id` | `uuid` | No | -- | `NOT NULL`, FK -> `users.id` ON DELETE CASCADE |
| `started_at` | `timestamp` | No | `now()` | `NOT NULL` |
| `completed_at` | `timestamp` | Yes | `null` | |
| `score` | `real` | Yes | `null` | Percentage score (0-100) |
| `total_questions` | `integer` | Yes | `null` | |
| `domain_filter` | `text` | Yes | `null` | Domain slug if filtered |

**Indexes:**
- `practice_attempts_user_id_idx` -- on `user_id`

**Relationships:**
- Belongs to: `users` (via `user_id`, CASCADE delete)
- Has many: `practice_answers`

---

### practice_answers

Individual answers within a practice attempt.

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `serial` | No | auto-increment | **PRIMARY KEY** |
| `attempt_id` | `uuid` | No | -- | `NOT NULL`, FK -> `practice_attempts.id` ON DELETE CASCADE |
| `question_id` | `uuid` | No | -- | `NOT NULL`, FK -> `practice_questions.id` ON DELETE CASCADE |
| `user_answer` | `jsonb` | Yes | `null` | User's selected answer(s) |
| `is_correct` | `boolean` | No | -- | `NOT NULL` |
| `time_spent` | `integer` | Yes | `null` | Seconds spent on question |

**Indexes:**
- `practice_answers_attempt_id_idx` -- on `attempt_id`

**Relationships:**
- Belongs to: `practice_attempts` (via `attempt_id`, CASCADE delete)
- Belongs to: `practice_questions` (via `question_id`, CASCADE delete)

---

## Lab Tables

### labs

Lab exercise definitions.

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | No | `gen_random_uuid()` | **PRIMARY KEY** |
| `objective_id` | `integer` | No | -- | `NOT NULL`, FK -> `objectives.id` ON DELETE CASCADE |
| `slug` | `text` | No | -- | `NOT NULL` |
| `title` | `text` | No | -- | `NOT NULL` |
| `description` | `text` | Yes | `null` | |
| `difficulty` | `difficulty` | No | `'medium'` | `NOT NULL` |
| `estimated_minutes` | `integer` | Yes | `null` | |
| `type` | `lab_type` | No | -- | `NOT NULL` |
| `instructions` | `text` | Yes | `null` | Markdown instructions |
| `starter_code` | `text` | Yes | `null` | Initial code template |
| `solution_code` | `text` | Yes | `null` | Reference solution |
| `validation_script` | `text` | Yes | `null` | Grading script |
| `tags` | `text[]` | Yes | `null` | |

**Indexes:**
- `labs_slug_idx` -- UNIQUE on `slug`
- `labs_objective_id_idx` -- on `objective_id`

**Relationships:**
- Belongs to: `objectives` (via `objective_id`, CASCADE delete)
- Has many: `lab_attempts`

---

### lab_attempts

User lab submission and grading records.

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | No | `gen_random_uuid()` | **PRIMARY KEY** |
| `user_id` | `uuid` | No | -- | `NOT NULL`, FK -> `users.id` ON DELETE CASCADE |
| `lab_id` | `uuid` | No | -- | `NOT NULL`, FK -> `labs.id` ON DELETE CASCADE |
| `status` | `lab_status` | No | `'started'` | `NOT NULL` |
| `started_at` | `timestamp` | No | `now()` | `NOT NULL` |
| `completed_at` | `timestamp` | Yes | `null` | |
| `user_code` | `text` | Yes | `null` | Submitted code |
| `grade` | `real` | Yes | `null` | Score (0.0-1.0) |
| `feedback` | `text` | Yes | `null` | Grader feedback |

**Indexes:**
- `lab_attempts_user_id_idx` -- on `user_id`

**Relationships:**
- Belongs to: `users` (via `user_id`, CASCADE delete)
- Belongs to: `labs` (via `lab_id`, CASCADE delete)

---

## AI Tutor Tables

### tutor_conversations

Conversation metadata for AI tutor sessions.

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | No | `gen_random_uuid()` | **PRIMARY KEY** |
| `user_id` | `uuid` | No | -- | `NOT NULL`, FK -> `users.id` ON DELETE CASCADE |
| `title` | `text` | Yes | `null` | Auto-generated from first message |
| `domain_id` | `integer` | Yes | `null` | FK -> `domains.id` ON DELETE SET NULL |
| `created_at` | `timestamp` | No | `now()` | `NOT NULL` |
| `updated_at` | `timestamp` | No | `now()` | `NOT NULL`, auto-updates |

**Indexes:**
- `tutor_conversations_user_id_idx` -- on `user_id`

**Relationships:**
- Belongs to: `users` (via `user_id`, CASCADE delete)
- Belongs to: `domains` (via `domain_id`, SET NULL on delete)
- Has many: `tutor_messages`

---

### tutor_messages

Individual messages within tutor conversations.

| Column | Type | Nullable | Default | Constraints |
|--------|------|----------|---------|-------------|
| `id` | `serial` | No | auto-increment | **PRIMARY KEY** |
| `conversation_id` | `uuid` | No | -- | `NOT NULL`, FK -> `tutor_conversations.id` ON DELETE CASCADE |
| `role` | `tutor_role` | No | -- | `NOT NULL` ("user", "assistant", "system") |
| `content` | `text` | No | -- | `NOT NULL` |
| `created_at` | `timestamp` | No | `now()` | `NOT NULL` |

**Indexes:**
- `tutor_messages_conversation_id_idx` -- on `conversation_id`

**Relationships:**
- Belongs to: `tutor_conversations` (via `conversation_id`, CASCADE delete)

---

## Entity Relationship Summary

```
users ─────────┬───── accounts
               ├───── sessions
               ├───── flashcard_progress ──── flashcards ──── objectives ──── domains
               ├───── study_progress ────────────────────┘         │
               ├───── practice_attempts ── practice_answers ── practice_questions ─┘
               ├───── lab_attempts ──── labs ───────────────────────┘
               └───── tutor_conversations ── tutor_messages
                              │
                              └──── domains (optional)
```

### Cascade Behavior Summary

| Parent | Child | On Delete |
|--------|-------|-----------|
| `users` | `accounts` | CASCADE |
| `users` | `sessions` | CASCADE |
| `users` | `flashcard_progress` | CASCADE |
| `users` | `practice_attempts` | CASCADE |
| `users` | `lab_attempts` | CASCADE |
| `users` | `study_progress` | CASCADE |
| `users` | `tutor_conversations` | CASCADE |
| `domains` | `objectives` | CASCADE |
| `domains` | `study_progress` | CASCADE |
| `domains` | `tutor_conversations` | SET NULL |
| `objectives` | `flashcards` | CASCADE |
| `objectives` | `practice_questions` | CASCADE |
| `objectives` | `labs` | CASCADE |
| `objectives` | `study_progress` | SET NULL |
| `flashcards` | `flashcard_progress` | CASCADE |
| `practice_attempts` | `practice_answers` | CASCADE |
| `practice_questions` | `practice_answers` | CASCADE |
| `labs` | `lab_attempts` | CASCADE |
| `tutor_conversations` | `tutor_messages` | CASCADE |

---

## Index Listing

| Table | Index Name | Columns | Type |
|-------|-----------|---------|------|
| `users` | `users_email_idx` | `email` | UNIQUE |
| `accounts` | `accounts_provider_account_idx` | `provider`, `provider_account_id` | UNIQUE |
| `accounts` | `accounts_user_id_idx` | `user_id` | INDEX |
| `sessions` | `sessions_user_id_idx` | `user_id` | INDEX |
| `domains` | `domains_slug_idx` | `slug` | UNIQUE |
| `objectives` | `objectives_domain_id_idx` | `domain_id` | INDEX |
| `flashcards` | `flashcards_objective_id_idx` | `objective_id` | INDEX |
| `flashcard_progress` | `flashcard_progress_user_id_idx` | `user_id` | INDEX |
| `flashcard_progress` | `flashcard_progress_next_review_idx` | `next_review` | INDEX |
| `flashcard_progress` | `flashcard_progress_user_card_idx` | `user_id`, `flashcard_id` | UNIQUE |
| `practice_questions` | `practice_questions_objective_id_idx` | `objective_id` | INDEX |
| `practice_attempts` | `practice_attempts_user_id_idx` | `user_id` | INDEX |
| `practice_answers` | `practice_answers_attempt_id_idx` | `attempt_id` | INDEX |
| `labs` | `labs_slug_idx` | `slug` | UNIQUE |
| `labs` | `labs_objective_id_idx` | `objective_id` | INDEX |
| `lab_attempts` | `lab_attempts_user_id_idx` | `user_id` | INDEX |
| `study_progress` | `study_progress_user_id_idx` | `user_id` | INDEX |
| `study_progress` | `study_progress_domain_id_idx` | `domain_id` | INDEX |
| `study_progress` | `study_progress_objective_id_idx` | `objective_id` | INDEX |
| `tutor_conversations` | `tutor_conversations_user_id_idx` | `user_id` | INDEX |
| `tutor_messages` | `tutor_messages_conversation_id_idx` | `conversation_id` | INDEX |

---

## Migration Strategy

### Current Approach

The project uses **Drizzle Kit** for schema migrations:

```bash
# Generate migration SQL from schema changes
npx drizzle-kit generate

# Push schema directly to database (development)
npx drizzle-kit push

# View current database state
npx drizzle-kit studio
```

### Database Initialization

The `docker/postgres/init.sql` script runs on first container creation:

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
GRANT ALL PRIVILEGES ON DATABASE studylab TO studylab;
```

### Migration Guidelines

1. **Schema changes** are made in `apps/web/src/lib/db/schema.ts`
2. **Development:** Use `drizzle-kit push` for rapid iteration
3. **Production:** Use `drizzle-kit generate` to create versioned SQL migration files
4. **Destructive changes** (column drops, type changes) require a multi-step migration with data backfill
5. **Enum changes** in PostgreSQL require `ALTER TYPE` statements -- Drizzle Kit handles this automatically
6. **New tables** should follow the established patterns: UUID primary keys for user-facing entities, serial IDs for internal/junction tables
