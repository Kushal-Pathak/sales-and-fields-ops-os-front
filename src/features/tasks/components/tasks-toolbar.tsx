import { XIcon } from 'lucide-react';
import { FilterChip, SearchField, SortMenu } from '@/components/common/list-toolbar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUsers } from '@/features/workspace';
import type { Priority, TaskType } from '@/types/domain';
import {
  TASK_SORT_KEYS,
  TASK_SORT_LABEL,
  TASK_VIEWS,
  TASK_VIEW_LABEL,
  type TaskFilters,
  type TaskView,
} from '../utils/task-filters';
import { TASK_TYPE_LABEL, TASK_TYPES } from '../utils/task-labels';

interface TasksToolbarProps {
  filters: TaskFilters;
  counts: Record<TaskView, number> | undefined;
  isActive: boolean;
  onChange: (patch: Partial<TaskFilters>) => void;
  onClear: () => void;
}

const PRIORITY_ITEMS: { value: Priority; label: string }[] = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

/** View tabs, search, filter chips and sort for tasks. State comes from the URL. */
export function TasksToolbar({ filters, counts, isActive, onChange, onClear }: TasksToolbarProps) {
  const users = (useUsers().data ?? []).filter((user) => user.active);

  return (
    <div className="flex w-full flex-wrap items-center gap-1.5">
      <Tabs value={filters.view} onValueChange={(view) => onChange({ view: view as TaskView })}>
        <TabsList className="h-auto gap-0.5 bg-transparent p-0">
          {TASK_VIEWS.map((view) => (
            <TabsTrigger
              key={view}
              value={view}
              className="h-7 gap-1.5 px-2.5 data-active:bg-accent data-active:shadow-none"
            >
              {TASK_VIEW_LABEL[view]}
              {counts && (
                <span
                  className={
                    view === 'overdue' && counts[view] > 0
                      ? 'text-xs font-semibold text-destructive'
                      : 'text-xs text-foreground-faint'
                  }
                >
                  {counts[view]}
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <SearchField value={filters.q} onChange={(q) => onChange({ q })} placeholder="Search tasks" />

      <FilterChip
        label="Type"
        value={filters.type}
        anyLabel="any"
        items={TASK_TYPES.map((type) => ({ value: type, label: TASK_TYPE_LABEL[type] }))}
        onChange={(type) => onChange({ type: type as TaskType | null })}
      />
      <FilterChip
        label="Assignee"
        value={filters.assigneeId}
        anyLabel="anyone"
        items={users.map((user) => ({ value: user.id, label: user.name }))}
        onChange={(assigneeId) => onChange({ assigneeId })}
      />
      <FilterChip
        label="Priority"
        value={filters.priority}
        anyLabel="any"
        items={PRIORITY_ITEMS}
        onChange={(priority) => onChange({ priority: priority as Priority | null })}
      />
      {isActive && (
        <Button variant="ghost" size="xs" className="text-muted-foreground" onClick={onClear}>
          <XIcon /> Clear
        </Button>
      )}

      <SortMenu
        keys={TASK_SORT_KEYS}
        labels={TASK_SORT_LABEL}
        sortKey={filters.sort.key}
        direction={filters.sort.direction}
        onChange={(sort) => onChange({ sort })}
      />
    </div>
  );
}
