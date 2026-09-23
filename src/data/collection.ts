import { ApiError, api } from '@/lib/api';
import type { BaseEntity, CreateInput, UpdateInput } from '@/types/domain';
import { NotFoundError } from './errors';
import { readRows, writeRows } from './local-store';

/**
 * The five operations every entity supports, shaped like a REST resource so the
 * local (demo) implementation and the HTTP implementation are interchangeable.
 */
export interface Collection<T extends BaseEntity> {
  list(): Promise<T[]>;
  /** Rejects with `NotFoundError` when the id does not exist. */
  get(id: string): Promise<T>;
  create(input: CreateInput<T>): Promise<T>;
  update(id: string, patch: UpdateInput<T>): Promise<T>;
  remove(id: string): Promise<void>;
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
    async list() {
      await delay(latency);
      return rows();
    },

    async get(id) {
      await delay(latency);
      const row = rows().find((r) => r.id === id);
      if (!row) throw new NotFoundError(name, id);
      return row;
    },

    async create(input) {
      await delay(latency);
      const timestamp = now().toISOString();
      const row = { ...input, id: newId(), createdAt: timestamp, updatedAt: timestamp } as T;
      writeRows(name, [...rows(), row]);
      return row;
    },

    async update(id, patch) {
      await delay(latency);
      const all = rows();
      const index = all.findIndex((r) => r.id === id);
      const existing = all[index];
      if (!existing) throw new NotFoundError(name, id);
      const row = { ...existing, ...patch, id, updatedAt: now().toISOString() } as T;
      all[index] = row;
      writeRows(name, all);
      return row;
    },

    async remove(id) {
      await delay(latency);
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
    list: () => api.get<T[]>(basePath),
    get: (id) => api.get<T>(itemPath(id)).catch(mapNotFound(id)),
    create: (input) => api.post<T>(basePath, { body: input }),
    update: (id, patch) => api.patch<T>(itemPath(id), { body: patch }).catch(mapNotFound(id)),
    remove: (id) => api.delete<void>(itemPath(id)).catch(mapNotFound(id)),
  };
}
