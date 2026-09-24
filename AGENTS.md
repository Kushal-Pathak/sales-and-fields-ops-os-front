# AGENTS.md

Instructions for coding agents working in the Pilot CRM frontend repository. The product and brand name is **Pilot CRM**; use it consistently in UI text, titles and docs. Work like a senior engineer and system architect: understand the system first, change it deliberately, and leave it more consistent than you found it.

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

| Folder              | Holds                                                                        |
| ------------------- | ---------------------------------------------------------------------------- |
| `app/`              | Composition root: `App.tsx`, `router.tsx`, `providers/`, `styles/`           |
| `pages/<name>/`     | Route components; thin, compose features, no business logic                  |
| `features/<name>/`  | Business functionality (`components/ hooks/ types/ utils/ index.ts`)         |
| `components/ui`     | Design-system primitives (shadcn/ui, generated)                              |
| `components/common` | Reusable app components (error boundary, theme toggle, …)                    |
| `components/layout` | Layout / app-shell components                                                |
| `hooks/`, `types/`  | Hooks/types shared across multiple features; `types/domain/` = entities      |
| `data/`             | Data access: `db.<collection>` services, local demo store + seed, query keys |
| `lib/`              | Infrastructure helpers: `env.ts`, `api.ts`, `format.ts`, `utils.ts`          |

- Feature-specific code stays inside its feature. Promote to a shared folder only when it is genuinely reused.
- Features must not reach into another feature's internals; import from its `index.ts` or move shared pieces to a shared folder.
- Imports: `@/` across project areas, relative imports within the same module.
- Never bypass a boundary because it is faster.
- **Established conventions — follow them, do not introduce parallel ones:**
  - Routing: register pages in `src/app/router.tsx` with `lazy` and a `handle: { title, group? }` (`src/types/route-handle.ts`); `AppShell` is the shell, `RootErrorBoundary` catches route errors, `*` renders `NotFoundPage`. Sidebar entries live in `src/app/navigation.ts` and must match route paths.
  - Pages: render `PageHeader` then `PageBody` from `@/components/layout/page-header`; `PageBody` is the scroll container. Full-height screens (inbox, builders, wizards) may skip both and manage their own layout inside `<main>`.
  - Detail panels: `DrawerPanel` (+ `DrawerHeader/Body/Footer`) from `@/components/layout/drawer-panel`, opened via `useDrawerParam('<key>')` from `@/hooks/use-drawer-param` so the open item is in the URL. Never keep drawer state in component state.
  - Providers: one file per provider in `src/app/providers/` (plus a `*-context.ts` if it exposes context), composed in `src/app/providers/index.tsx`. Expose the consuming hook from `src/hooks/`.
  - Data access: feature hooks in `features/<name>/hooks/` wrap TanStack Query (`useQuery` / `useMutation`) around `db.<collection>` from `@/data`, keyed with `queryKeys`. Components never call `db`; nothing outside `src/data/` touches `localStorage` or `@/lib/api`. Entity types come from `@/types/domain`; derived facts (overdue, quote totals) are computed, never stored.
  - Reference data: `useWorkspace` / `useUsers` / `useStages` / `usePipelines` / `useCurrentUser` from `@/features/workspace`; contacts from `@/features/contacts`. `useCurrentUser` is the stand-in for auth (first active user) — build on it, auth replaces its implementation.
  - List screens: everything that narrows a list (view tabs, search, filters, sort) lives in the query string, read and written by a feature hook (`features/<name>/hooks/use-<name>-filters.ts`) whose parse/serialize functions are pure and tested. Joining, filtering and sorting are pure functions over a joined row type (`features/leads/utils/lead-view-model.ts` is the model); components only render. Follow `features/leads/` for a new list + drawer.
  - Category colours (stage, priority, task/quote status, …) are `StatusColor` values mapped to classes only in `src/components/common/status-color.ts`; render them with `StatusBadge` / `StatusDot` / `InitialsAvatar` from `@/components/common`. Empty and error blocks use `EmptyState` / `ErrorState`.
  - Drag and drop: `@dnd-kit` only. `PointerSensor` with an activation distance so clicks still work, a `KeyboardSensor` (custom `coordinateGetter` when targets are columns), `DragOverlay` for the lifted item, and `accessibility.announcements` in plain words. `features/leads/components/pipeline-board.tsx` (cards between droppable columns) and `features/pipeline-settings/components/stage-list.tsx` (sortable rows) are the two shapes to copy.
  - Optimistic updates live in the feature's mutation hook only (`onMutate` writes the list cache, `onError` restores it, `onSettled` invalidates), never in components. Use them where a drop must settle at once; plain invalidation elsewhere.
  - Feature dependencies point one way: `leads → tasks → (workspace, contacts)`. A feature that needs another feature's rows without depending on it reads the shared cache through `db` with the same `queryKeys` (see `features/tasks/hooks/use-tasks.ts`). Never create an import cycle between feature `index.ts` files.
  - Filter rows are built from `SearchField` / `FilterChip` / `SortMenu` in `@/components/common/list-toolbar`; table/board switches use `ViewSwitch` from `@/components/layout/view-switch` with a per-page `views` list.
  - Sections with sub-pages (Settings, Team) render a `SectionNav` (`@/components/layout/section-nav`) as the `PageHeader` children, wrapped per section (`SettingsNav`, `pages/team/team-nav.tsx`); each sub-page is its own feature and route.
  - Permissions are data on `Role` (`PERMISSIONS` in `features/team` lists them with labels). Nothing enforces them yet; when auth lands, gate UI with a `useCan(permission)` hook built on `useCurrentUser` + `useRoles`.
  - Money and dates: format with `formatMoney` / `formatDate` / `formatRelative` from `@/lib/format` using the workspace's `currency` and `locale`.
  - Theme: `useTheme()` from `@/hooks/use-theme`; never toggle the `.dark` class by hand.
  - TanStack Query is the only state library. Auth and global client state are not included; if a task needs one, put it where `docs/ARCHITECTURE.md` ("Adding Things Later") says, keep it minimal, and document it.
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
