# lib/ (singletons & utilities)

Framework adapters and app-wide singletons.

## Contains

- `amplifyClient.ts` – **single** Amplify config + `generateClient<Schema>()` export.
- `storage.ts` – thin wrappers around Amplify Storage (list/upload helpers).
- `logger.ts` – central console wrapper (optional).
- Small, cross-feature utilities (date/format/assert).

## Does NOT contain

- Feature-specific business logic (put in `features/*/api` or `hooks`).

## Conventions

- Keep modules pure and easily mockable in tests.
- Initialize Amplify once here; never call `Amplify.configure` elsewhere.
