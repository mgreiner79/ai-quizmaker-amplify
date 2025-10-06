# styles/

Theme and minimal global CSS.

## Contains

- `theme.ts` – MUI theme (palette, typography, shape, components overrides).
- `globals.css` – resets, variables, print rules (keep minimal).

## Does NOT contain

- Feature-specific styles (use CSS Modules or MUI `sx` inside features).

## Conventions

- Prefer theme tokens in components.
- Avoid broad global selectors; scope carefully.
