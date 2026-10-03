import { env } from '@/lib/env';

/**
 * Minimal typed JSON client over `fetch`, prefixed with `VITE_API_BASE_URL`.
 *
 * Usage (inside the data layer):
 *   const users = await api.get<User[]>('/users');
 *   await api.post('/users', { body: { name } });
 *
 * Feature hooks use the data collections through TanStack Query for caching,
 * retries and request de-duplication. Only `src/data/` imports this transport.
 */

export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, body: unknown) {
    super(`Request failed with status ${status}`);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

export interface RequestOptions {
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  /** Public auth endpoints do not inherit an existing bearer token. */
  authenticated?: boolean;
  /** Logout is best effort and must not recursively trigger another sign-out. */
  handleUnauthorized?: boolean;
  /** The access request itself must not ask for access to be reloaded. */
  handleForbidden?: boolean;
}

let authToken: string | null = null;
let authController = new AbortController();
let unauthorizedHandler: (() => void) | null = null;
let forbiddenHandler: (() => void) | null = null;

/** Bearer token sent with every request; `null` clears it. Set by the session, never read from `VITE_*`. */
export function setAuthToken(token: string | null): void {
  if (authToken !== token) {
    authController.abort(new DOMException('The authentication context changed.', 'AbortError'));
    authController = new AbortController();
  }
  authToken = token;
}

/** Data operations capture this before queuing, so they cannot inherit a later token. */
export function getAuthSignal(): AbortSignal {
  return authController.signal;
}

/** Called once per 401 so the session can sign the user out. Returns an unsubscribe. */
export function onUnauthorized(handler: () => void): () => void {
  unauthorizedHandler = handler;
  return () => {
    if (unauthorizedHandler === handler) unauthorizedHandler = null;
  };
}

/** Called on a 403 from the current credentials: what the user may do has changed. Returns an unsubscribe. */
export function onForbidden(handler: () => void): () => void {
  forbiddenHandler = handler;
  return () => {
    if (forbiddenHandler === handler) forbiddenHandler = null;
  };
}

async function parseBody(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined;
  const contentType = response.headers.get('content-type') ?? '';
  return contentType.includes('application/json') ? response.json() : response.text();
}

async function request<T>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
  const { body, headers, signal } = options;
  const requestToken = options.authenticated === false ? null : authToken;
  const requestAuthSignal = getAuthSignal();
  signal?.throwIfAborted();

  const response = await fetch(`${env.apiBaseUrl}${path}`, {
    method,
    headers: {
      Accept: 'application/json',
      ...(body !== undefined && { 'Content-Type': 'application/json' }),
      ...(requestToken && { Authorization: `Bearer ${requestToken}` }),
      ...headers,
    },
    ...(body !== undefined && { body: JSON.stringify(body) }),
    ...(signal && { signal }),
  });

  const payload = await parseBody(response);
  signal?.throwIfAborted();
  const currentCredentials =
    requestToken && requestToken === authToken && !requestAuthSignal.aborted;
  if (response.status === 401 && currentCredentials && options.handleUnauthorized !== false)
    unauthorizedHandler?.();
  if (response.status === 403 && currentCredentials && options.handleForbidden !== false)
    forbiddenHandler?.();
  if (!response.ok) throw new ApiError(response.status, payload);
  return payload as T;
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) => request<T>('GET', path, options),
  post: <T>(path: string, options?: RequestOptions) => request<T>('POST', path, options),
  put: <T>(path: string, options?: RequestOptions) => request<T>('PUT', path, options),
  patch: <T>(path: string, options?: RequestOptions) => request<T>('PATCH', path, options),
  delete: <T>(path: string, options?: RequestOptions) => request<T>('DELETE', path, options),
};
