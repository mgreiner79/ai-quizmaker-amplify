# components/ (shared UI)

Truly cross-feature, reusable UI components.

## Contains

- `ProtectedRoute.tsx` – auth guard using `Outlet`.
- Any generic dialog/button/layout that multiple features use.

## Does NOT contain

- Business/domain logic.
- Amplify calls (those belong in `features/*/api`).

## Conventions

- Keep the components presentational; accept props to remain generic.
- Prefer MUI `sx` and theme tokens.
