import { useState } from 'react';
import { PlusIcon } from 'lucide-react';
import { PageBody, PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import {
  TaskDrawer,
  TaskFormDialog,
  TasksTable,
  TasksToolbar,
  useTasksList,
} from '@/features/tasks';
import { useDrawerParam } from '@/hooks/use-drawer-param';
import { TaskViewSwitch } from './view-switch';

/** `/tasks`: the tasks table with URL-driven views and filters, and the task drawer. */
export function TasksPage() {
  const list = useTasksList();
  const drawer = useDrawerParam('task');
  const [creating, setCreating] = useState(false);

  return (
    <>
      <PageHeader
        title="Tasks"
        count={list.rows && `${list.rows.length} task${list.rows.length === 1 ? '' : 's'}`}
        actions={
          <>
            <TaskViewSwitch />
            <Button size="sm" onClick={() => setCreating(true)}>
              <PlusIcon /> Add task
            </Button>
          </>
        }
      >
        <TasksToolbar
          filters={list.filters}
          counts={list.counts}
          isActive={list.isActive}
          onChange={list.update}
          onClear={list.clear}
        />
      </PageHeader>
      <PageBody className="flex flex-col">
        <TasksTable
          rows={list.visible}
          isPending={list.isPending}
          error={list.error}
          isFiltered={list.isActive || list.filters.view !== 'all'}
          onOpen={drawer.open}
          onCreate={() => setCreating(true)}
          onClearFilters={() =>
            list.update({ view: 'all', q: '', type: null, assigneeId: null, priority: null })
          }
          onRetry={() => void list.refetch()}
        />
      </PageBody>
      <TaskDrawer taskId={drawer.id} onClose={drawer.close} />
      <TaskFormDialog open={creating} onOpenChange={setCreating} onSaved={drawer.open} />
    </>
  );
}
