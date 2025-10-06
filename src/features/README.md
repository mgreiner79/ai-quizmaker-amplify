# features/

Vertical slices by business domain. Each subfolder is a mini-app that owns its UI, data access, state, and tests.

## Typical structure of a feature

feature-name/
├─ api/ # network/data calls for this feature only
├─ components/ # UI parts reused across routes of this feature
├─ hooks/ # feature-specific hooks (state, side effects)
├─ routes/ # route-level components/pages
├─ types.ts # local types for this feature
├─ tests/ # unit tests for this feature
└─ mocks/ # test doubles for api/hooks

## Conventions

- Keep imports within the feature (high cohesion).
- Promote code to `components/` or `lib/` only when truly cross-feature.
- No direct Amplify calls from route/components: go through `api/`.
