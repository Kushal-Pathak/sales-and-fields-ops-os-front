import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { db, resetDemoData } from '@/data';
import { buildSeed } from '@/data/seed';
import { SignedInAs } from '@/test/session';
import { RolesPage } from './roles';
import { TeamPage } from './index';

function renderAt(path: string, userId?: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter(
    [
      { path: '/team', element: <TeamPage /> },
      { path: '/team/roles', element: <RolesPage /> },
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

describe('TeamPage', () => {
  beforeEach(() => resetDemoData());

  it('lists every member, active ones first', async () => {
    renderAt('/team');
    const rows = await screen.findAllByRole('row', { name: /^Open member/ });
    expect(rows).toHaveLength(seed.users.length);
    const inactive = seed.users.find((user) => !user.active)!;
    expect(rows[rows.length - 1]).toHaveAccessibleName(`Open member ${inactive.name}`);
  });

  it('keeps the team read-only for roles without team.manage', async () => {
    renderAt('/team', 'usr-3');
    expect(await screen.findAllByRole('row', { name: /^Open member/ })).toHaveLength(
      seed.users.length,
    );
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Invite member' })).toBeDisabled(),
    );
    expect(screen.getByRole('note')).toHaveTextContent('ask an admin');
  });

  it('adds a member from the invite dialog', async () => {
    const user = userEvent.setup();
    renderAt('/team');
    await user.click(await screen.findByRole('button', { name: 'Invite member' }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText('Name'), 'Nadia Hussain');
    await user.type(within(dialog).getByLabelText('Email'), 'nadia@northstar.example');
    await user.click(within(dialog).getByRole('button', { name: 'Add member' }));
    await waitFor(async () => {
      expect((await db.users.list()).some((u) => u.email === 'nadia@northstar.example')).toBe(true);
    });
    // The new member's drawer opens (a modal), so check it rather than the now-inert table.
    const drawer = await screen.findByRole('dialog');
    expect(await within(drawer).findByText('Nadia Hussain')).toBeInTheDocument();
  });

  it('rejects a duplicate email', async () => {
    const user = userEvent.setup();
    renderAt('/team');
    await user.click(await screen.findByRole('button', { name: 'Invite member' }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText('Name'), 'Dup');
    await user.type(within(dialog).getByLabelText('Email'), seed.users[1]!.email.toUpperCase());
    await user.click(within(dialog).getByRole('button', { name: 'Add member' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('already exists');
  });

  it('deactivates a member and reassigns their open work', async () => {
    const user = userEvent.setup();
    const member = seed.users.find((u) => u.id === 'usr-3')!;
    const openStages = new Set(seed.stages.filter((s) => s.kind === 'open').map((s) => s.id));
    const affectedLeads = seed.leads.filter(
      (l) => l.ownerId === member.id && openStages.has(l.stageId),
    );
    expect(affectedLeads.length).toBeGreaterThan(0);

    renderAt(`/team?member=${member.id}`);
    const drawer = await screen.findByRole('dialog');
    await user.click(await within(drawer).findByRole('button', { name: 'Deactivate' }));
    const confirm = await screen.findByRole('alertdialog');
    await user.click(within(confirm).getByRole('button', { name: 'Reassign and deactivate' }));

    await waitFor(async () => {
      expect((await db.users.get(member.id)).active).toBe(false);
    });
    const leads = await db.leads.list();
    for (const lead of affectedLeads) {
      expect(leads.find((l) => l.id === lead.id)?.ownerId).not.toBe(member.id);
    }
    expect(await within(drawer).findByRole('button', { name: 'Reactivate' })).toBeInTheDocument();
  });
});

describe('RolesPage', () => {
  beforeEach(() => resetDemoData());

  it('adds a role with chosen permissions', async () => {
    const user = userEvent.setup();
    renderAt('/team/roles');
    await user.click(await screen.findByRole('button', { name: 'Add role' }));
    const drawer = await screen.findByRole('dialog');
    await user.type(await within(drawer).findByLabelText('Role name'), 'Support');
    await user.click(within(drawer).getByRole('switch', { name: 'View all leads' }));
    await user.click(within(drawer).getByRole('button', { name: 'Add role' }));
    await waitFor(async () => {
      const role = (await db.roles.list()).find((r) => r.name === 'Support');
      expect(role?.permissions).toEqual(['leads.view_all']);
    });
    expect(await screen.findByRole('row', { name: 'Open role Support' })).toBeInTheDocument();
  });

  it('will not delete a role that members still have', async () => {
    renderAt('/team/roles?role=role-sales');
    const drawer = await screen.findByRole('dialog');
    expect(await within(drawer).findByRole('button', { name: 'Delete role' })).toBeDisabled();
  });
});
