import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import type { ReactNode } from 'react';
import { SessionProvider } from '@/app/providers/session-provider';
import { resetDemoData } from '@/data';
import type { SessionAdapter } from '@/data/session';
import { stubSession } from '@/test/stub-session';
import { useCan } from './use-can';

function wrapper(adapter: SessionAdapter) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <SessionProvider adapter={adapter}>{children}</SessionProvider>
    </QueryClientProvider>
  );
}

describe('useCan', () => {
  beforeEach(() => resetDemoData());

  it('grants what the signed-in user’s role holds', async () => {
    const admin = renderHook(() => useCan('quotes.approve'), {
      wrapper: wrapper(stubSession('usr-1')),
    });
    await waitFor(() => expect(admin.result.current).toBe(true));
    const sales = renderHook(() => useCan('quotes.approve'), {
      wrapper: wrapper(stubSession('usr-3')),
    });
    await waitFor(() => expect(sales.result.current).toBe(false));
    const salesEdit = renderHook(() => useCan('leads.edit'), {
      wrapper: wrapper(stubSession('usr-3')),
    });
    await waitFor(() => expect(salesEdit.result.current).toBe(true));
  });

  it('is false while loading and when signed out', async () => {
    const { result } = renderHook(() => useCan('team.manage'), {
      wrapper: wrapper(stubSession(null)),
    });
    expect(result.current).toBe(false);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(result.current).toBe(false);
  });
});
