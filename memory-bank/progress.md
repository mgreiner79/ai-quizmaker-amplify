# Progress

## What Works

- React front-end renders all pages and components (Home, Login, CreateQuiz, EditQuiz, QuizAttempt).
- AWS Amplify backend integration (Cognito Auth, AppSync GraphQL API, S3 storage).
- Lambda quizGenerator function processes content and generates question/answer pairs.
- File upload and parsing for PDF and text documents.
- Gamified quiz-taking interface with scoring, feedback, and animations.

## What's Left to Build

- Implement robust error handling and input validation across UI and backend.
- Develop unit and integration tests for critical components.
- Set up and test CI/CD pipeline in Amplify Console.
- Add GraphQL subscriptions for real-time quiz updates.
- Polish UI/loading states and ensure fully responsive design.
- Integrate basic analytics and reporting features.

## Current Status

MVP end-to-end flow is functional: users can authenticate, create quizzes via AI, and attempt quizzes with scoring.

Refactor to feature-first architecture is in progress:

- Feature folders created for quiz domain (api, hooks, routes, components, types).
- Central Amplify client added (src/lib/amplifyClient.ts).
- API wrappers and hooks created for quizzes and progress.
- Home/Create/Edit pages migrated to src/features/quiz/routes.
- Central router/providers scaffolding exists but not wired (src/app/router.tsx, src/app/providers.tsx).
- QuizAttempt remains in src/pages and still uses global CSS + apiKey calls.

## Known Issues

- Occasional PDF parsing errors for complex documents.
- Sporadic CORS or permission errors in GraphQL/API calls.
- UI loading flicker on slower network connections.
- Minor theming inconsistencies in dark/light modes.
- Duplicate Amplify.configure in src/main.tsx and src/lib/amplifyClient.ts.
- EditQuiz uses Grid2 from @mui/material instead of @mui/material/Unstable_Grid2.
- QuizAttempt uses authMode: "apiKey" for read and attempt creation.
- src/app/router.tsx currently has a TypeScript error (Expression expected at line 2) and needs implementation/fix.
- Global CSS in QuizAttempt.css can leak; should be scoped or migrated to MUI sx.

## Evolution of Project Decisions

- Adopted serverless AWS Amplify architecture for rapid provisioning.
- Chose React with Vite and TypeScript for fast development and build performance.
- Integrated OpenAI within Lambda for AI-driven quiz generation.
- Established Memory Bank approach for project documentation and continuity.

## Refactor Status and Tasks (Summary)

Detailed, phase-based checklist lives in memory-bank/activeContext.md. Summary:

Completed

- [x] Feature-first structure for quiz domain (features/quiz/{api,hooks,routes,components,types})
- [x] Vite path alias (@ -> src)
- [x] Central Amplify client (src/lib/amplifyClient.ts)
- [x] API wrappers: quizzes, progress
- [x] Hooks: useQuizzes, useQuiz, useQuizCreation, useUpdateQuiz, useCreationProgress
- [x] Routes migrated: Home, CreateQuiz, EditQuiz
- [x] Components moved: KnowledgeFileModal, QuizCreationProgress

Pending (high priority)

- [ ] Central Router + Outlet Guard + Providers
  - [ ] Implement src/app/router.tsx with lazy-loaded routes and NotFound
  - [ ] Convert ProtectedRoute to Outlet pattern
  - [ ] Implement src/app/providers.tsx (Authenticator.Provider, ThemeProvider, CssBaseline, BrowserRouter)
  - [ ] Update App.tsx to delegate to AppRouter; simplify main.tsx to use Providers
  - [ ] Remove duplicate Amplify.configure from main.tsx
- [ ] QuizAttempt migration and hardening
  - [ ] Move to features/quiz/routes/QuizAttempt.tsx
  - [ ] Scope styles (CSS module or MUI sx) and import assets as modules
  - [ ] Replace authMode: "apiKey" with chosen auth mode via API layer
  - [ ] Timer cleanup, default helpers, keyboard a11y, useMemo totals
- [ ] UI/UX polish
  - [ ] Fix Grid2 import in EditQuiz (use @mui/material/Unstable_Grid2)
  - [ ] Add Skeletons and Snackbars (save/delete/clone feedback)
  - [ ] Friendly 404/permission states
- [ ] Theme and globals
  - [ ] Consolidate theme to src/styles/theme.ts; update providers; remove legacy src/theme.tsx
  - [ ] Reduce global CSS where redundant
- [ ] Storage modal improvements
  - [ ] Use File directly in uploadData; add pagination via lib/storage helpers
- [ ] Security and Authorization
  - [ ] Review amplify/data/resource.ts auth (guest read for Quiz; guest/authenticated create for QuizAttempt)
  - [ ] Remove/restrict apiKey usage as needed
- [ ] Error handling
  - [ ] Add top-level ErrorBoundary (react-error-boundary)
- [ ] Tooling, Types, and Tests
  - [ ] Enable TS strict flags; ensure ESLint/Prettier hooks
  - [ ] Add Vitest + RTL tests (routes, create→edit flow, scoring logic)
  - [ ] CI workflow and README updates

See memory-bank/activeContext.md for the complete checklist with phase breakdown and rationale.
