import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { db, resetDemoData } from '@/data';
import { buildSeed } from '@/data/seed';
import { FieldsSettingsPage } from './index';

function renderAt(path = '/settings/fields') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter(
    [{ path: '/settings/fields', element: <FieldsSettingsPage /> }],
    {
      initialEntries: [path],
    },
  );
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { router };
}

const seed = buildSeed();
const leadFields = seed.fields.filter((field) => field.entity === 'lead');

describe('FieldsSettingsPage', () => {
  beforeEach(() => resetDemoData());

  it('lists the lead fields by default and the appointment fields from the URL', async () => {
    renderAt();
    for (const field of leadFields) {
      expect(
        await screen.findByRole('button', { name: `Reorder ${field.label}` }),
      ).toBeInTheDocument();
    }
    expect(screen.queryByRole('button', { name: 'Reorder Timeline' })).not.toBeInTheDocument();
  });

  it('adds a dropdown field with options and a generated key', async () => {
    const user = userEvent.setup();
    renderAt();
    await user.click(await screen.findByRole('button', { name: 'Add field' }));
    const drawer = await screen.findByRole('dialog');
    await user.type(within(drawer).getByLabelText('Label'), 'Budget range');
    expect(within(drawer).getByLabelText('Key')).toHaveValue('budgetRange');
    await user.click(within(drawer).getByRole('combobox', { name: 'Type' }));
    await user.click(await screen.findByRole('option', { name: 'Dropdown' }));
    await user.click(within(drawer).getByRole('button', { name: 'Add field' }));
    expect(await within(drawer).findByText('Add at least one option.')).toBeInTheDocument();
    await user.type(within(drawer).getByLabelText('Options'), 'Under 5k\nOver 5k');
    await user.click(within(drawer).getByRole('button', { name: 'Add field' }));

    await waitFor(async () => {
      expect((await db.fields.list()).some((field) => field.key === 'budgetRange')).toBe(true);
    });
    const created = (await db.fields.list()).find((field) => field.key === 'budgetRange')!;
    expect(created).toMatchObject({
      entity: 'lead',
      type: 'select',
      options: ['Under 5k', 'Over 5k'],
    });
    expect(created.order).toBe(leadFields.length);
    expect(await screen.findByRole('button', { name: 'Reorder Budget range' })).toBeInTheDocument();
  });

  it('reorders with the row menu and deletes a field', async () => {
    const user = userEvent.setup();
    renderAt();
    const second = leadFields[1]!;
    await user.click(await screen.findByRole('button', { name: `Actions for ${second.label}` }));
    await user.click(await screen.findByRole('menuitem', { name: 'Move up' }));
    await waitFor(async () => {
      expect((await db.fields.get(second.id)).order).toBe(0);
    });

    await user.click(screen.getByRole('button', { name: `Actions for ${second.label}` }));
    await user.click(await screen.findByRole('menuitem', { name: 'Delete' }));
    await user.click(await screen.findByRole('button', { name: 'Delete field' }));
    await waitFor(async () => {
      expect((await db.fields.list()).some((field) => field.id === second.id)).toBe(false);
    });
  });
});
