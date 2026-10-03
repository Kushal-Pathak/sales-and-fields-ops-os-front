# Development

How to work on Pilot CRM. Read it once, follow it always.

For setup see [`README.md`](../README.md), for structure see [`docs/ARCHITECTURE.md`](./ARCHITECTURE.md), and for agent rules see [`AGENTS.md`](../AGENTS.md).

## Setup

Requires Node.js 24+ (see `.nvmrc`) and npm.

```bash
npm install
cp .env.example .env.local
npm run dev
```

## Commands

| Command                | What it does                                 |
| ---------------------- | -------------------------------------------- |
| `npm run dev`          | Dev server with hot reload                   |
| `npm run lint`         | Reports ESLint problems                      |
| `npm run lint:fix`     | Auto-fixes ESLint problems (review the diff) |
| `npm run format`       | Formats files with Prettier                  |
| `npm run format:check` | Checks formatting without changing files     |
| `npm run typecheck`    | Type-checks with `tsc -b`                    |
| `npm run test`         | Runs the Vitest suites once                  |
| `npm run build`        | Type-checks and builds for production        |
| `npm run preview`      | Serves the production build locally          |
| `npm run check`        | Runs `lint`, `format:check`, `test`, `build` |

While developing: `dev` → `lint:fix` + `format` → `typecheck` / `test`. Before pushing: always `check`.

With `VITE_API_BASE_URL` empty the app runs on local demo data. It is seeded on first load and persisted in `localStorage`; "Reset demo data" on the dev-only `/design-system` page reseeds it, and bumping `SEED_VERSION` in `src/data/local-store.ts` reseeds every browser.

## Branching and Commits

- Branch from the latest `main`: `git switch main && git pull && git switch -c feature/<short-name>`.
- Prefixes: `feature/`, `fix/`, `refactor/`, `chore/`, followed by a short kebab-case name.
- One branch per task. Never commit directly to `main`.
- Commit small and often; one logical change per commit. Keep formatting-only changes separate from logic changes.
- Message style: `feat: add status filter`, `fix: login redirect`, `chore: bump vite`.
- Sync with `main` regularly and resolve conflicts while they are small.

## Finishing a Task

1. Sync with `main` and resolve conflicts.
2. `npm run check` must pass. If it fails, fix, commit, run again. Only push once it passes.
3. Push and open a pull request into `main`. Get it reviewed before merging.

## Adding Common Things

- **A page** — create `src/pages/<name>/index.tsx` exporting `<Name>Page`, then register it in `src/app/router.tsx` with `lazy`, inside the `ModuleOutlet` route, with `handle: page('<module>', 'Title', 'Group')`.
- **A feature** — create `src/features/<name>/` with `components/`, `hooks/`, `types/`, `utils/` as needed and an `index.ts` exposing its public surface.
- **A provider** — create `src/app/providers/<name>-provider.tsx` (and `<name>-context.ts` if it exposes context), compose it in `src/app/providers/index.tsx`, and expose a `use<Name>` hook from `src/hooks/`.
- **A UI primitive** — `npx shadcn add <component>`. It lands in `src/components/ui/`. If the generated file imports `cn` from `'cn'`, change it to `@/lib/utils` for consistency.
- **An env variable** — add to `.env.example`, declare in `src/env.d.ts`, expose via `src/lib/env.ts` (`required` or `optional`).
- **Reading or changing data** — a hook inside the feature (`features/<name>/hooks/use-<thing>.ts`) built on `useQuery` / `useMutation` with `db.<collection>` and `queryKeys` from `@/data`. Pass the query function's `signal` into reads. For mutations, call `useWriteOperation('<owning-module>')` and use its supplied `db` for every collection step, or pass its `options` into a data-layer API command. Pass `write.signal` into optimistic queues and check it before writing detail-cache results. Invalidate all affected collections in `onSettled`, including after partial failure. Commands that cascade across hidden modules belong on the backend; the demo emulates them in `src/data/`. See the task mutation hooks and [query lifecycle](./ARCHITECTURE.md#query-and-mutation-lifecycle). Use `QueryContent` to keep cached data mounted during transient refresh failures. Load reference options before mounting a form that initializes its state from them.
- **An entity field** — add it to the type in `src/types/domain/`, to the seed under `src/data/seed/`, and bump `SEED_VERSION`.
- **A list + drawer screen** — copy the shape of `src/features/leads/`: a `use-<name>-filters.ts` hook for URL state, a `utils/<name>-view-model.ts` with pure join/filter/sort functions (tested), a table component with skeleton/empty/error states, and a drawer opened via `useDrawerParam`. The page in `src/pages/<name>/` only composes them.
- **A settings section** — a feature under `src/features/<name>-settings/`, a page under `src/pages/settings/<name>/` that renders `SettingsNav` in its `PageHeader`, a route under `settings/` in `router.tsx`, and an entry in `SettingsNav` and the `/settings` cards. Follow `pipeline-settings`.
- **A feature flag** — add an entry to `FLAGS` in `src/lib/flags.ts` (`release` with a `removeBy` date, or `ops` for a permanent kill switch) and read it with `useFlag('<key>')`. Choose the default that is safe when the backend says nothing. In demo mode `setFlagOverride('<key>', false)` from `src/data/access.ts` forces it for this browser. Delete a `release` flag, and the path it guarded, before its date; `npm run test` fails after it.
- **A module** — add its id to `MODULE_IDS` (`src/types/domain/access.ts`), its rules to `MODULES` (`src/features/auth/utils/modules.ts`), a `<module>.view` key to `PERMISSION_KEYS` and `PERMISSIONS` if roles should be able to close it, its state to the workspace seed (bump `SEED_VERSION`), then its routes and nav entry with that id.
- **Showing another module's records** — `const state = useModule('<id>')`; render the tab, panel or button only when `state.status === 'allowed'`, pass `enabled: state.status === 'allowed'` to its query and read rows through `moduleRows(state, query.data)`.
- **A permission** — add the key to `PERMISSION_KEYS`, a label to `PERMISSIONS` in `features/team`, a line to `PermissionNote`, and grant it in the role seed.
- **Drag and drop** — `@dnd-kit`; see `pipeline-board.tsx` (items between containers) and `stage-list.tsx` (sortable list). Keep the pointer activation distance so clicks still work, and write announcements.
- **A test** — colocate `thing.test.ts` next to `thing.ts`; run with `npm run test`.

Session integration tests mount `SessionProvider` outside `QueryProvider`, matching the application. For isolated hook tests, create a fresh `QueryClient` with retries disabled and clear it afterward. Use deferred promises to exercise overlapping writes, delayed authentication and failed refreshes; checking only the final happy-path row misses these races.

## Secrets

**Never put secrets, private keys, credentials or other sensitive values in `VITE_*` environment variables.** Vite bundles them into the client-side JavaScript, where anyone can read them.

- Use `VITE_*` only for values that are safe to be public.
- Never commit `.env` files that contain real values (`.env.local` is git-ignored).

## Code Rules

- Keep feature-specific code inside its feature; shared folders hold only genuinely reused code.
- Reuse existing design-system components before creating new ones.
- Style with Tailwind and the tokens in `src/app/styles/tokens.css`; no hardcoded colours.
- Use `@/` aliases across project areas.
- Avoid unnecessary dependencies and abstractions. Build what the task needs.
