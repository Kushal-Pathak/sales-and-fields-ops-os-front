import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, expect, it, vi } from 'vitest';
import { db, queryKeys, resetDemoData } from '@/data';
import { buildSeed } from '@/data/seed';
import { beginDataSession } from '@/data/session-scope';
import { QuoteBuilder } from './quote-builder';

afterEach(() => vi.restoreAllMocks());

it('preserves an edited draft across a failed background refresh and retry', async () => {
  resetDemoData();
  beginDataSession();
  const user = userEvent.setup();
  const seed = buildSeed();
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  for (const name of ['workspace', 'users', 'leads', 'contacts', 'stages'] as const) {
    client.setQueryData(queryKeys[name].list(), seed[name]);
  }
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <QuoteBuilder />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  const notes = await screen.findByLabelText('Notes');
  await user.type(notes, 'Keep this unsaved draft');
  const refresh = vi
    .spyOn(db.workspace, 'list')
    .mockRejectedValue(new Error('temporarily offline'));
  await act(async () => {
    await client.invalidateQueries({ queryKey: queryKeys.workspace.all });
  });
  expect(await screen.findByRole('status')).toHaveTextContent('Showing previously loaded data');
  expect(screen.getByLabelText('Notes')).toBe(notes);
  expect(notes).toHaveValue('Keep this unsaved draft');
  refresh.mockResolvedValue(seed.workspace);
  await user.click(screen.getByRole('button', { name: 'Retry' }));
  await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());
  expect(notes).toHaveValue('Keep this unsaved draft');
  client.clear();
});
