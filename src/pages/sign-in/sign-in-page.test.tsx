import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { createMemoryRouter, Outlet, RouterProvider, useLocation } from 'react-router';
import { SessionProvider } from '@/app/providers/session-provider';
import { QueryProvider } from '@/app/providers/query-provider';
import { ThemeProvider } from '@/app/providers/theme-provider';
import { resetDemoData } from '@/data';
import { buildSeed } from '@/data/seed';
import { RequireSession, UserMenu } from '@/features/auth';
import { stubSession } from '@/test/stub-session';
import { SignInPage } from './index';

function Shell() {
  const location = useLocation();
  return (
    <RequireSession>
      <p data-testid="location">{location.pathname + location.search}</p>
      <UserMenu />
      <Outlet />
    </RequireSession>
  );
}

function renderApp(initialEntry: string, userId: string | null) {
  const router = createMemoryRouter(
    [
      { path: '/sign-in', element: <SignInPage /> },
      { path: '/', element: <Shell />, children: [{ path: '*', element: <div /> }] },
    ],
    { initialEntries: [initialEntry] },
  );
  render(
    <ThemeProvider>
      <SessionProvider adapter={stubSession(userId)}>
        <QueryProvider>
          <RouterProvider router={router} />
        </QueryProvider>
      </SessionProvider>
    </ThemeProvider>,
  );
  return { router };
}

const seed = buildSeed();

describe('sign-in', () => {
  beforeEach(() => resetDemoData());

  it('sends a signed-out visitor to sign in and back after choosing a member', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/leads?view=hot', null);
    await waitFor(() => expect(router.state.location.pathname).toBe('/sign-in'));
    expect(await screen.findByRole('heading', { name: /Sign in to/ })).toBeInTheDocument();
    for (const member of seed.users.filter((row) => row.active)) {
      expect(
        await screen.findByRole('button', { name: `Continue as ${member.name}` }),
      ).toBeInTheDocument();
    }
    const inactive = seed.users.find((row) => !row.active)!;
    expect(
      screen.queryByRole('button', { name: `Continue as ${inactive.name}` }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Continue as Diego Alvarez' }));
    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent('/leads?view=hot'),
    );
    expect(
      screen.getByRole('button', { name: 'Account menu for Diego Alvarez' }),
    ).toBeInTheDocument();
  });

  it('signs out from the user menu and guards the app again', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/dashboard', 'usr-1');
    const menu = await screen.findByRole('button', { name: 'Account menu for Jordan Blake' });
    await user.click(menu);
    const dropdown = await screen.findByRole('menu');
    expect(within(dropdown).getByText('jordan.blake@northstar.example')).toBeInTheDocument();
    await user.click(within(dropdown).getByRole('menuitem', { name: 'Sign out' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/sign-in'));
  });
});
