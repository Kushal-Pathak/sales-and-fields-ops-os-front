import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { db, resetDemoData } from '@/data';
import { buildSeed } from '@/data/seed';
import { InboxPage } from './index';

function renderAt(path = '/inbox') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter([{ path: '/inbox', element: <InboxPage /> }], {
    initialEntries: [path],
  });
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { router };
}

const seed = buildSeed();
const me = seed.users.find((user) => user.active)!;
const contactOf = (contactId: string) => seed.contacts.find((c) => c.id === contactId)!;
const unreadConversation = seed.conversations.find((c) => c.unreadCount > 0)!;
const unreadName = contactOf(unreadConversation.contactId).name;

describe('InboxPage', () => {
  beforeEach(() => resetDemoData());

  it('lists every conversation with unread counts on the tabs', async () => {
    renderAt();
    const rows = await screen.findAllByRole('button', { name: /^Open conversation with/ });
    expect(rows).toHaveLength(seed.conversations.length);
    const unread = seed.conversations.filter((c) => c.unreadCount > 0).length;
    expect(screen.getByRole('tab', { name: /^Unread/ })).toHaveTextContent(String(unread));
    expect(screen.getByLabelText(`${unreadConversation.unreadCount} unread`)).toBeInTheDocument();
  });

  it('opens a thread, clears its unread badge and sends a reply that is logged on the lead', async () => {
    const user = userEvent.setup();
    const { router } = renderAt();
    await user.click(
      await screen.findByRole('button', { name: `Open conversation with ${unreadName}` }),
    );
    await waitFor(() =>
      expect(router.state.location.search).toContain(`c=${unreadConversation.id}`),
    );
    await waitFor(async () => {
      expect((await db.conversations.get(unreadConversation.id)).unreadCount).toBe(0);
    });
    expect(
      screen.queryByLabelText(`${unreadConversation.unreadCount} unread`),
    ).not.toBeInTheDocument();

    const log = await screen.findByRole('log');
    const seededMessages = seed.messages.filter((m) => m.conversationId === unreadConversation.id);
    expect(within(log).getByText(seededMessages[0]!.body)).toBeInTheDocument();

    await user.type(screen.getByLabelText('Message'), 'Sure, sending the pricing now.');
    await user.click(screen.getByRole('button', { name: 'Send' }));
    expect(await within(log).findByText('Sure, sending the pricing now.')).toBeInTheDocument();
    expect(within(log).getByText('Awaiting their reply')).toBeInTheDocument();

    const messages = await db.messages.list();
    const sent = messages.find((m) => m.body === 'Sure, sending the pricing now.')!;
    expect(sent.direction).toBe('outbound');
    expect((await db.conversations.get(unreadConversation.id)).lastMessageAt).toBe(sent.sentAt);
    const activities = await db.activities.list();
    expect(
      activities.some(
        (a) =>
          a.entityId === unreadConversation.leadId &&
          a.kind === 'message' &&
          a.message.includes('Sure, sending the pricing now.') &&
          a.actorId === me.id,
      ),
    ).toBe(true);
  });

  it('inserts a quick reply with the contact’s first name', async () => {
    const user = userEvent.setup();
    renderAt(`/inbox?c=${unreadConversation.id}`);
    await user.click(await screen.findByRole('button', { name: /Quick reply/ }));
    await user.click(await screen.findByRole('menuitem', { name: 'Greeting' }));
    const firstName = unreadName.split(' ')[0];
    expect(screen.getByLabelText('Message')).toHaveValue(
      `Hi ${firstName}, thanks for getting in touch with us. How can we help?`,
    );
  });

  it('starts a conversation for a lead from the new message dialog', async () => {
    const user = userEvent.setup();
    const lead = seed.leads.find((l) => !seed.conversations.some((c) => c.leadId === l.id))!;
    const { router } = renderAt();
    await user.click((await screen.findAllByRole('button', { name: 'New message' }))[0]!);
    const dialog = await screen.findByRole('dialog');
    const picker = within(dialog).getByLabelText('Lead');
    await user.type(picker, contactOf(lead.contactId).name);
    await user.click(await screen.findByRole('option', { name: new RegExp(lead.title) }));
    await user.type(within(dialog).getByLabelText('Message'), 'Hello from Pilot CRM');
    await user.click(within(dialog).getByRole('button', { name: 'Send' }));

    await waitFor(async () => {
      expect((await db.conversations.list()).some((c) => c.leadId === lead.id)).toBe(true);
    });
    const created = (await db.conversations.list()).find((c) => c.leadId === lead.id)!;
    expect(created.contactId).toBe(lead.contactId);
    expect(created.channel).toBe('whatsapp');
    await waitFor(() => expect(router.state.location.search).toContain(`c=${created.id}`));
    expect((await db.messages.list()).some((m) => m.conversationId === created.id)).toBe(true);
  });

  it('narrows to my leads', async () => {
    renderAt('/inbox?view=mine');
    const mine = seed.conversations.filter(
      (c) => seed.leads.find((l) => l.id === c.leadId)?.ownerId === me.id,
    );
    expect(mine.length).toBeGreaterThan(0);
    const rows = await screen.findAllByRole('button', { name: /^Open conversation with/ });
    expect(rows).toHaveLength(mine.length);
  });
});
