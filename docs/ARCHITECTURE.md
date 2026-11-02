# Architecture

Sales and Field Ops OS uses a feature-first frontend architecture. The rule of thumb: **`app/` wires, `pages/` route, `features/` own logic, `components/` are dumb and shared, `lib/` is infrastructure.**

## Structure

```text
src/
├── app/
│   ├── App.tsx             # composition root: <Providers><RouterProvider/></Providers>
│   ├── router.tsx          # route table (pages are lazy-loaded here, each with a `handle`)
│   ├── navigation.ts       # sidebar groups and items, each tied to a module — must match router paths
│   ├── module-routes.tsx   # ModuleOutlet (per-page module guard) and HomeRedirect
│   ├── providers/
│   │   ├── index.tsx       # <Providers>: composes every app-wide provider
│   │   ├── query-provider.tsx  # TanStack Query client
│   │   ├── theme-provider.tsx  # dark/light/system, toggles `.dark` on <html>
│   │   ├── theme-context.ts
│   │   ├── command-palette-provider.tsx  # palette open state + ⌘K shortcut
│   │   ├── command-palette-context.ts
│   │   ├── session-provider.tsx  # restores the session, sign-in / sign-out, 401 handling
│   │   └── session-context.ts
│   ├── guarded-shell.tsx   # AppShell behind RequireSession and RequireAccess
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
│   ├── preferences.ts      # per-browser conveniences (recent queries, sidebar collapsed, drawer width)
│   ├── session.ts          # session adapters: demo member picker, or the auth API
│   ├── access.ts           # access adapters: the resolved AccessContext (permissions, modules, flags)
│   ├── assistant.ts        # POST /assistant/ask on the backend; the only AI call, never a model key
│   └── seed/               # generic demo data, dates relative to now
├── features/
│   ├── auth/               # RequireSession, RequireAccess, RequireModule, the MODULES table and resolver, useCan / useModule / useFlag
│   ├── dashboard/          # stat tiles, pipeline strip, attention panels (pure buildDashboard model)
│   ├── workspace/          # reference data hooks: useWorkspace, useUsers, useStages, useCurrentUser
│   ├── contacts/           # useContacts, useCreateContact
│   ├── leads/              # leads list + pipeline board (shared URL filters), lead drawer, form, mutations
│   ├── tasks/              # tasks table + status board, task drawer, form, LeadTaskList for the lead drawer
│   ├── quotes/             # quotes table + drawer (approval workflow), full-page builder, print view, LeadQuoteList
│   ├── appointments/       # appointments table + drawer, schedule/edit dialog, complete-with-notes, LeadAppointmentList
│   ├── calendar/           # week time-grid + month grid over appointments and due tasks (pure buildEvents model)
│   ├── lead-import/        # CSV/TSV import wizard: parse → map → validate → plan → run
│   ├── inbox/              # conversations list, thread + composer, quick replies, LeadConversationPanel
│   ├── custom-fields/      # field definitions per record type, inputs and read-only values for forms and drawers
│   ├── automations/        # rules table + drawer, and the engine that runs rules from lead events
│   └── command-palette/    # ⌘K palette: sections, record search, quick actions, local intents, assistant hand-off
│   ├── team/               # members table + drawer, invite/edit, deactivate-with-reassign, roles + permissions
│   ├── pipeline-settings/  # stage list (sortable), stage drawer, delete-with-move, pipeline rename
│   └── module-settings/    # which modules the workspace uses (/settings/modules)
├── hooks/
├── lib/
│   ├── env.ts              # validated access to VITE_* variables
│   ├── flags.ts            # the typed feature flag registry and its defaults
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

- **Routing** — `router.tsx` uses React Router's data router. Each page is registered with `lazy` so it is code-split, and declares a `handle: { title, group? }` (`src/types/route-handle.ts`) that drives the breadcrumb and document title via `useRouteHandle()`. `AppShell` is the shared shell; `RootErrorBoundary` catches render and loader errors for every route. `/` redirects to `/dashboard`; a `*` route renders `NotFoundPage`. Views that must render without the shell (the printable quote) are sibling root routes with their own `ErrorBoundary`.
- **Navigation** — `navigation.ts` is the single source for sidebar groups and items (label, path, icon, module, optional count). Add a route and its nav entry together. `visibleNav` keeps the entries whose module is open to the signed-in user; the sidebar, the command palette and the `/` redirect all go through it. Sub-views such as "hot leads" are in-page tabs, not sidebar entries.
- **Shell layout** — `AppShell` is a fixed-height frame: `Sidebar` (236px, or a 52px icon rail when collapsed with the toggle at the start of the top bar or ⌘B / Ctrl-B — `AppShell` owns that state and remembers it through `data/preferences.ts`, passing the state and toggle callback to `TopBar`; hidden below `lg` and opened from the top bar as a sheet) + a column with `TopBar` (42px) and `<main>`. Pages render `PageHeader` then `PageBody`; `PageBody` is the scroll container, so sticky table headers stick to it. Full-height screens may skip both.
- **Detail drawers** — row-level detail opens in `DrawerPanel` (464px default; resizable from its left edge on desktop, full-width below `lg`). `useDrawerWidth` owns pointer and keyboard resizing, clamps the width to the viewport, and remembers the preferred desktop width through `data/preferences.ts`. A preference subscription keeps multiple mounted drawers consistent without another provider; preview widths stay local until a drag finishes. Its open state is the URL: `useDrawerParam('lead')` reads/writes `?lead=<id>`, so panels are linkable and Esc/close is a URL change.
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
- `features/auth/` is the client half of authentication. `data/session.ts` defines one `SessionAdapter` with two implementations: the demo one signs in by choosing a seeded member and remembers it per browser; the API one calls `POST /auth/login` (`{ email, password }` → `{ token, user }`), keeps the bearer token through `setAuthToken` in `lib/api.ts`, restores with `GET /auth/me`, ends with `POST /auth/logout`, and signs out on a 401 from the current credential context. Late responses from an older context are ignored. `SessionProvider` (`app/providers`) restores on load, rejects superseded authentication results and gives each session a fresh query client; sign-out clears the local identity before awaiting the logout request; `useAuth()` reads it. `RequireSession` guards every route except `/sign-in`; `SignInForm` shows a member picker or an email/password form depending on the adapter; `UserMenu` in the sidebar footer switches user (demo) or signs out. `useCan(permission)` and `PermissionNote` gate the UI by the role's permissions, `useModule` by module and `useFlag` by feature flag; see "Access" below. None of this is security: the backend must enforce the same rules on its API.
- `features/workspace/` holds the reference data every screen needs (workspace, users, pipelines/stages) and `useCurrentUser`, which now returns the session's user. `features/contacts/` owns contacts. `features/leads/` is the reference implementation of a list + drawer screen: list state in the URL (`use-lead-filters.ts`), a joined `LeadRow` view model with pure `filterLeads` / `sortLeads`, and mutations that also write `Activity` rows. The pipeline board (`/leads/pipeline`) is the same feature and the same `useLeadsList()` rows grouped by stage (`utils/board.ts`); `ViewSwitch` moves between table and board keeping the query string.
- `features/tasks/` owns tasks: the same URL-filter / view-model / table / board / drawer shape as leads, plus `LeadTaskList`, which the lead drawer embeds. Dependencies point one way, `leads → (tasks, quotes) → workspace/contacts`; tasks and quotes read leads through the shared query cache (`db.leads` with `queryKeys.leads.list()`) rather than importing `features/leads`.
- `features/quotes/` owns quotes. The list and drawer follow the leads shape; the drawer's footer is driven by a pure workflow table (`utils/quote-workflow.ts`: Draft → Pending approval → Approved | Rejected → Sent → Accepted | Declined, with "Ask revision" back to Draft). Creating and editing happen in a full-page builder (`/quotes/new`, `/quotes/:id/edit`) over a pure draft model (`utils/quote-draft.ts`); only drafts are editable. Every transition writes an `Activity` on the quote (its history) and on the lead (`quote_sent` for sending, `quote_status` otherwise). `/quotes/:id/print` is a chrome-less route beside the shell that renders the customer-facing sheet for the browser's print dialog. `LeadQuoteList` is embedded in the lead drawer. Quote numbers are `Q-<n>`, assigned client-side from the highest in use; a backend should own numbering.
- `features/dashboard/` reads every collection through the shared cache keys and derives one `DashboardModel` in a pure, tested function (`utils/dashboard-model.ts`). Every tile, cell and row is a link into the list it summarises, so the dashboard owns no actions of its own.
- `features/team/` owns members and roles. Inviting creates the user record directly until auth exists; deactivating reassigns the member's open leads and tasks (logging a `reassigned` activity on each lead) and flips `active`. Roles carry the `Permission` list. Task workload on the team screen is optional: with Tasks closed to the viewer the counts are unknown (`null`), not zero.
- `features/appointments/` owns appointments (meeting, video call, phone call, on-site visit): the leads-shaped list and drawer, a schedule/edit dialog that derives `endAt` from a duration, a reschedule popover, completion with outcome notes, cancel/restore. Scheduling, completing and cancelling write `appointment_*` activities on the lead. "Needs outcome" is derived (`isAppointmentOverdue`), never stored. `LeadAppointmentList` is embedded in the lead drawer.
- `features/calendar/` is a composite view: `buildEvents` (pure, tested) turns appointments and open tasks into `CalendarEvent`s, `weekDays` / `monthCells` / `layoutDayEvents` shape the grids, and the view/anchor/filters live in the URL (`?view=month&date=2026-10-05&tasks=0&assignee=`). The feature owns the toolbar and grids only; `pages/calendar` composes `AppointmentDrawer` and `TaskDrawer` and opens the scheduling dialog from slot clicks.
- `features/lead-import/` is the import wizard (`/leads/import`, reached from the Leads page). It is a pipeline of pure, tested steps: `parseDelimited` (`lib/csv.ts`) → `autoMap` (header aliases in `utils/import-fields.ts`) → `validateRows` (errors skip the row, warnings fall back to defaults, existing contacts matched by normalised email or phone, repeats within the file attach to the first row's contact) → `buildImportPlan` (create / attach / update / skip per the duplicate policy) → `useRunImport`, which executes the plan row by row against `db` (contacts, leads with a `created` activity, optional follow-up tasks) and reports progress. Wizard state is a reducer in memory rather than the URL, because the payload is the loaded file.
- `features/inbox/` owns conversations and messages on four channels (WhatsApp, SMS, email, web chat). The list follows the leads shape (URL filters, joined `ConversationRow` with the latest message); the open thread is `?c=<id>`. There is no messaging provider yet: sending stores an outbound `Message`, bumps the conversation, clears its unread count and logs a `message` activity on the lead; opening a thread clears `unreadCount` optimistically. Starting a conversation reuses the lead's existing thread on that channel. `LeadConversationPanel` is embedded in the lead drawer's Messages tab. When a provider exists, `useSendMessage` / `useStartConversation` call it and the inbound side arrives through the API.
- `features/custom-fields/` owns `FieldDefinition` rows (`/settings/fields`: one sortable list per record type, a drawer to add or edit, delete keeps stored values). `CustomFieldInputs` renders a definition list as form controls over a `CustomValues` object, `validateValues` / `cleanValues` guard a save, and `CustomFieldValues` shows a record's values. The lead form and drawer use the lead and contact definitions; the appointment completion dialog asks the appointment ones and stores them in `outcome`.
- `features/automations/` owns `Automation` rules and their `AutomationRun` log (`/settings/automations`). `engine/match.ts` decides which rules an `AutomationEvent` fires; `engine/run-automations.ts` executes their actions against `db` (tasks, stage and owner changes, a quick reply into the lead's thread on that channel, notes), writes a run per rule, bumps `lastRunAt` / `runCount` and logs an `automation` activity on the lead. It never re-enters itself, so a rule that moves a stage cannot cascade. Mutations raise events after their own write: `useCreateLead` and the import runner (`lead_created`), `applyLeadPatch` (`lead_stage_changed`), `useQuoteAction` (`quote_status_changed`), `useCompleteAppointment` (`appointment_completed`); they then invalidate `AUTOMATION_EFFECT_KEYS`. A backend replaces the engine and the hook points; the rule shape stays.
- `features/command-palette/` is the ⌘K palette the shell mounts once. It reads every collection through the shared cache keys while open and derives everything with pure functions: `sectionCommands` from `app/navigation.ts`, `searchRecords` (leads, contacts, tasks, quotes, appointments, ranked prefix-first), `parseIntent` / `answerIntent` (overdue tasks, leads without a follow-up, today, hot leads, pending quotes, unread messages, "create a … task for <contact> <when>", "assign all hot leads to <member>"). Read-only answers render in the palette with links; the create-task intent prefills `TaskFormDialog`; the bulk assignment asks for confirmation and then runs `useBulkAssignLeads`. Anything unparsed becomes a question for the backend assistant (`data/assistant.ts`: `POST /assistant/ask` with `{ question, context: { route } }` → `{ answer }`), which is only attempted when `VITE_API_BASE_URL` is set. Recent queries persist per browser through `data/preferences.ts`.
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

- **Entities** live in `src/types/domain/`: `Workspace`, `Role`, `User`, `Contact`, `Pipeline`, `Stage`, `Lead`, `Task`, `Appointment`, `Quote` (+ `QuoteLineItem`), `Activity`, `Conversation`, `Message`, `FieldDefinition`, `Automation`, `AutomationRun`. All extend `BaseEntity { id, createdAt, updatedAt }`. Anything that varies per business (stages, lead sources, currency, tax) is data on `Workspace` / `Stage`, not code. Derived facts (a task being overdue, quote totals) are computed by helpers such as `isTaskOverdue`, never stored.
- **`db`** (`src/data/index.ts`) exposes one `Collection<T>` per entity with `list / get / create / update / remove`. With `VITE_API_BASE_URL` empty it is the local demo store (seeded, persisted in `localStorage`, `resetDemoData()` reseeds); with it set, `createHttpCollection` maps the same operations onto `lib/api` (`GET /leads`, `PATCH /leads/:id`, …). `get` / `update` / `remove` reject with `NotFoundError`.
- **Feature hooks** wrap TanStack Query around `db`, using `queryKeys.<collection>.list()` / `.detail(id)`. Queries pass their `AbortSignal` to the collection (`queryFn: ({ signal }) => db.leads.list({ signal })`); both adapters honor it. Components render what the hook returns; they never import `db`.
- Filtering and sorting use complete collections in the browser. There is no server pagination contract yet; adding an HTTP base URL does not make these reads scalable.
- **Timelines** (`Activity`), cascades and automations are currently multiple client-orchestrated writes in both adapters. A production backend must replace these with transactional commands; switching to the HTTP adapter alone does not make them atomic.
- Deleting a lead cascades client-side to its tasks, quotes, appointments and activities (see `useDeleteLead`); a backend should enforce the same rule.

### Access: flags, modules and permissions

Three questions decide whether a user sees a part of the product, and they have different owners:

| Layer        | Question                     | Decided by                                       | Lives in                                                                      |
| ------------ | ---------------------------- | ------------------------------------------------ | ----------------------------------------------------------------------------- |
| Feature flag | Is this code released?       | The vendor                                       | `src/lib/flags.ts` (declaration and default); resolved value from the backend |
| Module       | Does this workspace use it?  | The workspace admin, within what the plan allows | `Workspace.modules` (`enabled`, `configurable`)                               |
| Permission   | May this role open or do it? | The workspace admin, per role                    | `Role.permissions`                                                            |

- **One resolved answer.** The client never evaluates roles or targeting rules. `src/data/access.ts` loads an `AccessContext` (`workspaceId`, `revision`, `permissions`, `modules`, `flags`): the demo adapter derives it from the seeded workspace and the member's role; the API adapter calls `GET /auth/context` and checks the payload at runtime with `parseAccessContext` (unknown keys are dropped, a malformed payload is an error). Flags the backend omits take their declared default; a known flag with a non-boolean value rejects the payload. Permissions and modules have no default.
- **Fail closed.** `RequireAccess` (inside `RequireSession`, in `GuardedShell` and around the print route) renders nothing of the app until the context is loaded. A failed first load shows an error with Retry. A failed refresh keeps the last known context; a 401/403 does not. Session restore follows the same rule: only a refusal signs the user out, anything else is `error` with Retry.
- **One resolver.** `MODULES` (`features/auth/utils/modules.ts`) declares each module's permission, release flag, dependencies and collections. `resolveModule(id, context)` returns `allowed` or `denied` with the first reason that applies: `not_released`, `disabled`, `dependency` (the workspace lacks a module it needs), `forbidden` (the role may not open it, or may open none of what it needs). The first three render as "Page not found"; only `forbidden` tells the user. `requires.all` needs every listed module, `requires.any` at least one (the calendar needs appointments or tasks). `validateModules` rejects cycles, and the resolver closes a cyclic module instead of looping.
- **Where it applies.** Routes declare their module in `handle` and are children of `ModuleOutlet`, so a typed URL (including create, edit and import routes) is guarded; the print route wraps itself in `RequireModule`. Navigation is filtered by `visibleNav`. Features that show another module's records gate both the UI and the query: `useModule` / `useModules` plus `moduleRows`. Disabling a module keeps its records.
- **Refresh and revocation.** The access query follows the normal freshness policy (stale after 30 seconds, refetched on focus). Role, member and module mutations invalidate `queryKeys.access.all`, and so does any 403 from the API (`onForbidden`). `RequireAccess` subscribes to successful access-cache updates through `watchAccess`: it synchronously aborts writes owned by closed modules and removes their cached collections before React renders or late mutation callbacks can repopulate them. It also reconciles initially cached access and closes every write scope on a 401/403 from the access request. Reopening a module creates a fresh scope; old running and queued operations stay cancelled. Guards unmount its pages, and composite screens drop its rows.
- **Dependents are derived.** Switching off a prerequisite writes nothing to dependents; they resolve as unavailable and come back when it is switched on again. Automations keep their rules: `runAutomations` skips an action whose module the workspace has off and says so in the run.
- **Leads is a prerequisite.** Dashboard, Quotes, Tasks, Appointments, Inbox, Team and Settings currently require Leads for their models or workflows. The registry declares that dependency; Calendar inherits it through its sources. These screens cannot operate independently when Leads is unavailable. Leads is not admin-configurable in the seeded workspace. Supporting standalone modules later requires removing their mandatory Lead reads and workflows before changing the registry.
- **Module changes update one item.** `data/module-settings.ts` sends only an id and enabled state, never a replacement module list or an editable entitlement. Its demo implementation reads and patches the current row synchronously, avoiding lost changes between hook instances in one browser process. Separate tabs and real administrators require the API's atomic per-module update.
- **Multiple workspaces.** The context carries `workspaceId`, and a role belongs to a membership, not to a person. The UI still assumes one active workspace: a switcher must reset the session data scope (as an identity change does) and send the active workspace with every request.

#### What the backend must provide

Client gating is presentation. Before production the API has to enforce the same three checks on every read and write:

- Tenant isolation first: workspace membership with the role on it, and a workspace on every record.
- `GET /auth/context` for the bearer token and active workspace, returning the shape above with a `revision` that changes whenever its content does.
- A 403 for a read or write the caller's modules or permissions do not cover, and a cap on module changes by plan and by `modules.manage`.
- `PATCH /workspace/modules/:moduleId` with `{ enabled: boolean }` → `204`: atomically change that module in the active workspace after checking `modules.manage`, plan limits and configurability. Never replace other module states from a client snapshot. The frontend reloads workspace and access afterward.
- `DELETE /leads/:id` → `204`: check workspace ownership, Leads access and `leads.edit`, then atomically delete the lead and its dependent tasks, quotes, appointments and lead activities. The caller need not be able to read each dependent module. This endpoint owns the cascade.
- `POST /users/:id/deactivate` with `{ reassignToId: string | null }` → `204`: check workspace ownership, Team access and `team.manage`; require a different active member in the same workspace when open work exists. Reassign open leads and unfinished tasks, record lead activities with the authenticated actor, then deactivate in one transaction. Closed modules do not remove work from this operation; the response must not reveal hidden record counts. The frontend makes no collection reads for this command.
- If the API reaches the database with a privileged connection, row-level security does not apply to it; the checks must be in the API, with RLS as a second line.

### Query and mutation lifecycle

- **Session ownership:** `SessionProvider` wraps `QueryProvider`. Each restored session, successful sign-in and sign-out increments `cacheVersion`, remounting the query provider and its observers with a fresh `QueryClient`. Old clients are cleared. Writes capture the original session and credential signals, so an old command cannot continue with a new user's credentials or report success into that user's UI. Aborting an HTTP request cannot undo a server write that already committed.
- **Freshness and retries:** queries are fresh for 30 seconds, then may refetch on mount, focus or reconnect. Automatic refetches of a list wait while its optimistic queue is active. Reference data follows the same policy, including roles. Transient read failures retry once; cancellation, missing records and most 4xx responses do not retry. Mutations never retry automatically.
- **Writes:** feature mutation hooks call `useWriteOperation('<owning-module>')` and use the supplied `db` for every collection step, including `runAutomations(event, actorId, db)`. Shared contact writes have no module owner and use the session scope. The wrapper binds those steps to the original session, credential and module signals; pass its supplied `options` to data-layer API commands. Module ownership applies to the command, not every touched collection: an authorized Lead deletion or Team reassignment may affect closed modules. Lead deletion and member deactivation live in `data/lead-commands.ts` and `data/member-commands.ts`; HTTP mode delegates to one backend command, while demo mode uses scoped collection steps. If a later collection step fails after a write, it raises `PartialWriteError`. This reports a known partial save; the demo provides no transaction or rollback. A network failure or cancellation can still leave an unknown server outcome. Detail-cache callbacks also check `write.signal` before applying results.
- **Reconciliation:** invalidate every affected collection in `onSettled`, including failure paths. Set canonical detail data from successful responses. A partial-save form explains that some changes were saved and prevents blindly submitting the same draft again; close it and review the refreshed record.
- **Optimistic changes:** keep them in the feature hook. `beginOptimisticListUpdate(client, key, update, write.signal)` serializes the full optimistic lifecycle per client and list key across hook instances. It checks the captured signal after waiting and cancelling reads, so a queued operation cannot patch the cache after losing access. `onError` calls its ownership-aware `rollback`; `onSettled` awaits invalidation and calls `release` in `finally`. This deliberately queues a second optimistic change to that list until the first refresh finishes. Do not restore a whole-list snapshot over another writer's changes.
- **Rendering:** `QueryContent` blocks initial failures and 401/403 responses. For other refresh failures it keeps cached content and drafts mounted with a `RefreshNotice` and Retry. Joined hooks use `getQueryError` so a permission failure takes precedence over a transient failure in another dependency. Disabled optional queries do not participate in loading checks, joins or aggregate refetches (see `useCalendar`).
- **Time:** use `useNow()` at the screen or drawer root and pass its value into memoized overdue/today calculations. It updates once a minute and when the tab regains visibility or focus; an unchanged API response is not a clock.

### Before connecting a production backend

The HTTP adapter is a CRUD transport, not a complete production data contract. Add backend commands with transactions for record changes plus activities, cascades and automations. Give creation/import/message commands idempotency keys, and allocate quote numbers on the server with a uniqueness constraint.

Define paginated list responses with server-side search, filters and sort, plus separate aggregate endpoints for dashboard and tab counts. Put every request parameter in its query key. Keep browser-side joins only for bounded reference data; paginate record searches for pickers and the command palette as well. The current session cache isolates users, but a future workspace switch must also reset the session data scope or add workspace identity to every key. No workspace-switch flow exists yet.

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

| Need                 | Where                                                                                                                                                                                                                                                                                                                                  |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Server-state caching | Done: TanStack Query in `app/providers/query-provider.tsx`; query functions call `db` from `src/data/`.                                                                                                                                                                                                                                |
| Global client state  | Add Zustand (or React context) under the owning feature; promote to `app/` only if truly global.                                                                                                                                                                                                                                       |
| Auth                 | Done on the client: `data/session.ts` and `data/access.ts` adapters, `SessionProvider`, `RequireSession`, `RequireAccess`, `/sign-in`, `useCan` / `useModule` / `useFlag`. Still the backend's job: verifying credentials, issuing and expiring tokens, resolving access and enforcing it on every read and write. See "Access" above. |
| Forms / validation   | React Hook Form + Zod inside the feature that owns the form.                                                                                                                                                                                                                                                                           |
| Tests                | Done: Vitest + Testing Library (`vite.config.ts` → `test`, setup in `src/test/setup.ts`); colocate `*.test.ts(x)` with source.                                                                                                                                                                                                         |
| Real backend         | Set `VITE_API_BASE_URL`; `db` switches to `createHttpCollection`. Add list parameters to `Collection.list` as the API defines them.                                                                                                                                                                                                    |
| CI                   | `.github/workflows/ci.yml` running `npm ci && npm run check`.                                                                                                                                                                                                                                                                          |
| More UI primitives   | `npx shadcn add <component>` — lands in `components/ui/`.                                                                                                                                                                                                                                                                              |
