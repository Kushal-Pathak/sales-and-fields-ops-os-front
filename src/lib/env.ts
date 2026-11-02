/**
 * Typed, validated access to `VITE_*` environment variables.
 *
 * - Declare new variables in `src/env.d.ts` and `.env.example`, then expose them here.
 * - Read them only through `env`, never `import.meta.env` directly.
 * - Use `required()` for values the app cannot run without; it throws at startup with
 *   a clear message instead of letting `undefined` leak into the UI.
 * - Never put secrets here: everything in `VITE_*` ships to the browser.
 */

export function required(key: keyof ImportMetaEnv): string {
  const value = import.meta.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable "${key}". See .env.example.`);
  }
  return value;
}

export function optional(key: keyof ImportMetaEnv, fallback = ''): string {
  return import.meta.env[key] || fallback;
}

export const env = {
  appName: optional('VITE_APP_NAME', 'Sales and Field Ops OS'),
  apiBaseUrl: optional('VITE_API_BASE_URL'),
} as const;
