import { beforeEach, describe, expect, it } from 'vitest';
import type { BaseEntity } from '@/types/domain';
import { createLocalCollection } from './collection';
import { NotFoundError } from './errors';
import { ensureSeeded, readRows, resetLocalData, SEED_VERSION } from './local-store';

interface Note extends BaseEntity {
  title: string;
  done?: boolean;
}

function notes(clock: { current: Date }) {
  let counter = 0;
  return createLocalCollection<Note>('notes', {
    latencyMs: 0,
    now: () => clock.current,
    newId: () => `note-${(counter += 1)}`,
  });
}

const seed = () => ({
  notes: [
    {
      id: 'seed-1',
      title: 'Seeded',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ],
});

beforeEach(() => {
  localStorage.clear();
});

describe('createLocalCollection', () => {
  it('creates, reads, updates and removes rows with timestamps', async () => {
    const clock = { current: new Date('2026-09-23T10:00:00Z') };
    const db = notes(clock);

    const created = await db.create({ title: 'First' });
    expect(created).toEqual({
      id: 'note-1',
      title: 'First',
      createdAt: '2026-09-23T10:00:00.000Z',
      updatedAt: '2026-09-23T10:00:00.000Z',
    });
    expect(await db.list()).toHaveLength(1);
    expect(await db.get('note-1')).toEqual(created);

    clock.current = new Date('2026-09-23T11:30:00Z');
    const updated = await db.update('note-1', { done: true });
    expect(updated.done).toBe(true);
    expect(updated.createdAt).toBe(created.createdAt);
    expect(updated.updatedAt).toBe('2026-09-23T11:30:00.000Z');

    await db.remove('note-1');
    expect(await db.list()).toEqual([]);
  });

  it('rejects with NotFoundError for unknown ids', async () => {
    const db = notes({ current: new Date() });
    await expect(db.get('missing')).rejects.toBeInstanceOf(NotFoundError);
    await expect(db.update('missing', { title: 'x' })).rejects.toThrow(
      'notes "missing" was not found',
    );
    await expect(db.remove('missing')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('writes through to localStorage so another instance sees the data', async () => {
    const clock = { current: new Date() };
    await notes(clock).create({ title: 'Persisted' });

    expect(readRows<Note>('notes')?.map((n) => n.title)).toEqual(['Persisted']);
    expect(JSON.parse(localStorage.getItem('pilot-crm:notes') ?? '[]')).toHaveLength(1);
    expect((await notes(clock).list()).map((n) => n.title)).toEqual(['Persisted']);
  });
});

describe('seeding', () => {
  it('seeds once and keeps user changes on later loads', async () => {
    ensureSeeded(seed);
    expect(localStorage.getItem('pilot-crm:seed-version')).toBe(String(SEED_VERSION));
    expect(readRows<Note>('notes')).toHaveLength(1);

    await notes({ current: new Date() }).create({ title: 'Mine' });
    ensureSeeded(seed);
    expect(readRows<Note>('notes')).toHaveLength(2);
  });

  it('reseeds when the stored seed version is stale', () => {
    ensureSeeded(seed);
    localStorage.setItem('pilot-crm:notes', '[]');
    localStorage.setItem('pilot-crm:seed-version', '0');

    ensureSeeded(seed);
    expect(readRows<Note>('notes')).toHaveLength(1);
  });

  it('resetLocalData discards changes and restores the seed', async () => {
    ensureSeeded(seed);
    const db = notes({ current: new Date() });
    await db.create({ title: 'Extra' });
    await db.update('seed-1', { title: 'Renamed' });

    resetLocalData(seed);
    const rows = await db.list();
    expect(rows).toHaveLength(1);
    expect(rows[0]?.title).toBe('Seeded');
  });
});
