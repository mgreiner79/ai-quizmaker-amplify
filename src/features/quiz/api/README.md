# features/quiz/api

Typed functions that talk to Amplify/Data/Storage for the quiz feature.

## Contains

- `quizzes.ts` – `getQuiz(id)`, `watchQuizzes()`, `create`, `update`, `delete`.
- `attempts.ts` – `createQuizAttempt(...)`, `listAttemptsForQuiz(...)`.
- (Optional) `progress.ts` – subscriptions for creation progress events.

## Does NOT contain

- React components or hooks.
- UI state. Keep pure, testable functions.

## Conventions

- Import the singleton Amplify client from `@/lib/amplifyClient`.
- Enforce auth modes here (avoid sprinkling `authMode` in UI).
- Narrow return shapes to what UI needs.
