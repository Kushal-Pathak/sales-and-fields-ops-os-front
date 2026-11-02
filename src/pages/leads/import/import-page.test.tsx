import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { db, resetDemoData } from '@/data';
import { buildSeed } from '@/data/seed';
import { env } from '@/lib/env';
import { ImportLeadsPage } from './index';

function renderWizard() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter([{ path: '/leads/import', element: <ImportLeadsPage /> }], {
    initialEntries: ['/leads/import'],
  });
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { router };
}

const seed = buildSeed();
const existing = seed.contacts[2]!;
const me = seed.users.find((user) => user.active)!;

const PASTED = [
  'Full name\tEmail\tPhone\tCompany\tRequirement\tBudget\tPriority',
  'Ada Lovelace\tada@analytical.example\t+1 555 0100\tAnalytical Engines\tWebsite refresh\t12000\thigh',
  `Existing Person\t${existing.email!.toUpperCase()}\t\tNew Co\tSecond project\t900\tlow`,
  '\tnobody@example.com\t\t\t\t\t',
  'Grace Hopper\tgrace@compiler.example\t+1 555 0101\tCompiler Co.\t\tlots\tmedium',
].join('\n');

describe('Import wizard', () => {
  beforeEach(() => resetDemoData());

  it('imports pasted rows end to end', async () => {
    const user = userEvent.setup();
    renderWizard();

    // Step 1: paste rows.
    await user.click(await screen.findByRole('tab', { name: 'Paste rows' }));
    await user.click(screen.getByLabelText('Pasted rows'));
    await user.paste(PASTED);
    await user.click(screen.getByRole('button', { name: 'Use these rows' }));
    expect(await screen.findByText('4 rows · 7 columns')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Continue/ }));

    // Step 2: mapping guessed from the headers.
    expect(await screen.findByRole('heading', { name: 'Map columns' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Column for Contact name' })).toHaveTextContent(
      'Full name',
    );
    expect(screen.getByRole('combobox', { name: 'Column for Lead title' })).toHaveTextContent(
      'Requirement',
    );
    expect(screen.getByRole('combobox', { name: 'Column for Value' })).toHaveTextContent('Budget');
    await user.click(screen.getByRole('button', { name: /Continue/ }));

    // Step 3: validation and duplicates.
    expect(await screen.findByRole('heading', { name: 'Check the rows' })).toBeInTheDocument();
    expect(screen.getByText('Missing contact name')).toBeInTheDocument();
    expect(screen.getByText('Value “lots” is not a number; left empty')).toBeInTheDocument();
    expect(screen.getByText(`Rows already in ${env.appName} · 1`)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Continue/ }));

    // Step 4: settings with a follow-up task, then start.
    expect(await screen.findByRole('heading', { name: 'Settings' })).toBeInTheDocument();
    await user.click(screen.getByRole('switch', { name: 'Create a follow-up task' }));
    expect(screen.getByLabelText('Follow-up due date')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Start import/ }));

    // Step 5: result.
    expect(await screen.findByRole('heading', { name: 'Import complete' })).toBeInTheDocument();
    expect(screen.getByText('Leads imported').nextElementSibling).toHaveTextContent('3');
    expect(screen.getByText('New contacts created').nextElementSibling).toHaveTextContent('2');
    expect(screen.getByText('Existing contacts matched').nextElementSibling).toHaveTextContent('1');
    expect(screen.getByText('Rows skipped').nextElementSibling).toHaveTextContent('1');

    const leads = await db.leads.list();
    const seeded = new Set(seed.leads.map((lead) => lead.id));
    const imported = leads.filter((lead) => !seeded.has(lead.id));
    expect(imported).toHaveLength(3);
    expect(imported.every((lead) => lead.source === 'Import')).toBe(true);
    const attached = imported.find((lead) => lead.title === 'Second project')!;
    expect(attached.contactId).toBe(existing.id);
    expect(attached.priority).toBe('low');
    expect(attached.value).toBe(900);
    const ada = imported.find((lead) => lead.title === 'Website refresh')!;
    const adaContact = await db.contacts.get(ada.contactId);
    expect(adaContact.email).toBe('ada@analytical.example');
    expect(ada.ownerId).toBe(me.id);
    const grace = imported.find((lead) => lead.title === 'Compiler Co.')!;
    expect(grace.value).toBeUndefined();

    const contacts = await db.contacts.list();
    expect(contacts).toHaveLength(seed.contacts.length + 2);
    const seededTasks = new Set(seed.tasks.map((task) => task.id));
    const tasks = (await db.tasks.list()).filter((task) => !seededTasks.has(task.id));
    expect(tasks).toHaveLength(3);
    expect(tasks.every((task) => task.type === 'call' && task.assigneeId === me.id)).toBe(true);
    const activities = await db.activities.list();
    expect(
      activities.filter((activity) => activity.entityId === ada.id && activity.kind === 'created'),
    ).toHaveLength(1);
  });

  it('will not continue without rows or without a name column', async () => {
    const user = userEvent.setup();
    renderWizard();
    const next = await screen.findByRole('button', { name: /Continue/ });
    expect(next).toBeDisabled();

    await user.click(screen.getByRole('tab', { name: 'Paste rows' }));
    await user.click(screen.getByLabelText('Pasted rows'));
    await user.paste('Nickname,Phone\nAda,555');
    await user.click(screen.getByRole('button', { name: 'Use these rows' }));
    await user.click(await screen.findByRole('button', { name: /Continue/ }));
    expect(
      await screen.findByText('Map the contact name; every row needs one.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Continue/ })).toBeDisabled();
  });
});
