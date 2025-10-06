# features/quiz/hooks

Feature-specific **behavior** (state + side effects) lives here. Hooks hide
data fetching, subscriptions, timers, and workflow orchestration so your
route/components can stay focused on rendering.

---

## What hooks are for

- **Fetch + subscribe** to Quiz data (and keep it live)
- **Orchestrate workflows** (e.g., start quiz generation → watch progress → finish)
- **Encapsulate complex UI logic** (debounce, timers, derived state)
- **Expose a simple API** back to the UI: `data`, `status`, and `actions`

> If you need `useEffect`, subscriptions, timers, or you reuse the behavior in more than one component, it likely belongs in a hook.

---

## What does _not_ belong in hooks

- **JSX / rendering** → keep in components
- **Pure calculations** → move to `utils` (plain functions)
- **Cross-feature global state** → use Context (or a state library) at the app layer
- **One-off trivial UI state** (e.g., a single menu toggle) → keep local in the component

---

## Contains (examples)

- `useQuiz(id)` – fetch a quiz by id; exposes `{ quiz, loading, error, refetch }`
- `useQuizzes()` – `observeQuery` with newest-first sorting and owner filtering
- `useCreationProgress(quizId)` – snapshot current progress, subscribe to updates, derive `{ message, percent }`
- (optional) `useQuizCreation(quizId)` – start mutation, flip state early, subscribe to completion

---

## Design goals & return shape

Hooks should return:

- **Data:** `quiz`, `quizzes`, `progress`, etc.
- **Status:** `loading`, `error`, and optionally `status`/`percent`
- **Actions:** `start()`, `refetch()`, `update()`, etc. (wrap in `useCallback`)
- **Stable references:** avoid recreating functions/objects every render

Example signature:

```ts
type UseThing = () => {
  data: T | null;
  loading: boolean;
  error: unknown;
  start?: (input: X) => Promise<void>;
};
```
