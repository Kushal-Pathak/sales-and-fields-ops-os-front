# React + Vite + TypeScript Template

A minimal, reusable starter for React applications: React 19, Vite, TypeScript (strict), Tailwind CSS v4, shadcn/ui (Base UI), React Router, ESLint and Prettier.

It ships with the decisions every app needs already made — folder layout, routing, providers, theming, env access, an API client — and nothing else.

## Requirements

- Node.js 24+ (see `.nvmrc`)
- npm

## Getting Started

Clone the repository with HTTPS or SSH:

```bash
git clone https://github.com/Kushal-Pathak/react-vite-ts-template.git
# or
git clone git@github.com:Kushal-Pathak/react-vite-ts-template.git
```

Then install and run:

```bash
cd react-vite-ts-template
npm install
cp .env.example .env.local
npm run dev
```

This project uses npm. Use npm consistently to avoid lockfile conflicts.

## Customising for a New Project

1. `package.json` — set `name`.
2. `index.html` — set `<title>` and `<meta name="description">`.
3. `.env.example` — set `VITE_APP_NAME`, `VITE_API_BASE_URL`, add your own `VITE_*` vars (also declare them in `src/env.d.ts`).
4. `src/app/styles/tokens.css` — colours, radius, font. Everything visual derives from here.
5. `public/favicon.svg` — replace.
6. `src/pages/home/index.tsx` — replace the demo content.

## Scripts

| Command                | What it does                                |
| ---------------------- | ------------------------------------------- |
| `npm run dev`          | Dev server with hot reload                  |
| `npm run build`        | Type-checks and builds for production       |
| `npm run preview`      | Serves the production build locally         |
| `npm run lint`         | Reports ESLint problems                     |
| `npm run lint:fix`     | Auto-fixes ESLint problems                  |
| `npm run format`       | Formats files with Prettier                 |
| `npm run format:check` | Checks formatting without changing files    |
| `npm run typecheck`    | Type-checks with `tsc -b`                   |
| `npm run check`        | `lint` + `format:check` + `build` (CI gate) |

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
├── features/       # business functionality, one folder per feature
├── hooks/          # hooks shared across features
├── lib/            # infrastructure helpers: env.ts, api.ts, utils.ts
├── pages/          # route components; thin, compose features
└── types/          # types shared across features
```

The template follows a feature-first architecture. See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for folder responsibilities and where to add things later (state, data fetching, auth, tests).

## Environment Variables

Copy `.env.example` to `.env.local` and provide local values. Read them only through `src/lib/env.ts`, which fails fast on missing required values.

Never store secrets, credentials, private keys, or other sensitive values in `VITE_*` variables. They are bundled into client-side code.

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Development Guide](docs/DEVELOPMENT.md)
- [Agent Instructions](AGENTS.md)
