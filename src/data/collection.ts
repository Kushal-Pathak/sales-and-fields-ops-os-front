import { ApiError, api } from '@/lib/api';
import type { BaseEntity, CreateInput, UpdateInput } from '@/types/domain';
import { NotFoundError } from './errors';
import { readRows, writeRows } from './local-store';

/**
 * The five operations every entity supports, shaped like a REST resource so the
 * local (demo) implementation and the HTTP implementation are interchangeable.
 */
export interface CollectionOptions {
  signal?: AbortSignal;
}

export interface Collection<T extends BaseEntity> {
  list(options?: CollectionOptions): Promise<T[]>;
  /** Rejects with `NotFoundError` when the id does not exist. */
  get(id: string, options?: CollectionOptions): Promise<T>;
  create(input: CreateInput<T>, options?: CollectionOptions): Promise<T>;
  update(id: string, patch: UpdateInput<T>, options?: CollectionOptions): Promise<T>;
  remove(id: string, options?: CollectionOptions): Promise<void>;
}

export interface LocalCollectionOptions {
  /** Simulated latency so loading states are visible. Defaults to 120ms, 0 in tests. */
  latencyMs?: number;
  now?: () => Date;
  newId?: () => string;
}

const DEFAULT_LATENCY = import.meta.env.MODE === 'test' ? 0 : 120;

function delay(ms: number): Promise<void> {
  return ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve();
}

/** A collection persisted in localStorage (see `local-store.ts`). Rows are read fresh on every call. */
export function createLocalCollection<T extends BaseEntity>(
  name: string,
  options: LocalCollectionOptions = {},
): Collection<T> {
  const latency = options.latencyMs ?? DEFAULT_LATENCY;
  const now = options.now ?? (() => new Date());
  const newId = options.newId ?? (() => crypto.randomUUID());

  const rows = (): T[] => readRows<T>(name) ?? [];

  return {
    async list(options) {
      await delay(latency);
      options?.signal?.throwIfAborted();
      return rows();
    },

    async get(id, options) {
      await delay(latency);
      options?.signal?.throwIfAborted();
      const row = rows().find((r) => r.id === id);
      if (!row) throw new NotFoundError(name, id);
      return row;
    },

    async create(input, options) {
      await delay(latency);
      options?.signal?.throwIfAborted();
      const timestamp = now().toISOString();
      const row = { ...input, id: newId(), createdAt: timestamp, updatedAt: timestamp } as T;
      writeRows(name, [...rows(), row]);
      return row;
    },

    async update(id, patch, options) {
      await delay(latency);
      options?.signal?.throwIfAborted();
      const all = rows();
      const index = all.findIndex((r) => r.id === id);
      const existing = all[index];
      if (!existing) throw new NotFoundError(name, id);
      const row = { ...existing, ...patch, id, updatedAt: now().toISOString() } as T;
      all[index] = row;
      writeRows(name, all);
      return row;
    },

    async remove(id, options) {
      await delay(latency);
      options?.signal?.throwIfAborted();
      const all = rows();
      if (!all.some((r) => r.id === id)) throw new NotFoundError(name, id);
      writeRows(
        name,
        all.filter((r) => r.id !== id),
      );
    },
  };
}

/** A collection backed by the REST API at `basePath` (`GET /leads`, `PATCH /leads/:id`, …). */
export function createHttpCollection<T extends BaseEntity>(
  name: string,
  basePath: string,
): Collection<T> {
  const itemPath = (id: string) => `${basePath}/${encodeURIComponent(id)}`;

  const mapNotFound = (id: string) => (error: unknown) => {
    if (error instanceof ApiError && error.status === 404) throw new NotFoundError(name, id);
    throw error;
  };

  return {
    list: (options) => api.get<T[]>(basePath, options),
    get: (id, options) => api.get<T>(itemPath(id), options).catch(mapNotFound(id)),
    create: (input, options) => api.post<T>(basePath, { ...options, body: input }),
    update: (id, patch, options) =>
      api.patch<T>(itemPath(id), { ...options, body: patch }).catch(mapNotFound(id)),
    remove: (id, options) => api.delete<void>(itemPath(id), options).catch(mapNotFound(id)),
  };
}
