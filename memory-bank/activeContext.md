# Active Context

## Current Work Focus

Refactor the React app to a feature-first architecture with:

- Centralized Amplify client and typed API layer
- Route-level code splitting and guard via Outlet
- Hooks consuming the API layer
- Scoped styles and improved UI/UX
- Cleaner providers stack and reduced duplication
- Hardened quiz attempt logic and security posture

This document tracks the detailed refactor task list, current status, and next steps.

## Recent Changes

- Introduced feature-first folders under src/features/quiz (api, hooks, routes, components, types).
- Central Amplify client added at src/lib/amplifyClient.ts (but Amplify.configure still duplicated in main.tsx).
- Vite path alias configured (@ -> src) in vite.config.ts.
- API layer created:
  - src/features/quiz/api/quizzes.ts (watchQuizzes, deleteQuiz, getQuiz, updateQuiz, generateQuiz, onQuizCreated)
  - src/features/quiz/api/progress.ts (CRUD + watch/onCreate/onUpdate for CreationProgress)
- Hooks added:
  - useQuizzes, useQuiz, useQuizCreation, useUpdateQuiz, useCreationProgress
- Routes migrated into features:
  - src/features/quiz/routes/Home.tsx
  - src/features/quiz/routes/CreateQuiz.tsx
  - src/features/quiz/routes/EditQuiz.tsx
- Components moved/refactored:
  - src/features/quiz/components/KnowledgeFileModal.tsx
  - src/features/quiz/components/QuizCreationProgress.tsx
- Lib helpers present:
  - src/lib/storage.ts, src/lib/logger.ts
- Legacy still present:
  - App still owns routes (src/App.tsx); central router exists at src/app/router.tsx but not wired yet
  - Providers are in main.tsx; src/app/providers.tsx exists but is not used
  - Duplicate Amplify.configure (in main.tsx and lib/amplifyClient.ts)
  - QuizAttempt remains under src/pages with global CSS and authMode: 'apiKey'
  - EditQuiz imports Grid2 from @mui/material (incorrect source)
  - Theme duplication (legacy src/theme.tsx vs intended src/styles/theme.ts)

## Next Steps (Detailed Refactor Task Checklist)

Phase 1 — Routing and Providers

- [ ] Create/layer central router (src/app/router.tsx)
  - [ ] Use React.lazy for code-split routes: Home, CreateQuiz, EditQuiz, QuizAttempt
  - [ ] Public routes: /login, /quiz/:quizId
  - [ ] Protected group via <ProtectedRoute> that renders <Outlet />
  - [ ] NotFound route instead of redirect loop
- [ ] Convert ProtectedRoute to Outlet pattern (no children prop, returns <Outlet /> when authed, else <Navigate to="/login" />)
- [ ] Update App.tsx to delegate to <AppRouter /> only (remove inline Routes definitions)
- [ ] Implement providers stack (src/app/providers.tsx)
  - [ ] Move Authenticator.Provider, MUI ThemeProvider, CssBaseline, BrowserRouter here
  - [ ] Main.tsx: wrap <App /> with <Providers>, remove wrappers
- [ ] Remove duplicate Amplify.configure from main.tsx (Amplify will be configured only in src/lib/amplifyClient.ts)

Phase 2 — Data Layer and Auth

- [ ] Ensure single Amplify client instance usage (no other generateClient calls; rely on src/lib/amplifyClient)
- [ ] Add features/quiz/api/attempts.ts
  - [ ] createQuizAttempt({ quizId, score, totalPossible, answers })
  - [ ] getQuizPublic(id) if keeping public read separate (optional)
- [ ] Refactor QuizAttempt to use API functions (no direct authMode unless required)
- [ ] Decide final auth strategy (guest IAM vs API key scope); remove hardcoded 'apiKey' in QuizAttempt if not required

Phase 3 — QuizAttempt Migration and Logic Hardening

- [ ] Move src/pages/QuizAttempt.tsx to src/features/quiz/routes/QuizAttempt.tsx
- [ ] Scope styles: convert src/pages/QuizAttempt.css to CSS module (QuizAttempt.module.css) or MUI sx/styled
- [ ] Import assets as modules (coin.png, correct.mp3) rather than absolute / paths
- [ ] Keyboard accessibility (1–4 to select answers; Enter to confirm; aria-pressed; role="button")
- [ ] Timer cleanup and determinism:
  - [ ] Single active setInterval/RAF; cancel on phase change/unmount
  - [ ] Initialize points at question start (not first tick)
  - [ ] Extract helpers:
        getPreviewTime(q, quiz), getAnswerTime(q, quiz), getMaxPoints(q, quiz)
  - [ ] useMemo for totalPossible
  - [ ] Remove unused \_previewTimer or display numeric timer

Phase 4 — UI/UX Polish

- [ ] Fix Grid2 imports in EditQuiz: import Grid2 from '@mui/material/Unstable_Grid2'
- [ ] Add MUI Skeletons for Home and Edit while loading
- [ ] Replace console-only errors with MUI Snackbar feedback (save, delete, clone)
- [ ] Friendly 404/permission state for missing/not-public quiz instead of redirect

Phase 5 — Theme and Global Styles

- [ ] Consolidate theme file to src/styles/theme.ts and export a single theme
- [ ] Update providers to consume src/styles/theme
- [ ] Remove legacy src/theme.tsx and dangling imports
- [ ] Remove or minimize global CSS (App.css, index.css) if redundant; ensure src/styles/globals.ts covers what’s needed

Phase 6 — Storage and Knowledge Files

- [ ] Use File directly with uploadData (no arrayBuffer) in KnowledgeFileModal
- [ ] Add pagination to list() and show basic metadata (name, size)
- [ ] Ensure modal consumes src/lib/storage helpers (listKnowledgeFiles, uploadKnowledgeFile)
- [ ] Backend guardrails: enforce knowledge/${userId}/ prefix (document in systemPatterns and data rules)

Phase 7 — Security and Authorization

- [ ] Review amplify/data/resource.ts auth rules:
  - [ ] Quiz: owner full; guest read (if public)
  - [ ] QuizAttempt: guest/create or authenticated/create as intended
- [ ] Remove/reduce API key usage; prefer default auth/IAM flow
- [ ] Home list filters (if needed) to current user, or rely on backend auth

Phase 8 — Error Handling

- [ ] Add top-level ErrorBoundary (react-error-boundary) with fallback UI
- [ ] Wrap routed pages and display meaningful messages

Phase 9 — Tooling, Types, and Tests

- [ ] Ensure TS strict settings:
  - [ ] tsconfig: "strict": true, "noUncheckedIndexedAccess": true, "exactOptionalPropertyTypes": true
- [ ] ESLint/Prettier already present; ensure scripts and pre-commit hooks run
- [ ] Add Vitest + React Testing Library:
  - [ ] Smoke tests for routes
  - [ ] Create→Edit flow test
  - [ ] Attempt scoring logic unit tests
- [ ] CI: GitHub Actions to install, build, lint, test
- [ ] README: Architecture map, scripts, auth model, testing instructions

## Status Snapshot

Completed

- [x] Feature-first structure created (features/quiz with api/hooks/routes/components)
- [x] Vite path alias (@) configured
- [x] Central Amplify client file (src/lib/amplifyClient)
- [x] Quizzes and progress API wrappers
- [x] Hooks for quizzes, quiz, creation, update
- [x] Home/Create/Edit pages refactored into features routes
- [x] KnowledgeFileModal and QuizCreationProgress co-located under features

In Progress / Not Started

- [ ] Central router + Outlet guard + providers stack
- [ ] Remove duplicate Amplify.configure in main.tsx
- [ ] QuizAttempt migration, CSS scoping, auth cleanup, and logic hardening
- [ ] Fix Grid2 import
- [ ] Theme consolidation to src/styles/theme.ts
- [ ] Skeletons + Snackbars
- [ ] Storage modal improvements using lib/storage and pagination
- [ ] ErrorBoundary
- [ ] TS strict, tests, CI, README updates
- [ ] Auth rules review and removal of 'apiKey' usage if not necessary

## Active Decisions and Considerations

- Prefer guest IAM or narrowly scoped API key for public read/attempts; avoid broad apiKey writes.
- Keep a single Amplify client instance; no direct generateClient calls outside src/lib/amplifyClient.
- Scope CSS (MUI sx or CSS Modules) to avoid global leaks.
- Route-level code splitting to keep initial bundle small.
- Document auth/data rules and storage guardrails in systemPatterns.md and amplify/data/resource.ts.

## Important Patterns and Preferences

- TypeScript-first, functional React with hooks and small API wrappers
- Path alias imports (@) throughout
- UI feedback for all async operations
- Tests around the critical create/edit/attempt flows

## Learnings and Project Insights

- Centralizing Amplify and data access simplifies testing and reduces bugs from multiple client instances.
- observeQuery patterns benefit from seeding rows for deterministic first reads.
- Separating route-level components from shared components makes refactors safer and clearer.
