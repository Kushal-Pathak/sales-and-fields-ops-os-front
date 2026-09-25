import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { db, resetDemoData } from '@/data';
import { buildSeed } from '@/data/seed';
import { SignedInAs } from '@/test/session';
import { quoteTotals } from '@/types/domain';
import { EditQuotePage } from './edit';
import { NewQuotePage } from './new';
import { QuotesPage } from './index';

function renderAt(path: string, userId?: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter(
    [
      { path: '/quotes', element: <QuotesPage /> },
      { path: '/quotes/new', element: <NewQuotePage /> },
      { path: '/quotes/:id/edit', element: <EditQuotePage /> },
    ],
    { initialEntries: [path] },
  );
  const tree = <RouterProvider router={router} />;
  render(
    <QueryClientProvider client={queryClient}>
      {userId ? <SignedInAs userId={userId}>{tree}</SignedInAs> : tree}
    </QueryClientProvider>,
  );
  return { router };
}

const seed = buildSeed();
const me = seed.users.find((user) => user.active)!;

describe('QuotesPage', () => {
  beforeEach(() => resetDemoData());

  it('lists every quote with counts on the views', async () => {
    renderAt('/quotes');
    expect(await screen.findByText(`${seed.quotes.length} quotes`)).toBeInTheDocument();
    expect(screen.getAllByRole('row', { name: /^Open quote/ })).toHaveLength(seed.quotes.length);
    const pending = seed.quotes.filter((quote) => quote.status === 'pending_approval').length;
    expect(screen.getByRole('tab', { name: /^Pending/ })).toHaveTextContent(String(pending));
  });

  it('narrows to a view from the URL', async () => {
    renderAt('/quotes?view=draft');
    const drafts = seed.quotes.filter((quote) => quote.status === 'draft');
    const rows = await screen.findAllByRole('row', { name: /^Open quote/ });
    expect(rows).toHaveLength(drafts.length);
  });

  it('approves then sends a quote from the drawer, logging it on the lead', async () => {
    const user = userEvent.setup();
    const quote = seed.quotes.find((item) => item.status === 'pending_approval')!;
    renderAt(`/quotes?quote=${quote.id}`);
    const drawer = await screen.findByRole('dialog');
    expect(await within(drawer).findByText(quote.number)).toBeInTheDocument();

    await user.click(await within(drawer).findByRole('button', { name: 'Approve' }));
    await user.click(await within(drawer).findByRole('button', { name: 'Send to customer' }));
    await waitFor(async () => {
      expect((await db.quotes.get(quote.id)).status).toBe('sent');
    });
    const sent = await db.quotes.get(quote.id);
    expect(sent.sentAt).toBeDefined();
    const activities = await db.activities.list();
    expect(
      activities.some(
        (activity) =>
          activity.entityType === 'lead' &&
          activity.entityId === quote.leadId &&
          activity.kind === 'quote_sent' &&
          activity.actorId === me.id,
      ),
    ).toBe(true);
    expect(
      await within(drawer).findByRole('button', { name: 'Mark accepted' }),
    ).toBeInTheDocument();
  });

  it('hides approval actions from roles without the permission', async () => {
    const quote = seed.quotes.find((item) => item.status === 'pending_approval')!;
    renderAt(`/quotes?quote=${quote.id}`, 'usr-3');
    const drawer = await screen.findByRole('dialog');
    expect(await within(drawer).findByText(quote.number)).toBeInTheDocument();
    await waitFor(() =>
      expect(within(drawer).queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument(),
    );
    expect(within(drawer).queryByRole('button', { name: 'Reject' })).not.toBeInTheDocument();
  });

  it('returns a rejected quote to draft so it can be edited', async () => {
    const user = userEvent.setup();
    const quote = seed.quotes.find((item) => item.status === 'rejected')!;
    renderAt(`/quotes?quote=${quote.id}`);
    const drawer = await screen.findByRole('dialog');
    expect(within(drawer).queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    await user.click(await within(drawer).findByRole('button', { name: 'Ask revision' }));
    expect(await within(drawer).findByRole('button', { name: 'Edit' })).toHaveAttribute(
      'href',
      `/quotes/${quote.id}/edit`,
    );
  });

  it('deletes a quote from the drawer menu', async () => {
    const user = userEvent.setup();
    const quote = seed.quotes.find((item) => item.status === 'draft')!;
    renderAt(`/quotes?quote=${quote.id}`);
    const drawer = await screen.findByRole('dialog');
    await user.click(await within(drawer).findByRole('button', { name: 'More actions' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Delete quote' }));
    await user.click(await screen.findByRole('button', { name: 'Delete' }));
    await waitFor(async () => {
      expect((await db.quotes.list()).some((item) => item.id === quote.id)).toBe(false);
    });
  });
});

describe('Quote builder', () => {
  beforeEach(() => resetDemoData());

  it('creates a draft with line items and lands in its drawer', async () => {
    const user = userEvent.setup();
    const lead = seed.leads[0]!;
    const { router } = renderAt(`/quotes/new?lead=${lead.id}`);
    const form = await screen.findByRole('form', { name: 'New quote' });

    await user.type(within(form).getByLabelText('Description, line 1'), 'Discovery workshop');
    await user.clear(within(form).getByLabelText('Quantity, line 1'));
    await user.type(within(form).getByLabelText('Quantity, line 1'), '2');
    await user.type(within(form).getByLabelText('Unit price, line 1'), '500');
    await user.click(within(form).getByRole('button', { name: 'Add line item' }));
    await user.type(within(form).getByLabelText('Description, line 2'), 'Build');
    await user.type(within(form).getByLabelText('Unit price, line 2'), '4000');
    await user.click(within(form).getByRole('button', { name: 'Save draft' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/quotes'));
    const created = (await db.quotes.list()).find((quote) => quote.leadId === lead.id)!;
    expect(created.status).toBe('draft');
    expect(created.number).toBe('Q-1050');
    expect(created.contactId).toBe(lead.contactId);
    expect(created.createdById).toBe(me.id);
    expect(created.items.map((item) => item.description)).toEqual(['Discovery workshop', 'Build']);
    expect(quoteTotals(created).subtotal).toBe(5000);
    expect(router.state.location.search).toBe(`?quote=${created.id}`);
  });

  it('refuses to save without a lead or items', async () => {
    const user = userEvent.setup();
    renderAt('/quotes/new');
    const form = await screen.findByRole('form', { name: 'New quote' });
    await user.click(within(form).getByRole('button', { name: 'Save draft' }));
    expect(await within(form).findByText('Choose the lead this quote is for.')).toBeInTheDocument();
    expect(within(form).getByText('Add at least one line item.')).toBeInTheDocument();
    expect(await db.quotes.list()).toHaveLength(seed.quotes.length);
  });

  it('will not edit a quote that has left draft', async () => {
    const quote = seed.quotes.find((item) => item.status === 'sent')!;
    renderAt(`/quotes/${quote.id}/edit`);
    expect(await screen.findByText(`${quote.number} can no longer be edited`)).toBeInTheDocument();
  });

  it('edits a draft and submits it for approval', async () => {
    const user = userEvent.setup();
    const quote = seed.quotes.find((item) => item.status === 'draft')!;
    const { router } = renderAt(`/quotes/${quote.id}/edit`);
    const form = await screen.findByRole('form', { name: `Edit ${quote.number}` });
    await user.clear(within(form).getByLabelText('Discount %'));
    await user.type(within(form).getByLabelText('Discount %'), '12');
    await user.click(within(form).getByRole('button', { name: 'Save and submit for approval' }));

    await waitFor(() => expect(router.state.location.search).toBe(`?quote=${quote.id}`));
    const saved = await db.quotes.get(quote.id);
    expect(saved.discountPct).toBe(12);
    expect(saved.status).toBe('pending_approval');
  });
});
