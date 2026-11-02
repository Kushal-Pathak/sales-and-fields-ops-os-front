# AGENTS.md

Instructions for coding agents working in the Sales and Field Ops OS frontend repository. The product and brand name is **Sales and Field Ops OS**; use it consistently in UI text, titles and docs. Work like a senior engineer and system architect: understand the system first, change it deliberately, and leave it more consistent than you found it.

Sources of truth — read before non-trivial work:

- [`README.md`](README.md) — setup, scripts, structure
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — folder responsibilities and boundaries
- [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md) — workflow, commands, code rules
- [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md) — tokens, typography, and how every UI element looks and behaves

If this file conflicts with those docs, the docs win; flag the conflict.

## Stack

React 19, Vite, TypeScript (strict), Tailwind CSS v4, shadcn/ui (Base UI, lucide icons), React Router (data router), ESLint, Prettier. Node 24+, npm.

## Before You Change Code

- Understand the relevant architecture and read related code first — similar features, the shared components/hooks/utilities it could use, and the callers it affects.
- Find the existing pattern and follow it. When requirements are ambiguous, choose the option most consistent with the current architecture; do not invent a new pattern.
- Keep scope to the requested task. No unrelated refactors, renames, or drive-by reformatting.

## Architecture Rules

Feature-first. Respect folder boundaries in `src/`:

| Folder              | Holds                                                                                     |
| ------------------- | ----------------------------------------------------------------------------------------- |
| `app/`              | Composition root: `App.tsx`, `router.tsx`, `providers/`, `styles/`                        |
| `pages/<name>/`     | Route components; thin, compose features, no business logic                               |
| `features/<name>/`  | Business functionality (`components/ hooks/ types/ utils/ index.ts`)                      |
| `components/ui`     | Design-system primitives (shadcn/ui, generated)                                           |
| `components/common` | Reusable app components (error boundary, theme toggle, …)                                 |
| `components/layout` | Layout / app-shell components                                                             |
| `hooks/`, `types/`  | Hooks/types shared across multiple features; `types/domain/` = entities                   |
| `data/`             | Data access: `db.<collection>` services, local demo store + seed, query keys              |
| `lib/`              | Infrastructure helpers: `env.ts`, `api.ts`, `format.ts`, `dates.ts`, `csv.ts`, `utils.ts` |

- Feature-specific code stays inside its feature. Promote to a shared folder only when it is genuinely reused.
- Features must not reach into another feature's internals; import from its `index.ts` or move shared pieces to a shared folder.
- Imports: `@/` across project areas, relative imports within the same module.
- Never bypass a boundary because it is faster.
- **Established conventions — follow them, do not introduce parallel ones:**
  - Routing: register pages in `src/app/router.tsx` with `lazy` and a `handle` built with `page(module, title, group?)` (`src/types/route-handle.ts`; `handle(title)` only for pages outside every module), as children of the `ModuleOutlet` layout route; `AppShell` is the shell, `RootErrorBoundary` catches route errors, `*` renders `NotFoundPage`. Sidebar entries live in `src/app/navigation.ts` with the same path and `module` as their route (`src/app/router.test.ts` checks both, and that every page declares a module).
  - Pages: render `PageHeader` then `PageBody` from `@/components/layout/page-header`; `PageBody` is the scroll container. Full-height screens (inbox, builders, wizards) may skip both and manage their own layout inside `<main>`.
  - Detail panels: `DrawerPanel` (+ `DrawerHeader/Body/Footer`) from `@/components/layout/drawer-panel`, opened via `useDrawerParam('<key>')` from `@/hooks/use-drawer-param` so the open item is in the URL. Never keep drawer state in component state.
  - Providers: one file per provider in `src/app/providers/` (plus a `*-context.ts` if it exposes context), composed in `src/app/providers/index.tsx`. Expose the consuming hook from `src/hooks/`.
  - Data access: feature hooks in `features/<name>/hooks/` wrap TanStack Query (`useQuery` / `useMutation`) around `db.<collection>` from `@/data`, keyed with `queryKeys`. Pass query signals into reads. Mutation hooks use `useWriteOperation('<owning-module>')` and its supplied `db` for every collection step (shared contact writes use only the session scope), or its supplied `options` for data-layer API commands. Check `write.signal` before caching detail results, then invalidate affected keys in `onSettled` even on failure. Cross-module cascades belong to backend commands, with demo equivalents in `src/data/`; never require client reads of hidden modules. Components never call `db`; nothing outside `src/data/` touches `localStorage` or `@/lib/api`. Entity types come from `@/types/domain`; derived facts (overdue, quote totals) are computed, never stored.
  - Reference data: `useWorkspace` / `useUsers` / `useStages` / `usePipelines` / `useCurrentUser` from `@/features/workspace`; contacts from `@/features/contacts`. `useCurrentUser` returns the session's user (`SessionProvider` in `app/providers`); it falls back to the first active member only when no provider is mounted, which is how page tests run.
  - Session: `useAuth()` from `@/hooks/use-auth` gives status, user, `signIn` and `signOut`. `src/data/session.ts` holds the adapters (demo: pick a seeded member; API: `POST /auth/login` → `{ token, user }`, `GET /auth/me`, `POST /auth/logout`, bearer token via `setAuthToken` in `lib/api.ts`, a 401 from the current credential context signs out). `SessionProvider` wraps `QueryProvider`; identity transitions replace the query client and abort old write scopes. `RequireSession` guards every route except `/sign-in`; a saved session that cannot be checked (network or 5xx, not a 401/403) is status `error` with `retry`, not signed out. Tokens are never read from `VITE_*`. Tests sign in with `SignedInAs` / `stubSession` from `src/test/session.tsx`, and put a resolved access context in the cache with `seedAccess` / `fullAccess` from `src/test/access.ts` when a hook must see it on first render.
  - List screens: everything that narrows a list (view tabs, search, filters, sort) lives in the query string, read and written by a feature hook (`features/<name>/hooks/use-<name>-filters.ts`) whose parse/serialize functions are pure and tested. Joining, filtering and sorting are pure functions over a joined row type (`features/leads/utils/lead-view-model.ts` is the model); components only render. Follow `features/leads/` for a new list + drawer.
  - Category colours (stage, priority, task/quote status, …) are `StatusColor` values mapped to classes only in `src/components/common/status-color.ts`; render them with `StatusBadge` / `StatusDot` / `InitialsAvatar` from `@/components/common`. Empty and error blocks use `EmptyState` / `ErrorState`. Wrap query content in `QueryContent` so transient refresh errors preserve cached content; 401/403 failures block it. Joined hooks prioritize access errors with `getQueryError`. Disabled optional queries are excluded from joins, loading checks and aggregate refetches.
  - Drag and drop: `@dnd-kit` only. `PointerSensor` with an activation distance so clicks still work, a `KeyboardSensor` (custom `coordinateGetter` when targets are columns), `DragOverlay` for the lifted item, and `accessibility.announcements` in plain words. `features/leads/components/pipeline-board.tsx` (cards between droppable columns) and `features/pipeline-settings/components/stage-list.tsx` (sortable rows) are the two shapes to copy.
  - Optimistic updates live in the feature's mutation hook only, never in components. Use `beginOptimisticListUpdate(client, key, update, write.signal)` in `onMutate`, its `rollback` in `onError`, and await invalidation before `release` in `onSettled`'s `finally`. This queues changes per list across hook instances, stops revoked queued writes and avoids restoring stale whole-list snapshots. Use them where a drop must settle at once; plain invalidation elsewhere.
  - Feature dependencies point one way: `leads → (tasks, quotes, appointments, inbox) → (workspace, contacts)`, `calendar → (appointments, tasks)`, `inbox → (tasks, appointments)`, and `(leads, quotes, appointments, lead-import) → (automations, custom-fields) → workspace`. `automations` and `custom-fields` import no other feature. A feature that needs another feature's rows without depending on it reads the shared cache through `db` with the same `queryKeys` (see `features/tasks/hooks/use-tasks.ts`; `features/quotes` and `features/appointments` keep their own small `useLeadOptions` for the same reason). Any feature may import `features/auth` (`useCan`, `useModule`, `useFlag`), which itself imports only `workspace`; `module-settings → (auth, workspace)`. Never create an import cycle between feature `index.ts` files.
  - Composite screens (the calendar) own their grid and pure model (`features/calendar`, `buildEvents` over appointments and tasks) but not the detail panels: the page composes `AppointmentDrawer` and `TaskDrawer` from the owning features and routes each event click to the right `useDrawerParam`.
  - Date inputs and local-day arithmetic come from `@/lib/dates` (`toDateInput` / `toTimeInput` / `fromDateTimeInputs`, `startOfWeek`, `dateKey`, `addMinutes`, `formatTimeRange`, …). Do not re-implement them in a form. Time-sensitive memoized models take an explicit `now` from `useNow()` at the screen or drawer root.
  - Builders (the quote builder) are full-page routes (`/quotes/new`, `/quotes/:id/edit`) that skip `PageHeader` / `PageBody`: their own header row, a scrolling form on the left and a summary rail on the right. Form state is a pure draft model in `utils/` (`quote-draft.ts`: defaults, validation, totals, conversion to `CreateInput`), tested without React. Status changes go through a pure workflow table (`quote-workflow.ts`: `availableActions`, `applyAction`) that both the drawer and the mutation hook use.
  - Custom fields (`features/custom-fields`) are the only way a record's shape varies per workspace: definitions live in the `fields` collection, values in `Lead.custom`, `Contact.custom` and `Appointment.outcome`. Forms render them with `CustomFieldInputs` + `validateValues` + `cleanValues`; detail views with `CustomFieldValues`. Never add a per-workspace column to a domain type instead.
  - Automations (`features/automations`) are data (`Automation` rules) executed by `runAutomations(event, actorId, db)` from the engine, passing the write operation's scoped database, which touches `db` only and never re-enters itself. Every mutation that creates a lead, changes a lead's stage, changes a quote's status or completes an appointment calls it after its own write and then invalidates `AUTOMATION_EFFECT_KEYS`. Add a new trigger by extending `AutomationEvent`, `matches` and the one mutation that raises it; add an action by extending `AutomationAction`, `execute`, `describeAction` and the drawer's `ActionFields`.
  - The command palette (`features/command-palette`, mounted once by `AppShell`) is the top of the feature graph and may render other features' dialogs; nothing imports it. Its open state and the ⌘K shortcut live in `app/providers/command-palette-provider.tsx`, read with `useCommandPalette()` from `@/hooks`. Search, sections and the natural-language intents are pure functions in `utils/` over the cached collections (`searchRecords`, `parseIntent`, `answerIntent`); to add an intent, extend the `Intent` union, `parseIntent`, `answerIntent` (or the panel for actions), `SUGGESTED_QUERIES` and the tests. Never call a model API from the browser: free-form questions go to `askAssistant` in `src/data/assistant.ts` (`POST /assistant/ask` on the backend), and the palette says so when no API is configured. Per-browser conveniences (recent queries, the collapsed sidebar) go through `src/data/preferences.ts`, never `localStorage` directly.
  - Split screens (the inbox at `/inbox`) are full-page routes with their own panels: the selected item is a query param (`?c=<conversationId>` via `useDrawerParam('c')`), list filters use the usual pure parse/serialize, below `lg` the list and the detail alternate on that param, and the context rail appears from `xl`. Message templates are workspace data (`Workspace.quickReplies`, filled by `fillTemplate`), not code.
  - Wizards (the lead import at `/leads/import`) are full-page routes built on `WizardFrame` + `StepBar` from `@/components/layout/step-bar` (step strip, centred scrolling content, Back · "Step n of N" · Continue). Their state is a `useReducer` in the feature (`use-import-wizard.ts`), the one deliberate exception to "list state in the URL": the payload is the loaded file and a refresh starts over. Each stage of the pipeline is a pure, tested function in `utils/` (`parseDelimited` in `@/lib/csv`, `autoMap`, `validateRows`, `buildImportPlan`); the runner hook only executes the plan against `db`.
  - Chrome-less views (the printable quote at `/quotes/:id/print`) are registered as sibling root routes in `router.tsx`, outside the `AppShell` route, with their own `ErrorBoundary`. They wrap their content in the `.light` class (see `tokens.css`) so paper output stays light in dark mode, and hide their toolbar with `print:hidden`.
  - Filter rows are built from `SearchField` / `FilterChip` / `SortMenu` in `@/components/common/list-toolbar`; table/board switches use `ViewSwitch` from `@/components/layout/view-switch` with a per-page `views` list.
  - Sections with sub-pages (Settings, Team) render a `SectionNav` (`@/components/layout/section-nav`) as the `PageHeader` children, wrapped per section (`SettingsNav`, `pages/team/team-nav.tsx`); each sub-page is its own feature and route.
  - Access has three layers; keep them apart. A **feature flag** says whether code is released, a **module** says whether a workspace uses a part of the product, a **permission** says what a role may do. All three reach the client already resolved, in one `AccessContext` (`src/data/access.ts`: demo adapter, or `GET /auth/context`), loaded once per session by `RequireAccess` inside `RequireSession`. Nothing inside the shell renders before it is known; a failed load shows Retry and never falls back to "allowed". None of this is security: the backend enforces the same rules on every request.
  - Modules: ids are `ModuleId` (`src/types/domain/access.ts`); their rules (required permission, release flag, dependencies, owned collections) are the `MODULES` table in `features/auth/utils/modules.ts`, and `resolveModule` is the only place that decides. Which modules a workspace has, and which an admin may switch, is data (`Workspace.modules`, edited at `/settings/modules`). Read a module with `useModule(id)` / `useModules()` from `@/features/auth`: `allowed`, `denied` with a reason, or `loading`. A module that is not `allowed` must be absent everywhere: nav and palette (through `visibleNav`), its routes (`ModuleOutlet`), and any tab, panel, button or dialog another feature shows for it.
  - Query gating: a hook that reads another module's collection passes `enabled: state.status === 'allowed'` and takes its rows through `moduleRows(state, query.data)`, which is `[]` for a closed module whatever is cached and `undefined` while access loads. Leave closed modules out of `isPending`, `getQueryError` and aggregate refetches (`useDashboard`, `useCalendar`, `usePaletteData` are the model). Losing a module evicts its cached collections (`collections` in `MODULES`).
  - Permissions are data on `Role` (`PERMISSION_KEYS` in `src/types/domain/user.ts`; `PERMISSIONS` in `features/team` adds labels). `<module>.view` opens a module; other keys are actions inside one and never imply each other. Gate UI with `useCan(permission)` from `@/features/auth` (disable the button, and show `PermissionNote` where a whole section is read-only). Mutations that change a role, a member's role or a module invalidate `queryKeys.access.all`. `leads.view_all` is not applied client-side because it changes which rows a user may read, which is the backend's job.
  - Feature flags: declare every flag in `src/lib/flags.ts` (description, owner, default, and `removeBy` for `release` flags; a test fails once that date passes) and read it with `useFlag(key)` from `@/features/auth`. A flag for a whole module goes in that module's `releaseFlag`; a flag for one capability is read where the capability is rendered. Never read a flag from `VITE_*`, and never use a flag where a permission or a module setting is meant.
  - Money and dates: format with `formatMoney` / `formatDate` / `formatRelative` from `@/lib/format` using the workspace's `currency` and `locale`.
  - Theme: `useTheme()` from `@/hooks/use-theme`; never toggle the `.dark` class by hand.
  - TanStack Query is the only state library. Global client state is limited to the providers in `src/app/providers/` (theme, session, command palette); if a task needs more, put it where `docs/ARCHITECTURE.md` ("Adding Things Later") says, keep it minimal, and document it.
  - Tests: Vitest + Testing Library, colocated as `*.test.ts(x)`. Pure logic (data layer, formatting, derived state) gets tests; `npm run check` runs them.

## Engineering Standards

- **Reuse first.** Search for existing components, hooks, utilities, services, and types before creating new ones. Extend existing abstractions rather than duplicating them.
- **Root causes, not symptoms.** No one-off patches, suppressed errors, or workarounds that hide the real problem.
- **Type-safe.** No `any`, unchecked casts, or `@ts-ignore` / `eslint-disable` to silence real issues. Model data with precise types.
- **Simple over clever.** No speculative abstractions, premature generalization, or new dependencies without clear need. Build what the task needs, in a shape that can grow.
- **Backward compatible** unless a breaking change is explicitly requested; call out any breaking change.
- **Complete behavior.** Where relevant, handle loading, empty, and error states; edge cases; accessibility (semantic HTML, labels, keyboard, focus); and security (validate untrusted input, no unsafe HTML).
- **Match the codebase.** Follow existing naming, file layout, and idioms. Let Prettier and ESLint own formatting.

## UI and Design System

- Follow [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md): it specifies the look and behaviour of buttons, inputs, pills, tables, drawers, navigation, overlays and states, with the primitive and utility recipe for each. Check new UI on the dev-only `/design-system` page in both themes.
- Build UI from `@/components/ui` primitives; add new ones via `npx shadcn add <component>` rather than hand-rolling equivalents. Treat `components/ui` as generated code; keep edits minimal.
- Style with Tailwind and the tokens in `src/app/styles/tokens.css` (the only place to change colours, radius, font, shadows). No hardcoded colours, px radii, shadows or font sizes. `index.css` is wiring (token mapping and the 13px type scale); rarely edit it.
- Status colours are token pairs (`success`/`success-soft`, `warning`, `info`, `highlight`, `destructive`/`danger-soft`) exposed as `Badge` variants. Category colour maps (stage, source, priority, …) belong to the owning feature and map onto those tokens.
- Compose classes with `cn` from `@/lib/utils`. If a generated component imports `cn` from `'cn'`, change it to `@/lib/utils`.

## Environment and Secrets

- **Never put secrets, keys, or credentials in `VITE_*` variables** — they are bundled into public client code.
- Read env values only through `env` from `src/lib/env.ts` (`required()` throws at startup if missing, `optional()` falls back); declare types in `src/env.d.ts` and add new vars to `.env.example`.
- Never commit `.env` files with real values.

## Validation

After changes, run:

```bash
npm run check   # lint + format:check + test + build (includes typecheck)
```

Use `npm run lint:fix` / `npm run format` while iterating. Resolve every error your change introduces; do not disable rules to pass. Report anything you could not fix.

## Documentation

When a change alters architecture, folder responsibilities, conventions, commands, or workflow, update `README.md`, `docs/ARCHITECTURE.md`, `docs/DEVELOPMENT.md`, or this file in the same change.
