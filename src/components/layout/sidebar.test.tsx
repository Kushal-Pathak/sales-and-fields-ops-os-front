import { useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { CommandPaletteProvider } from '@/app/providers/command-palette-provider';
import { ThemeProvider } from '@/app/providers/theme-provider';
import { TooltipProvider } from '@/components/ui/tooltip';
import { resetDemoData } from '@/data';
import { buildSeed } from '@/data/seed';
import { env } from '@/lib/env';
import { SignedInAs } from '@/test/session';
import { Sidebar } from './sidebar';
import { TopBar } from './top-bar';

const me = buildSeed().users.find((user) => user.active)!;

function CollapsibleSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <>
      <Sidebar id="desktop-navigation" collapsed={collapsed} />
      <TopBar
        sidebarCollapsed={collapsed}
        onToggleSidebar={() => setCollapsed((current) => !current)}
      />
    </>
  );
}

function renderSidebar(element: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter([{ path: '*', element, handle: { title: 'Leads' } }], {
    initialEntries: ['/leads'],
  });
  render(
    <QueryClientProvider client={queryClient}>
      <SignedInAs userId={me.id}>
        <ThemeProvider>
          <CommandPaletteProvider>
            <TooltipProvider>
              <RouterProvider router={router} />
            </TooltipProvider>
          </CommandPaletteProvider>
        </ThemeProvider>
      </SignedInAs>
    </QueryClientProvider>,
  );
}

describe('Sidebar', () => {
  beforeEach(() => resetDemoData());

  it('collapses to an icon rail whose links keep their names and show them on hover', async () => {
    const user = userEvent.setup();
    renderSidebar(<CollapsibleSidebar />);
    expect(screen.getByText(env.appName)).toBeVisible();
    // Navigation appears once the user's access is known.
    expect(await screen.findByText('Sales')).toBeVisible();

    const toggle = screen.getByRole('button', { name: 'Collapse sidebar' });
    expect(toggle.closest('header')).toBeInTheDocument();
    expect(toggle.closest('aside')).toBeNull();
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(toggle).toHaveAttribute('aria-controls', 'desktop-navigation');
    await user.click(toggle);

    expect(screen.getByRole('button', { name: 'Expand sidebar' })).toBe(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveFocus();

    expect(screen.queryByText(env.appName)).not.toBeInTheDocument();
    expect(screen.getByText('Sales').parentElement).toHaveClass('h-0');
    const leads = screen.getByRole('link', { name: 'Leads' });
    expect(leads).toHaveAttribute('aria-current', 'page');
    expect(leads).toHaveClass('bg-sidebar-accent');
    expect(
      await screen.findByRole('button', { name: `Account menu for ${me.name}` }),
    ).toBeVisible();
    expect(screen.queryByText(me.name)).not.toBeInTheDocument();

    await user.hover(screen.getByRole('link', { name: 'Pipeline' }));
    expect(
      await screen.findByText('Pipeline', { selector: '[data-slot=tooltip-content]' }),
    ).toBeInTheDocument();

    await user.keyboard('{Enter}');
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(env.appName)).toBeVisible();
  });

  it('keeps the mobile sheet navigation separate from the desktop toggle', async () => {
    renderSidebar(<Sidebar />);
    expect(await screen.findByRole('link', { name: 'Leads' })).toBeVisible();
    expect(screen.queryByRole('button', { name: /sidebar/ })).not.toBeInTheDocument();
  });
});
