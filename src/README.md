# src/

This is the application source root. Keep it light:

## Contains

- `main.tsx` – bootstraps React root.
- `App.tsx` – thin shell that renders the router.
- Top-level folders: `app/`, `features/`, `components/`, `lib/`, `styles/`, `assets/`.

## Does NOT contain

- Business logic or API calls (put inside `features/*/api`).
- Global singletons beyond what's in `lib/`.

## Conventions

- Use path aliases like `@/features/...`.
- Keep `App.tsx` and `main.tsx` minimal; wire providers in `app/providers.tsx`.
