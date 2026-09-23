import type { BaseEntity } from '@/types/domain';

/**
 * Persistence for the local (demo) data source: one localStorage key per collection.
 * Falls back to memory when storage is unavailable (private mode, blocked).
 * Bump `SEED_VERSION` whenever the seed changes shape; stored data is then replaced.
 */
const PREFIX = 'pilot-crm:';
const VERSION_KEY = `${PREFIX}seed-version`;
export const SEED_VERSION = 1;

export type SeedData = Record<string, BaseEntity[]>;

const memory = new Map<string, string>();

function storage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

function read(key: string): string | null {
  const store = storage();
  if (store) {
    try {
      return store.getItem(key);
    } catch {
      // fall through to memory
    }
  }
  return memory.get(key) ?? null;
}

function write(key: string, value: string): void {
  memory.set(key, value);
  try {
    storage()?.setItem(key, value);
  } catch {
    // Quota exceeded or blocked: the memory copy still serves this session.
  }
}

function remove(key: string): void {
  memory.delete(key);
  try {
    storage()?.removeItem(key);
  } catch {
    // ignore
  }
}

export function readRows<T extends BaseEntity>(collection: string): T[] | null {
  const raw = read(PREFIX + collection);
  if (raw === null) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : null;
  } catch {
    return null;
  }
}

export function writeRows<T extends BaseEntity>(collection: string, rows: T[]): void {
  write(PREFIX + collection, JSON.stringify(rows));
}

/** Writes the seed when nothing is stored yet or the stored seed version is stale. */
export function ensureSeeded(buildSeed: () => SeedData): void {
  if (read(VERSION_KEY) === String(SEED_VERSION)) return;
  replaceAll(buildSeed());
}

/** Discards all stored rows and writes a fresh seed. */
export function resetLocalData(buildSeed: () => SeedData): void {
  replaceAll(buildSeed());
}

function replaceAll(seed: SeedData): void {
  for (const key of knownKeys()) remove(key);
  for (const [collection, rows] of Object.entries(seed)) writeRows(collection, rows);
  write(VERSION_KEY, String(SEED_VERSION));
}

function knownKeys(): string[] {
  const keys = new Set<string>(memory.keys());
  const store = storage();
  if (store) {
    for (let i = 0; i < store.length; i += 1) {
      const key = store.key(i);
      if (key?.startsWith(PREFIX)) keys.add(key);
    }
  }
  return [...keys].filter((key) => key.startsWith(PREFIX));
}
