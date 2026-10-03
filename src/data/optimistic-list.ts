import { hashKey, type QueryClient, type QueryKey } from '@tanstack/react-query';

interface Queue {
  tail: Promise<void>;
  pending: number;
}
const queues = new WeakMap<QueryClient, Map<string, Queue>>();

export function hasPendingListWrite(client: QueryClient, key: QueryKey): boolean {
  return (queues.get(client)?.get(hashKey(key))?.pending ?? 0) > 0;
}

/** Serializes optimism, rollback and reconciliation across every observer of this list. */
export async function beginOptimisticListUpdate<T extends { id: string }>(
  client: QueryClient,
  key: QueryKey,
  update: (rows: T[]) => T[],
  signal?: AbortSignal,
) {
  let clientQueues = queues.get(client);
  if (!clientQueues) {
    clientQueues = new Map();
    queues.set(client, clientQueues);
  }
  const hash = hashKey(key);
  const queue = clientQueues.get(hash) ?? { tail: Promise.resolve(), pending: 0 };
  const previousTail = queue.tail;
  let openGate = () => {};
  const gate = new Promise<void>((resolve) => {
    openGate = resolve;
  });
  queue.tail = previousTail.then(() => gate);
  queue.pending += 1;
  clientQueues.set(hash, queue);
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    queue.pending -= 1;
    if (queue.pending === 0) clientQueues.delete(hash);
    openGate();
  };
  try {
    await previousTail;
    signal?.throwIfAborted();
    await client.cancelQueries({ queryKey: key, exact: true });
    signal?.throwIfAborted();
    const previous = client.getQueryData<T[]>(key);
    client.setQueryData<T[]>(key, (rows) => (rows ? update(rows) : rows));
    const optimistic = new Map(client.getQueryData<T[]>(key)?.map((row) => [row.id, row]));
    const rollback = () => {
      if (!previous) return;
      const before = new Map(previous.map((row) => [row.id, row]));
      // Keep rows changed by another writer or a newer authoritative response.
      client.setQueryData<T[]>(key, (rows) =>
        rows?.map((row) => (row === optimistic.get(row.id) ? (before.get(row.id) ?? row) : row)),
      );
    };
    return { rollback, release };
  } catch (error) {
    release();
    throw error;
  }
}
