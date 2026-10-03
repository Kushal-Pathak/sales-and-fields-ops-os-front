import type { BaseEntity } from '@/types/domain';
import { getAuthSignal } from '@/lib/api';
import { db, type Db } from './index';
import type { Collection, CollectionOptions } from './collection';
import { PartialWriteError } from './errors';

export function captureWriteSignal(sessionSignal: AbortSignal): AbortSignal {
  return AbortSignal.any([sessionSignal, getAuthSignal()]);
}

/** Binds every step to the original session and records partial commits for error reporting. */
export async function runWriteOperation<T>(
  signal: AbortSignal,
  operation: (database: Db) => Promise<T>,
): Promise<T> {
  let committed = 0;
  const pending: Promise<unknown>[] = [];
  const options = (input?: CollectionOptions): CollectionOptions => ({
    signal: input?.signal ? AbortSignal.any([signal, input.signal]) : signal,
  });
  function bind<Entity extends BaseEntity>(collection: Collection<Entity>): Collection<Entity> {
    function write<Result>(request: () => Promise<Result>): Promise<Result> {
      signal.throwIfAborted();
      const promise = request().then((result) => {
        committed += 1;
        return result;
      });
      pending.push(promise);
      return promise;
    }
    return {
      list: (input) => {
        signal.throwIfAborted();
        return collection.list(options(input));
      },
      get: (id, input) => {
        signal.throwIfAborted();
        return collection.get(id, options(input));
      },
      create: (input, context) => write(() => collection.create(input, options(context))),
      update: (id, patch, context) => write(() => collection.update(id, patch, options(context))),
      remove: (id, context) => write(() => collection.remove(id, options(context))),
    };
  }
  const database: Db = {
    workspace: bind(db.workspace),
    roles: bind(db.roles),
    users: bind(db.users),
    contacts: bind(db.contacts),
    pipelines: bind(db.pipelines),
    stages: bind(db.stages),
    leads: bind(db.leads),
    tasks: bind(db.tasks),
    appointments: bind(db.appointments),
    quotes: bind(db.quotes),
    activities: bind(db.activities),
    conversations: bind(db.conversations),
    messages: bind(db.messages),
    fields: bind(db.fields),
    automations: bind(db.automations),
    automationRuns: bind(db.automationRuns),
  };
  signal.throwIfAborted();
  try {
    const result = await operation(database);
    signal.throwIfAborted();
    return result;
  } catch (cause) {
    // Promise.all can reject while another write is still finishing. Reconcile after all settle.
    await Promise.allSettled(pending);
    signal.throwIfAborted();
    if (committed > 0) throw new PartialWriteError(cause);
    throw cause;
  }
}
