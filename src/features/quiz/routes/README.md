# features/quiz/routes

Route-level components (pages) for the quiz domain.

## Contains

- `Home.tsx` – list user’s quizzes (with actions).
- `CreateQuiz.tsx` – form + submit + progress handoff.
- `EditQuiz.tsx` – edit form for quiz/questions/answers.
- `QuizAttempt.tsx` – public/private attempt flow, timers, scoring.

## Does NOT contain

- Direct `generateClient` calls; use hooks/api.
- Generic components (move to `components/`).

## Conventions

- Route components are lazy-loaded via `app/router.tsx`.
- Keep pages thin; push heavy logic into hooks/utilities when possible.
