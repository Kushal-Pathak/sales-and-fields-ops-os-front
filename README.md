# Pilot CRM

The Pilot CRM frontend: a customer relationship management application for managing leads, contacts and deals.

Built with React 19, Vite, TypeScript (strict), Tailwind CSS v4, shadcn/ui (Base UI), React Router, ESLint and Prettier.

## Requirements

- Node.js 24+ (see `.nvmrc`)
- npm

## Getting Started

```bash
npm install
cp .env.example .env.local
npm run dev
```

This project uses npm. Use npm consistently to avoid lockfile conflicts.

## Scripts

| Command                | What it does                               |
| ---------------------- | ------------------------------------------ |
| `npm run dev`          | Dev server with hot reload                 |
| `npm run build`        | Type-checks and builds for production      |
| `npm run preview`      | Serves the production build locally        |
| `npm run lint`         | Reports ESLint problems                    |
| `npm run lint:fix`     | Auto-fixes ESLint problems                 |
| `npm run format`       | Formats files with Prettier                |
| `npm run format:check` | Checks formatting without changing files   |
| `npm run typecheck`    | Type-checks with `tsc -b`                  |
| `npm run test`         | Runs the Vitest suites once                |
| `npm run check`        | `lint` + `format:check` + `test` + `build` |

Run `npm run check` before considering changes complete.

## Project Structure

```text
src/
├── app/            # composition root: App.tsx, router.tsx, providers/, styles/
├── assets/         # images and static files imported by code
├── components/
│   ├── ui/         # design-system primitives (shadcn/ui, generated)
│   ├── common/     # reusable app components (error boundary, theme toggle, …)
│   └── layout/     # app shell / layout components
├── data/           # data access: db.<collection> services, local demo store + seed
├── features/       # business functionality, one folder per feature (dashboard, workspace, contacts, leads, tasks, quotes, appointments, calendar, team, pipeline-settings, …)
├── hooks/          # hooks shared across features
├── lib/            # infrastructure helpers: env.ts, api.ts, format.ts, dates.ts, utils.ts
├── pages/          # route components; thin, compose features
└── types/          # types shared across features (types/domain = entities)
```

The project follows a feature-first architecture. See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for folder responsibilities and where to add things later (state, data fetching, auth, tests).

## Environment Variables

Copy `.env.example` to `.env.local` and provide local values. Read them only through `src/lib/env.ts`, which fails fast on missing required values.

| Variable            | Purpose                                                                                                                 |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `VITE_APP_NAME`     | Display name of the app (`Pilot CRM`)                                                                                   |
| `VITE_API_BASE_URL` | Base URL of the backend API (no trailing /). Leave empty to run on local demo data, seeded and persisted in the browser |

Never store secrets, credentials, private keys, or other sensitive values in `VITE_*` variables. They are bundled into client-side code.

## Design System

Colours, typography, spacing and the look and behaviour of every UI element are specified in [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md) and implemented as tokens in `src/app/styles/tokens.css`. In development, `/design-system` renders every token and primitive for visual checks. The reference mock is kept locally in `design/` (git-ignored).

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Development Guide](docs/DEVELOPMENT.md)
- [Design System](docs/DESIGN_SYSTEM.md)
- [Agent Instructions](AGENTS.md)
