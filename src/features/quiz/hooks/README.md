# features/quiz/hooks

Feature-specific hooks that encapsulate data fetching, subscriptions, and complex UI logic.

## Contains

- `useQuiz(id)` – fetch a quiz by id (and loading/error).
- `useQuizzes()` – observeQuery with sorting and filtering by owner.
- (Optional) `useCreationProgress(quizId)` – subscribe to creation events.

## Does NOT contain

- JSX. Hooks return data/state/actions.

## Conventions

- Call `api/*` modules; do not import Amplify client directly.
- Ensure cleanup of subscriptions/timers in `useEffect` return handlers.
- Strong types for return values.
