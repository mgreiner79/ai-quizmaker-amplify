# app/ (Composition Root)

Owns app-wide wiring: providers, routing, error/suspense boundaries.

## Contains

- `providers.tsx` – wraps app with Amplify `Authenticator.Provider`, MUI `ThemeProvider`, `CssBaseline`, etc.
- `router.tsx` – defines routes (lazy loaded), layout shells, `<ProtectedRoute />`, `<Outlet />`.
- Optional: `ErrorBoundary.tsx`, `AppLayout.tsx`.

## Does NOT contain

- Feature business logic or API calls.
- Reusable UI components (put in `components/` or `features/*/components`).

## Conventions

- Prefer route-based code splitting with `React.lazy`.
- Keep this folder framework-focused and thin.
