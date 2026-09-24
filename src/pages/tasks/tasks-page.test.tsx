import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { db, resetDemoData } from '@/data';
import { buildSeed } from '@/data/seed';
import { isTaskOverdue } from '@/types/domain';
import { TasksPage } from './index';

function renderTasksPage(initialEntry = '/tasks') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter([{ path: '/tasks', element: <TasksPage /> }], {
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
const me = seed.users.find((user) => user.active)!;
const mine = seed.tasks.filter((task) => task.assigneeId === me.id);

describe('TasksPage', () => {
  beforeEach(() => resetDemoData());

  it('opens on the Mine view with counts on the tabs', async () => {
    renderTasksPage();
    expect(await screen.findByText(`${seed.tasks.length} tasks`)).toBeInTheDocument();
    expect(screen.getAllByRole('row', { name: /^Open task/ })).toHaveLength(mine.length);
    const overdue = seed.tasks.filter((task) => isTaskOverdue(task)).length;
    expect(screen.getByRole('tab', { name: /^Overdue/ })).toHaveTextContent(String(overdue));
  });

  it('completes a task from the checkbox and logs it on the lead', async () => {
    const user = userEvent.setup();
    renderTasksPage('/tasks?view=all');
    const task = seed.tasks.find((item) => item.status === 'pending' && item.leadId)!;
    await user.click(await screen.findByRole('checkbox', { name: `Complete ${task.title}` }));

    await waitFor(async () => {
      expect((await db.tasks.get(task.id)).status).toBe('completed');
    });
    expect(await screen.findByRole('checkbox', { name: `Reopen ${task.title}` })).toBeChecked();
    const activities = await db.activities.list();
    expect(
      activities.some(
        (activity) =>
          activity.entityId === task.leadId &&
          activity.kind === 'task_completed' &&
          activity.message.includes(task.title),
      ),
    ).toBe(true);
  });

  it('opens the drawer from a row and marks the task done from there', async () => {
    const user = userEvent.setup();
    const task = seed.tasks.find((item) => item.status === 'pending')!;
    const { router } = renderTasksPage('/tasks?view=all');
    await user.click(await screen.findByRole('row', { name: `Open task ${task.title}` }));
    await waitFor(() => expect(router.state.location.search).toContain(`task=${task.id}`));

    const dialog = await screen.findByRole('dialog');
    expect(await within(dialog).findByText(task.title)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Mark done' }));
    expect(await within(dialog).findByRole('button', { name: 'Reopen' })).toBeInTheDocument();
  });

  it('creates a task from the dialog', async () => {
    const user = userEvent.setup();
    renderTasksPage();
    await user.click(await screen.findByRole('button', { name: 'Add task' }));
    const dialog = await screen.findByRole('dialog');
    await user.type(await within(dialog).findByLabelText('Task'), 'Send the welcome pack');
    await user.click(within(dialog).getByRole('button', { name: 'Add task' }));

    await waitFor(async () => {
      expect((await db.tasks.list()).some((item) => item.title === 'Send the welcome pack')).toBe(
        true,
      );
    });
    const created = (await db.tasks.list()).find((item) => item.title === 'Send the welcome pack')!;
    expect(created.assigneeId).toBe(me.id);
    expect(created.status).toBe('pending');
  });
});
