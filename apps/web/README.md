# DevNet StudyLab -- Web Application

The Next.js frontend and API backend for DevNet StudyLab.

## Stack

- **Next.js 16** with App Router
- **React 19** with client components for interactive features
- **TailwindCSS v4** with dark theme (zinc-950 backgrounds, emerald-500 accents)
- **shadcn/ui** component library (Radix primitives)
- **Drizzle ORM** with PostgreSQL 16
- **Auth.js v5** (NextAuth 5 beta) for authentication

## Directory Structure

```
src/
  app/
    api/              API route handlers
      chat/           AI Tutor streaming endpoint
      dashboard/      Dashboard stats aggregation
      exams/          Practice exam CRUD + grading
      flashcards/     Flashcard listing + SM-2 progress
      labs/           Lab listing + execution
      study/          Study guide + objective progress
      auth/           Auth.js NextAuth handlers
    dashboard/        Dashboard pages (sidebar layout)
      flashcards/     Spaced repetition flashcard system
      labs/           Hands-on lab catalog + workspace
      practice/       Practice exams + domain quizzes
      settings/       User settings and preferences
      study/          Study hub with domain objectives
      tutor/          AI Tutor chat interface
    login/            Authentication login page
  components/
    dashboard/        Dashboard-specific components (sidebar, stats, domain cards)
    labs/             Lab workspace components (editor, output, grading)
    ui/               shadcn/ui primitives (button, card, dialog, etc.)
  hooks/              Custom React hooks (useChat, useFlashcards)
  lib/
    auth.ts           Auth.js configuration
    auth-helpers.ts   Server-side session helpers
    data/             Data access layer (DB-first, file fallback)
    db/               Drizzle ORM setup and schema
    utils.ts          Shared utilities
  __tests__/          Unit and E2E tests
```

## Scripts

```bash
npm run dev           # Start development server (port 3000)
npm run build         # Production build
npm run start         # Start production server
npm run lint          # Run ESLint

npm test              # Run unit tests (Vitest)
npm run test:e2e      # Run E2E tests (Playwright)
npm run test:content  # Validate content JSON files
npm run test:all      # Run all unit + content tests

npm run db:generate   # Generate Drizzle migration files
npm run db:migrate    # Apply migrations to PostgreSQL
npm run db:seed       # Seed content data + dev user
npm run db:studio     # Open Drizzle Studio (DB browser)
```

## Data Access Layer

The app uses a DAL pattern in `lib/data/` that queries PostgreSQL first and falls back to reading JSON files from `content/` when the database is unavailable. This ensures the app works both with and without Docker.

```
Request → API Route → DAL function → DB query (try) → File read (fallback) → Response
```

All progress writes (flashcards, exams, labs, study objectives) are fire-and-forget: the API responds immediately while the DB write runs in the background. If the DB is unavailable, the write silently fails and localStorage serves as the fallback for flashcard state.

## Environment Variables

See [docs/ENVIRONMENT_VARIABLES.md](../../docs/ENVIRONMENT_VARIABLES.md) for the full reference.

Quick start: copy `.env.example` to `.env.local` and fill in your values.

## Testing

E2E tests run with `SKIP_AUTH=true` so they bypass authentication. The Playwright config starts its own dev server (`reuseExistingServer: false`) to ensure the env var is set.

```bash
# Run all 52+ E2E tests
npx playwright test

# Run with UI
npx playwright test --ui

# Run a specific test file
npx playwright test dashboard.spec.ts
```
