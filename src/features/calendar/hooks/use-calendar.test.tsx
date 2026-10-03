import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db, resetDemoData } from '@/data';
import { useCalendar } from './use-calendar';

beforeEach(() => resetDemoData());
afterEach(() => vi.restoreAllMocks());

describe('optional calendar collections', () => {
  it('renders appointments without requesting or waiting for disabled tasks', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const tasks = vi.spyOn(db.tasks, 'list');
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const { result, rerender } = renderHook(
      ({ showTasks }) => useCalendar({ showTasks, assigneeId: null }),
      { wrapper, initialProps: { showTasks: false } },
    );
    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.events).toBeDefined();
    expect(tasks).not.toHaveBeenCalled();
    rerender({ showTasks: true });
    await waitFor(() => expect(tasks).toHaveBeenCalledOnce());
    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.events).toBeDefined();
    client.clear();
  });
});
