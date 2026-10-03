import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setAuthToken } from '@/lib/api';
import { deferred } from '@/test/deferred';
import type { Task } from '@/types/domain';
import { db, resetDemoData } from './index';
import { PartialWriteError, SessionChangedError } from './errors';
import { buildSeed } from './seed';
import { beginDataSession } from './session-scope';
import { captureWriteSignal, runWriteOperation } from './write-operation';

beforeEach(() => resetDemoData());
afterEach(() => {
  vi.restoreAllMocks();
  setAuthToken(null);
});

describe('session-bound writes', () => {
  it('reports committed changes when a later step fails', async () => {
    const task = buildSeed().tasks[0];
    if (!task) throw new Error('seed missing');
    vi.spyOn(db.activities, 'create').mockRejectedValueOnce(new Error('audit unavailable'));
    const operation = runWriteOperation(beginDataSession(), async (database) => {
      await database.tasks.update(task.id, { title: 'Saved despite audit failure' });
      await database.activities.create({
        entityType: 'lead',
        entityId: 'lead-1',
        kind: 'note',
        message: 'Note',
        actorId: null,
      });
    });
    await expect(operation).rejects.toBeInstanceOf(PartialWriteError);
    expect((await db.tasks.get(task.id)).title).toBe('Saved despite audit failure');
  });

  it('waits for other started writes to settle before reporting a parallel failure', async () => {
    const task = buildSeed().tasks[0];
    if (!task) throw new Error('seed missing');
    const pending = deferred<Task>();
    vi.spyOn(db.tasks, 'update')
      .mockRejectedValueOnce(new Error('first failed'))
      .mockReturnValueOnce(pending.promise);
    let finished = false;
    const operation = runWriteOperation(beginDataSession(), (database) =>
      Promise.all([
        database.tasks.update(task.id, { title: 'first' }),
        database.tasks.update(task.id, { title: 'second' }),
      ]),
    ).catch((error: unknown) => {
      finished = true;
      return error;
    });
    await Promise.resolve();
    await Promise.resolve();
    expect(finished).toBe(false);
    pending.resolve(task);
    expect(await operation).toBeInstanceOf(PartialWriteError);
  });

  it('stops later steps of an old command when the session changes', async () => {
    const task = buildSeed().tasks[0];
    if (!task) throw new Error('seed missing');
    const pending = deferred<Task>();
    vi.spyOn(db.tasks, 'update').mockReturnValueOnce(pending.promise);
    const log = vi.spyOn(db.activities, 'create');
    const operation = runWriteOperation(beginDataSession(), async (database) => {
      await database.tasks.update(task.id, { title: 'old user' });
      await database.activities.create({
        entityType: 'lead',
        entityId: 'lead-1',
        kind: 'note',
        message: 'Old note',
        actorId: null,
      });
    }).catch((error: unknown) => error);
    beginDataSession();
    pending.resolve(task);
    expect(await operation).toBeInstanceOf(SessionChangedError);
    expect(log).not.toHaveBeenCalled();
  });

  it('a command queued before token rotation cannot use the new token', async () => {
    setAuthToken('old-token');
    const signal = captureWriteSignal(beginDataSession());
    setAuthToken('new-token');
    const request = vi.spyOn(db.tasks, 'list');
    await expect(runWriteOperation(signal, (database) => database.tasks.list())).rejects.toThrow(
      'authentication context changed',
    );
    expect(request).not.toHaveBeenCalled();
  });
});
