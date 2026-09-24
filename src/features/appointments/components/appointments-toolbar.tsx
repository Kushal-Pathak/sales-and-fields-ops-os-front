import { XIcon } from 'lucide-react';
import { FilterChip, SearchField, SortMenu } from '@/components/common/list-toolbar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUsers } from '@/features/workspace';
import type { AppointmentType } from '@/types/domain';
import {
  APPOINTMENT_SORT_KEYS,
  APPOINTMENT_SORT_LABEL,
  APPOINTMENT_VIEWS,
  APPOINTMENT_VIEW_LABEL,
  type AppointmentFilters,
  type AppointmentView,
} from '../utils/appointment-filters';
import { APPOINTMENT_TYPE_LABEL, APPOINTMENT_TYPES } from '../utils/appointment-labels';

interface AppointmentsToolbarProps {
  filters: AppointmentFilters;
  counts: Record<AppointmentView, number> | undefined;
  isActive: boolean;
  onChange: (patch: Partial<AppointmentFilters>) => void;
  onClear: () => void;
}

/** View tabs, search, filter chips and sort for appointments. State comes from the URL. */
export function AppointmentsToolbar({
  filters,
  counts,
  isActive,
  onChange,
  onClear,
}: AppointmentsToolbarProps) {
  const users = (useUsers().data ?? []).filter((user) => user.active);

  return (
    <div className="flex w-full flex-wrap items-center gap-1.5">
      <Tabs
        value={filters.view}
        onValueChange={(view) => onChange({ view: view as AppointmentView })}
      >
        <TabsList className="h-auto gap-0.5 bg-transparent p-0">
          {APPOINTMENT_VIEWS.map((view) => (
            <TabsTrigger
              key={view}
              value={view}
              className="h-7 gap-1.5 px-2.5 data-active:bg-accent data-active:shadow-none"
            >
              {APPOINTMENT_VIEW_LABEL[view]}
              {counts && (
                <span
                  className={
                    view === 'overdue' && counts[view] > 0
                      ? 'text-xs font-semibold text-warning'
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

      <SearchField
        value={filters.q}
        onChange={(q) => onChange({ q })}
        placeholder="Search appointments"
      />

      <FilterChip
        label="Type"
        value={filters.type}
        anyLabel="any"
        items={APPOINTMENT_TYPES.map((type) => ({
          value: type,
          label: APPOINTMENT_TYPE_LABEL[type],
        }))}
        onChange={(type) => onChange({ type: type as AppointmentType | null })}
      />
      <FilterChip
        label="Assignee"
        value={filters.assigneeId}
        anyLabel="anyone"
        items={users.map((user) => ({ value: user.id, label: user.name }))}
        onChange={(assigneeId) => onChange({ assigneeId })}
      />
      {isActive && (
        <Button variant="ghost" size="xs" className="text-muted-foreground" onClick={onClear}>
          <XIcon /> Clear
        </Button>
      )}

      <SortMenu
        keys={APPOINTMENT_SORT_KEYS}
        labels={APPOINTMENT_SORT_LABEL}
        sortKey={filters.sort.key}
        direction={filters.sort.direction}
        onChange={(sort) => onChange({ sort })}
      />
    </div>
  );
}
