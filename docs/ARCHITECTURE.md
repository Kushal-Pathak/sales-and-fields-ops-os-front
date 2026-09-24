# Architecture

Pilot CRM uses a feature-first frontend architecture. The rule of thumb: **`app/` wires, `pages/` route, `features/` own logic, `components/` are dumb and shared, `lib/` is infrastructure.**

## Structure

```text
src/
├── app/
│   ├── App.tsx             # composition root: <Providers><RouterProvider/></Providers>
│   ├── router.tsx          # route table (pages are lazy-loaded here, each with a `handle`)
│   ├── navigation.ts       # sidebar groups and items — must match router paths
│   ├── providers/
│   │   ├── index.tsx       # <Providers>: composes every app-wide provider
│   │   ├── query-provider.tsx  # TanStack Query client
│   │   ├── theme-provider.tsx  # dark/light/system, toggles `.dark` on <html>
│   │   └── theme-context.ts
│   └── styles/
│       ├── index.css       # Tailwind imports, @theme mapping, base layer
│       └── tokens.css      # design tokens (colours, radius, font) — the only file to edit for look & feel
├── assets/
├── components/
│   ├── ui/                 # shadcn/ui primitives, added via the CLI
│   ├── common/             # RootErrorBoundary, ThemeToggle, StatusBadge/StatusDot, InitialsAvatar, EmptyState
│   └── layout/             # app shell: AppShell, Sidebar, TopBar, PageHeader/PageBody, DrawerPanel, SectionNav, ViewSwitch, StepBar/WizardFrame
├── data/
│   ├── index.ts            # `db`: one Collection per entity (local demo store or REST, by env)
│   ├── collection.ts       # Collection<T> + local / http implementations
│   ├── local-store.ts      # localStorage persistence, seed versioning, reset
│   ├── query-keys.ts       # TanStack Query key factory
│   └── seed/               # generic demo data, dates relative to now
├── features/
│   ├── dashboard/          # stat tiles, pipeline strip, attention panels (pure buildDashboard model)
│   ├── workspace/          # reference data hooks: useWorkspace, useUsers, useStages, useCurrentUser
│   ├── contacts/           # useContacts, useCreateContact
│   ├── leads/              # leads list + pipeline board (shared URL filters), lead drawer, form, mutations
│   ├── tasks/              # tasks table + status board, task drawer, form, LeadTaskList for the lead drawer
│   ├── quotes/             # quotes table + drawer (approval workflow), full-page builder, print view, LeadQuoteList
│   ├── appointments/       # appointments table + drawer, schedule/edit dialog, complete-with-notes, LeadAppointmentList
│   ├── calendar/           # week time-grid + month grid over appointments and due tasks (pure buildEvents model)
│   ├── lead-import/        # CSV/TSV import wizard: parse → map → validate → plan → run
│   ├── team/               # members table + drawer, invite/edit, deactivate-with-reassign, roles + permissions
│   └── pipeline-settings/  # stage list (sortable), stage drawer, delete-with-move, pipeline rename
├── hooks/
├── lib/
│   ├── env.ts              # validated access to VITE_* variables
│   ├── api.ts              # thin fetch client with ApiError (used only by data/)
│   ├── format.ts           # formatMoney / formatDate / formatRelative / initials
│   ├── dates.ts            # local-day arithmetic and <input type=date|time> conversions
│   ├── csv.ts              # delimited-text parsing and writing (CSV / TSV)
│   └── utils.ts            # cn()
├── pages/
├── test/                   # Vitest setup
└── types/
    ├── domain/             # entity types shared by every feature
    └── route-handle.ts
```

## Folder Responsibilities

### `app/`

Application-level setup only: the composition root, route table, providers, theme, global styles. No business logic.

- **Routing** — `router.tsx` uses React Router's data router. Each page is registered with `lazy` so it is code-split, and declares a `handle: { title, group? }` (`src/types/route-handle.ts`) that drives the breadcrumb and document title via `useRouteHandle()`. `AppShell` is the shared shell; `RootErrorBoundary` catches render and loader errors for every route. `/` redirects to `/dashboard`; a `*` route renders `NotFoundPage`. Routes not yet built point at `ComingSoonPage`. Views that must render without the shell (the printable quote) are sibling root routes with their own `ErrorBoundary`.
- **Navigation** — `navigation.ts` is the single source for sidebar groups and items (label, path, icon, optional count). Add a route and its nav entry together. Sub-views such as "hot leads" are in-page tabs, not sidebar entries.
- **Shell layout** — `AppShell` is a fixed-height frame: `Sidebar` (236px, hidden below `lg` and opened from the top bar as a sheet) + a column with `TopBar` (42px) and `<main>`. Pages render `PageHeader` then `PageBody`; `PageBody` is the scroll container, so sticky table headers stick to it. Full-height screens may skip both.
- **Detail drawers** — row-level detail opens in `DrawerPanel` (464px sheet). Its open state is the URL: `useDrawerParam('lead')` reads/writes `?lead=<id>`, so panels are linkable and Esc/close is a URL change.
- **Providers** — one file per provider in `providers/` (`<name>-provider.tsx`, plus `<name>-context.ts` when it exposes context, kept separate so component files export only components). `providers/index.tsx` composes them all; it is the single place to add app-wide context (query client, auth session, i18n, …). Keep `App.tsx` flat. The consuming hook (`useTheme`, `useAuth`, …) lives in `src/hooks/` so components never import from `app/`.
- **Theme** — `ThemeProvider` persists `light | dark | system` in `localStorage` and toggles the `.dark` class. Components read it with `useTheme()` from `@/hooks/use-theme`.

### `pages/`

One folder per route: `pages/<name>/index.tsx` exporting a named component (`HomePage`). Pages are thin: they read route params, compose feature components, and set page-level layout. They contain no data-fetching or business logic themselves.

### `features/<name>/`

Business functionality, grouped by domain rather than by file type:

```text
features/
└── leads/
    ├── components/   # UI specific to this feature (LeadsTable, LeadDrawer, LeadFormDialog, …)
    ├── hooks/        # TanStack Query hooks over `db` + URL state (useLeads, useLeadFilters, mutations)
    ├── utils/        # pure logic: view model (join/filter/sort), filter parsing, colour maps
    └── index.ts      # public surface: only what pages/other features may import
```

- Feature-specific code stays inside its feature. Promote to a shared folder only when it is genuinely reused.
- Features must not import another feature's internals. Import from its `index.ts`, or move the shared piece to `components/`, `hooks/`, `lib/` or `types/`.
- `features/workspace/` holds the reference data every screen needs (workspace, users, pipelines/stages) and `useCurrentUser`, the stand-in for a signed-in user until auth exists. `features/contacts/` owns contacts. `features/leads/` is the reference implementation of a list + drawer screen: list state in the URL (`use-lead-filters.ts`), a joined `LeadRow` view model with pure `filterLeads` / `sortLeads`, and mutations that also write `Activity` rows. The pipeline board (`/leads/pipeline`) is the same feature and the same `useLeadsList()` rows grouped by stage (`utils/board.ts`); `ViewSwitch` moves between table and board keeping the query string.
- `features/tasks/` owns tasks: the same URL-filter / view-model / table / board / drawer shape as leads, plus `LeadTaskList`, which the lead drawer embeds. Dependencies point one way, `leads → (tasks, quotes) → workspace/contacts`; tasks and quotes read leads through the shared query cache (`db.leads` with `queryKeys.leads.list()`) rather than importing `features/leads`.
- `features/quotes/` owns quotes. The list and drawer follow the leads shape; the drawer's footer is driven by a pure workflow table (`utils/quote-workflow.ts`: Draft → Pending approval → Approved | Rejected → Sent → Accepted | Declined, with "Ask revision" back to Draft). Creating and editing happen in a full-page builder (`/quotes/new`, `/quotes/:id/edit`) over a pure draft model (`utils/quote-draft.ts`); only drafts are editable. Every transition writes an `Activity` on the quote (its history) and on the lead (`quote_sent` for sending, `quote_status` otherwise). `/quotes/:id/print` is a chrome-less route beside the shell that renders the customer-facing sheet for the browser's print dialog. `LeadQuoteList` is embedded in the lead drawer. Quote numbers are `Q-<n>`, assigned client-side from the highest in use; a backend should own numbering.
- `features/dashboard/` reads every collection through the shared cache keys and derives one `DashboardModel` in a pure, tested function (`utils/dashboard-model.ts`). Every tile, cell and row is a link into the list it summarises, so the dashboard owns no actions of its own.
- `features/team/` owns members and roles. Inviting creates the user record directly until auth exists; deactivating reassigns the member's open leads and tasks (logging a `reassigned` activity on each lead) and flips `active`. Roles carry the `Permission` list; the UI does not enforce permissions yet.
- `features/appointments/` owns appointments (meeting, video call, phone call, on-site visit): the leads-shaped list and drawer, a schedule/edit dialog that derives `endAt` from a duration, a reschedule popover, completion with outcome notes, cancel/restore. Scheduling, completing and cancelling write `appointment_*` activities on the lead. "Needs outcome" is derived (`isAppointmentOverdue`), never stored. `LeadAppointmentList` is embedded in the lead drawer.
- `features/calendar/` is a composite view: `buildEvents` (pure, tested) turns appointments and open tasks into `CalendarEvent`s, `weekDays` / `monthCells` / `layoutDayEvents` shape the grids, and the view/anchor/filters live in the URL (`?view=month&date=2026-10-05&tasks=0&assignee=`). The feature owns the toolbar and grids only; `pages/calendar` composes `AppointmentDrawer` and `TaskDrawer` and opens the scheduling dialog from slot clicks.
- `features/lead-import/` is the import wizard (`/leads/import`, reached from the Leads page). It is a pipeline of pure, tested steps: `parseDelimited` (`lib/csv.ts`) → `autoMap` (header aliases in `utils/import-fields.ts`) → `validateRows` (errors skip the row, warnings fall back to defaults, existing contacts matched by normalised email or phone, repeats within the file attach to the first row's contact) → `buildImportPlan` (create / attach / update / skip per the duplicate policy) → `useRunImport`, which executes the plan row by row against `db` (contacts, leads with a `created` activity, optional follow-up tasks) and reports progress. Wizard state is a reducer in memory rather than the URL, because the payload is the loaded file.
- `features/pipeline-settings/` owns the stages of the default pipeline: a sortable list, a drawer to create/edit, delete-with-move, and rename. Reads come from `features/workspace`; lead counts come from `features/leads`.

### `components/`

- `ui/` — design-system primitives generated by `npx shadcn add <component>`. Treat as vendored: keep edits minimal so they can be regenerated.
- `common/` — reusable, app-specific building blocks that are not tied to a feature.
- `layout/` — page shells and layout components.

### `hooks/`, `types/`

Hooks and types used by more than one feature. Feature-specific ones stay in the feature.

### `lib/`

Infrastructure helpers with no React and no domain knowledge: `env.ts`, `api.ts`, `format.ts`, `dates.ts`, `csv.ts`, `utils.ts`. Add things like storage wrappers or logging here.

### `assets/`

Images and other static files imported from code. Files that must keep their URL (favicon, robots.txt) go in `public/`.

## Data Flow

```text
page → feature component → feature hook (useQuery / useMutation) → db.<collection> → local demo store
                                                                                    └→ lib/api → backend
```

- **Entities** live in `src/types/domain/`: `Workspace`, `Role`, `User`, `Contact`, `Pipeline`, `Stage`, `Lead`, `Task`, `Appointment`, `Quote` (+ `QuoteLineItem`), `Activity`, `Conversation`, `Message`. All extend `BaseEntity { id, createdAt, updatedAt }`. Anything that varies per business (stages, lead sources, currency, tax) is data on `Workspace` / `Stage`, not code. Derived facts (a task being overdue, quote totals) are computed by helpers such as `isTaskOverdue`, never stored.
- **`db`** (`src/data/index.ts`) exposes one `Collection<T>` per entity with `list / get / create / update / remove`. With `VITE_API_BASE_URL` empty it is the local demo store (seeded, persisted in `localStorage`, `resetDemoData()` reseeds); with it set, `createHttpCollection` maps the same operations onto `lib/api` (`GET /leads`, `PATCH /leads/:id`, …). `get` / `update` / `remove` reject with `NotFoundError`.
- **Feature hooks** wrap TanStack Query around `db`, using `queryKeys.<collection>.list()` / `.detail(id)` and invalidating `queryKeys.<collection>.all` after mutations. Components render what the hook returns; they never import `db`.
- Filtering, sorting and pagination are client-side for now; `list()` gains parameters when the backend contract exists.
- **Timelines** (`Activity`) are written by the client in the mutation hooks (lead created, stage moved, note added) because there is no server to do it. When the API exists the server records them and the hooks only invalidate `queryKeys.activities.all`.
- Deleting a lead cascades client-side to its tasks, quotes, appointments and activities (see `useDeleteLead`); a backend should enforce the same rule.

## Styling

- Tailwind utilities only; compose conditional classes with `cn` from `@/lib/utils`.
- All colours, radii, shadows and the font come from `src/app/styles/tokens.css`. `index.css` maps them to Tailwind via `@theme inline` and defines the 13px type scale; you should rarely need to touch it.
- What each element should look like, and which primitive builds it, is specified in [`docs/DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md). The dev-only `/design-system` route (`src/pages/design-system/`) renders it all.
- Dark mode is class-based (`.dark` on `<html>`), managed by `ThemeProvider`.

## Import Convention

- `@/` across project areas (`@/components/ui/button`, `@/features/leads`).
- Relative imports for nearby files within the same module.

## Adding Things Later

The foundation deliberately stops here. When the project needs more, put it where it belongs:

| Need                 | Where                                                                                                                                                                                                                                          |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Server-state caching | Done: TanStack Query in `app/providers/query-provider.tsx`; query functions call `db` from `src/data/`.                                                                                                                                        |
| Global client state  | Add Zustand (or React context) under the owning feature; promote to `app/` only if truly global.                                                                                                                                               |
| Auth                 | `features/auth/` for logic and screens; session provider in `app/providers/`; route guards as a layout route in `app/router.tsx`. Replace the body of `useCurrentUser` (`features/workspace/`) with the session; its callers stay as they are. |
| Forms / validation   | React Hook Form + Zod inside the feature that owns the form.                                                                                                                                                                                   |
| Tests                | Done: Vitest + Testing Library (`vite.config.ts` → `test`, setup in `src/test/setup.ts`); colocate `*.test.ts(x)` with source.                                                                                                                 |
| Real backend         | Set `VITE_API_BASE_URL`; `db` switches to `createHttpCollection`. Add list parameters to `Collection.list` as the API defines them.                                                                                                            |
| CI                   | `.github/workflows/ci.yml` running `npm ci && npm run check`.                                                                                                                                                                                  |
| More UI primitives   | `npx shadcn add <component>` — lands in `components/ui/`.                                                                                                                                                                                      |
