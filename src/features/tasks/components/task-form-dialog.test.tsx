import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db, resetDemoData } from '@/data';
import { buildSeed } from '@/data/seed';
import { beginDataSession } from '@/data/session-scope';
import { TaskFormDialog } from './task-form-dialog';

beforeEach(() => {
  resetDemoData();
  beginDataSession();
});
afterEach(() => vi.restoreAllMocks());

describe('partial task saves', () => {
  it('explains that the task saved, prevents duplicate submission, and allows closing the form', async () => {
    const user = userEvent.setup();
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const lead = buildSeed().leads[0];
    if (!lead) throw new Error('seed missing');
    const close = vi.fn();
    vi.spyOn(db.activities, 'create').mockRejectedValueOnce(new Error('audit unavailable'));
    render(
      <QueryClientProvider client={client}>
        <TaskFormDialog
          open
          onOpenChange={close}
          defaultLeadId={lead.id}
          defaultTitle="Partially saved task"
        />
      </QueryClientProvider>,
    );
    const submit = await screen.findByRole('button', { name: 'Add task' });
    await user.click(submit);
    expect(await screen.findByRole('alert')).toHaveTextContent('Some changes were saved');
    await waitFor(() => expect(submit).toBeDisabled());
    expect(
      (await db.tasks.list()).filter((task) => task.title === 'Partially saved task'),
    ).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(close).toHaveBeenCalledWith(false);
    client.clear();
  });
});
