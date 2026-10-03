import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db, queryKeys, resetDemoData } from '@/data';
import { demoAccess } from '@/data/access';
import { buildSeed } from '@/data/seed';
import { SignedInAs } from '@/test/session';
import { useCan } from '../hooks/use-can';
import { useModule } from '../hooks/use-module';
import { RequireAccess } from './require-access';

const seed = buildSeed();

function Probe() {
  const quotes = useModule('quotes');
  const canManage = useCan('modules.manage');
  return (
    <p data-testid="probe">
      quotes:{quotes.status} manage:{String(canManage)}
    </p>
  );
}

function renderGuard(userId: string, children: ReactNode = <Probe />) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <SignedInAs userId={userId}>
        <RequireAccess>{children}</RequireAccess>
      </SignedInAs>
    </QueryClientProvider>,
  );
  return client;
}

async function switchOff(id: 'quotes' | 'inbox') {
  const workspace = (await db.workspace.list())[0]!;
  await db.workspace.update(workspace.id, {
    modules: workspace.modules.map((module) =>
      module.id === id ? { ...module, enabled: false } : module,
    ),
  });
}

describe('RequireAccess', () => {
  beforeEach(() => resetDemoData());
  afterEach(() => vi.restoreAllMocks());

  it('renders nothing of the app until access is known, then resolved access', async () => {
    renderGuard('usr-1');
    expect(screen.queryByTestId('probe')).not.toBeInTheDocument();
    expect(await screen.findByTestId('probe')).toHaveTextContent('quotes:allowed manage:true');
  });

  it('shows an error with Retry when access cannot be loaded, and never the app', async () => {
    const user = userEvent.setup();
    vi.spyOn(demoAccess, 'load').mockRejectedValueOnce(new Error('network down'));
    renderGuard('usr-1');
    expect(await screen.findByText('Your access could not be loaded')).toBeInTheDocument();
    expect(screen.queryByTestId('probe')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByTestId('probe')).toHaveTextContent('quotes:allowed');
  });

  it('resolves a role’s own permissions, not an admin’s', async () => {
    renderGuard('usr-3');
    expect(await screen.findByTestId('probe')).toHaveTextContent('quotes:allowed manage:false');
  });

  it('closes a module and drops its cached rows when access is revoked', async () => {
    const client = renderGuard('usr-1');
    await screen.findByTestId('probe');
    client.setQueryData(queryKeys.quotes.list(), seed.quotes);
    client.setQueryData(queryKeys.tasks.list(), seed.tasks);

    await switchOff('quotes');
    await client.invalidateQueries({ queryKey: queryKeys.access.all });

    await waitFor(() => expect(screen.getByTestId('probe')).toHaveTextContent('quotes:denied'));
    await waitFor(() => expect(client.getQueryData(queryKeys.quotes.list())).toBeUndefined());
    expect(client.getQueryData(queryKeys.tasks.list())).toEqual(seed.tasks);
  });

  it('keeps the last known access when a later refresh fails', async () => {
    const client = renderGuard('usr-1');
    await screen.findByTestId('probe');
    vi.spyOn(demoAccess, 'load').mockRejectedValue(new Error('network down'));
    await client.invalidateQueries({ queryKey: queryKeys.access.all });
    expect(screen.getByTestId('probe')).toHaveTextContent('quotes:allowed manage:true');
    expect(screen.queryByText('Your access could not be loaded')).not.toBeInTheDocument();
  });
});
