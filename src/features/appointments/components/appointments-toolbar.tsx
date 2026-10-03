import { XIcon } from 'lucide-react';
import {
  FilterChip,
  SearchField,
  SortMenu,
  ViewTab,
  ViewTabs,
} from '@/components/common/list-toolbar';
import { Button } from '@/components/ui/button';
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
      <ViewTabs
        value={filters.view}
        onValueChange={(view) => onChange({ view: view as AppointmentView })}
      >
        {APPOINTMENT_VIEWS.map((view) => (
          <ViewTab
            key={view}
            value={view}
            label={APPOINTMENT_VIEW_LABEL[view]}
            count={counts?.[view]}
            countClassName={
              view === 'overdue' && (counts?.[view] ?? 0) > 0 ? 'text-warning' : undefined
            }
          />
        ))}
      </ViewTabs>

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
