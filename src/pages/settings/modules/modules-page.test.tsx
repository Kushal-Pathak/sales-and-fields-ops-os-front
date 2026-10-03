import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { db, resetDemoData } from '@/data';
import { SignedInAs } from '@/test/session';
import { ModulesSettingsPage } from './index';

function renderPage(userId: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter(
    [{ path: '/settings/modules', element: <ModulesSettingsPage /> }],
    { initialEntries: ['/settings/modules'] },
  );
  render(
    <QueryClientProvider client={queryClient}>
      <SignedInAs userId={userId}>
        <RouterProvider router={router} />
      </SignedInAs>
    </QueryClientProvider>,
  );
}

const inbox = async () => (await db.workspace.list())[0]!.modules.find((m) => m.id === 'inbox')!;

describe('ModulesSettingsPage', () => {
  beforeEach(() => resetDemoData());

  it('lets an admin switch a configurable module off and back on, keeping core modules locked', async () => {
    const user = userEvent.setup();
    renderPage('usr-1');
    const toggle = await screen.findByRole('switch', { name: 'Inbox module' });
    // The switch primitive is not a native control: it reports `aria-disabled`.
    await waitFor(() => expect(toggle).not.toHaveAttribute('aria-disabled', 'true'));
    expect(toggle).toBeChecked();
    expect(screen.getByRole('switch', { name: 'Leads module' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );

    await user.click(toggle);
    await waitFor(async () => expect((await inbox()).enabled).toBe(false));
    await waitFor(() =>
      expect(screen.getByRole('switch', { name: 'Inbox module' })).not.toBeChecked(),
    );

    await user.click(screen.getByRole('switch', { name: 'Inbox module' }));
    await waitFor(async () => expect((await inbox()).enabled).toBe(true));
  });

  it('shows the modules read-only to a role without modules.manage', async () => {
    renderPage('usr-3');
    const toggle = await screen.findByRole('switch', { name: 'Inbox module' });
    expect(toggle).toBeChecked();
    expect(toggle).toHaveAttribute('aria-disabled', 'true');
    expect(await screen.findByRole('note')).toHaveTextContent('ask an admin');
  });
});
