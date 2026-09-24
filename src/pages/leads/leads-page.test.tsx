import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { db, resetDemoData } from '@/data';
import { buildSeed } from '@/data/seed';
import { LeadsPage } from './index';

/**
 * Renders the real page against the local demo store (0ms latency in test mode)
 * so the query hooks, URL state, table and drawer are exercised together.
 */
function renderLeadsPage(initialEntry = '/leads') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter([{ path: '/leads', element: <LeadsPage /> }], {
    initialEntries: [initialEntry],
  });
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { router };
}

const seed = buildSeed();
const firstLead = seed.leads[0]!;
const firstContact = seed.contacts.find((contact) => contact.id === firstLead.contactId)!;

describe('LeadsPage', () => {
  beforeEach(() => {
    resetDemoData();
  });

  it('lists the seeded leads with their contacts and stages', async () => {
    renderLeadsPage();
    expect(await screen.findByText(`${seed.leads.length} leads`)).toBeInTheDocument();
    const rows = screen.getAllByRole('row', { name: /^Open lead/ });
    expect(rows).toHaveLength(seed.leads.length);
    expect(screen.getAllByText(firstContact.name).length).toBeGreaterThan(0);
  });

  it('narrows to the Won view from the URL and keeps counts on the tabs', async () => {
    renderLeadsPage('/leads?view=won');
    const won = seed.leads.filter((lead) => lead.stageId === 'stg-won');
    expect(await screen.findByText(`${seed.leads.length} leads`)).toBeInTheDocument();
    expect(screen.getAllByRole('row', { name: /^Open lead/ })).toHaveLength(won.length);
    expect(screen.getByRole('tab', { name: /^Won/ })).toHaveTextContent(String(won.length));
  });

  it('opens the drawer from a row and puts the lead id in the URL', async () => {
    const user = userEvent.setup();
    const { router } = renderLeadsPage();
    const row = await screen.findByRole('row', {
      name: `Open lead ${firstLead.title} for ${firstContact.name}`,
    });
    await user.click(row);

    await waitFor(() => expect(router.state.location.search).toContain(`lead=${firstLead.id}`));
    const dialog = await screen.findByRole('dialog');
    expect(await within(dialog).findByText(firstLead.title, { exact: false })).toBeInTheDocument();
  });

  it('shows custom field values in the overview and asks for them in the form', async () => {
    const user = userEvent.setup();
    renderLeadsPage(`/leads?lead=${firstLead.id}`);
    const dialog = await screen.findByRole('dialog');
    expect(await within(dialog).findByText('Decision timeline')).toBeInTheDocument();
    expect(within(dialog).getByText('This quarter')).toBeInTheDocument();
    expect(within(dialog).getByText('Dental association newsletter')).toBeInTheDocument();
    expect(within(dialog).getByText('Preferred contact time')).toBeInTheDocument();

    await user.click(within(dialog).getAllByRole('button', { name: 'Edit' })[0]!);
    const form = await screen.findByRole('dialog', { name: 'Edit lead' });
    const referred = within(form).getByLabelText('Referred by');
    expect(referred).toHaveValue('Dental association newsletter');
    await user.clear(referred);
    await user.type(referred, 'Conference');
    await user.click(within(form).getByRole('button', { name: 'Save changes' }));
    await waitFor(async () => {
      expect((await db.leads.get(firstLead.id)).custom?.referredBy).toBe('Conference');
    });
  });

  it('adds a note to the activity tab', async () => {
    const user = userEvent.setup();
    renderLeadsPage(`/leads?lead=${firstLead.id}`);
    const dialog = await screen.findByRole('dialog');
    await user.click(await within(dialog).findByRole('tab', { name: 'Activity' }));
    await user.type(within(dialog).getByLabelText('Add a note'), 'Called and left a voicemail');
    await user.click(within(dialog).getByRole('button', { name: 'Add note' }));

    expect(await within(dialog).findByText('Called and left a voicemail')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Add a note')).toHaveValue('');
  });
});
