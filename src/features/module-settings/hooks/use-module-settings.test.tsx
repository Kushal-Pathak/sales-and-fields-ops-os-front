import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { db, queryKeys, resetDemoData } from '@/data';
import { beginDataSession } from '@/data/session-scope';
import { useSetModuleEnabled } from './use-module-settings';

beforeEach(() => {
  resetDemoData();
  beginDataSession();
});

describe('workspace module changes', () => {
  it('preserves both changes from concurrent mutation observers', async () => {
    const client = new QueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const before = (await db.workspace.list())[0]!;
    client.setQueryData(queryKeys.workspace.list(), [before]);
    const { result } = renderHook(() => ({ a: useSetModuleEnabled(), b: useSetModuleEnabled() }), {
      wrapper,
    });
    await act(async () => {
      await Promise.all([
        result.current.a.mutateAsync({ id: 'quotes', enabled: false }),
        result.current.b.mutateAsync({ id: 'tasks', enabled: false }),
      ]);
    });
    const after = (await db.workspace.list())[0]!;
    expect(after.modules.filter((module) => !module.enabled).map((module) => module.id)).toEqual([
      'quotes',
      'tasks',
    ]);
    expect(
      after.modules.filter((module) => module.id !== 'quotes' && module.id !== 'tasks'),
    ).toEqual(before.modules.filter((module) => module.id !== 'quotes' && module.id !== 'tasks'));
    client.clear();
  });
});
