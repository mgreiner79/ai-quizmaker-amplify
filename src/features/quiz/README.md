# features/quiz

All quiz business logic: listing, creating, editing, attempting, and progress.

## Contains

- `api/` – wrappers over Amplify client for quizzes, questions, attempts.
- `components/` – quiz-only UI (e.g., `KnowledgeFileModal`, loaders).
- `hooks/` – `useQuiz`, `useQuizzes`, etc.
- `routes/` – `Home`, `CreateQuiz`, `EditQuiz`, `QuizAttempt`.
- `types.ts` – `EditableQuiz`, `EditableQuestion`, `EditableAnswer`.

## Conventions

- UI reads data via hooks; hooks call `api/`.
- Keep timer/points logic colocated in `routes/QuizAttempt` or extracted into a small utility within this feature.
