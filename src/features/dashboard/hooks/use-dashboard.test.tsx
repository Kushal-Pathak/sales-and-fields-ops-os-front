import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db, queryKeys, resetDemoData } from '@/data';
import { buildSeed } from '@/data/seed';
import { fullAccess, seedAccess } from '@/test/access';
import type { Task } from '@/types/domain';
import { useDashboard } from './use-dashboard';

afterEach(() => vi.useRealTimers());

describe('dashboard clock', () => {
  it('updates overdue counts without changing collection data or fetching again', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-03T10:00:00Z'));
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Infinity } },
    });
    const seed = buildSeed();
    const task = seed.tasks[0];
    const me = seed.users.find((user) => user.active);
    if (!task || !me) throw new Error('seed missing');
    const tasks: Task[] = [{ ...task, status: 'pending', dueAt: '2026-10-03T10:00:30Z' }];
    client.setQueryData(queryKeys.tasks.list(), tasks);
    client.setQueryData(queryKeys.leads.list(), seed.leads);
    client.setQueryData(queryKeys.appointments.list(), seed.appointments);
    client.setQueryData(queryKeys.quotes.list(), seed.quotes);
    client.setQueryData(queryKeys.contacts.list(), seed.contacts);
    client.setQueryData(queryKeys.users.list(), seed.users);
    client.setQueryData(queryKeys.stages.list(), seed.stages);
    seedAccess(client, me.id);
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(useDashboard, { wrapper });
    expect(result.current.model?.stats.overdueTasks).toBe(0);
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(result.current.model?.stats.overdueTasks).toBe(1);
    expect(client.getQueryData(queryKeys.tasks.list())).toBe(tasks);
    expect(client.isFetching()).toBe(0);
    client.clear();
  });
});

describe('optional dashboard collections', () => {
  beforeEach(() => resetDemoData());
  afterEach(() => vi.restoreAllMocks());

  it('neither requests, waits for nor shows a module that is closed to the user', async () => {
    // Fresh forever, so the seeded access below is not replaced by the demo workspace's.
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Infinity } },
    });
    const seed = buildSeed();
    const me = seed.users.find((user) => user.active);
    if (!me) throw new Error('seed missing');
    // Quotes are still cached from before the module was switched off.
    client.setQueryData(queryKeys.quotes.list(), seed.quotes);
    seedAccess(
      client,
      me.id,
      fullAccess({ modules: fullAccess().modules.filter((id) => id !== 'quotes') }),
    );
    const quotes = vi.spyOn(db.quotes, 'list');
    const tasks = vi.spyOn(db.tasks, 'list');
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(useDashboard, { wrapper });
    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.model).toBeDefined();
    expect(result.current.model?.stats.quotesPending).toBe(0);
    expect(result.current.model?.quotes.rows).toEqual([]);
    expect(quotes).not.toHaveBeenCalled();
    expect(tasks).toHaveBeenCalled();
    client.clear();
  });
});
