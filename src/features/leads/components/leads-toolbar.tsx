import { XIcon } from 'lucide-react';
import {
  FilterChip,
  SearchField,
  SortMenu,
  ViewTab,
  ViewTabs,
} from '@/components/common/list-toolbar';
import { Button } from '@/components/ui/button';
import { useStages, useUsers, useWorkspace } from '@/features/workspace';
import type { Priority } from '@/types/domain';
import {
  LEAD_SORT_KEYS,
  LEAD_SORT_LABEL,
  LEAD_VIEWS,
  LEAD_VIEW_LABEL,
  type LeadFilters,
  type LeadView,
} from '../utils/lead-filters';
import { PRIORITIES, PRIORITY_LABEL } from '../utils/priority';

interface LeadsToolbarProps {
  filters: LeadFilters;
  counts: Record<LeadView, number> | undefined;
  isActive: boolean;
  onChange: (patch: Partial<LeadFilters>) => void;
  onClear: () => void;
}

/** Saved-view tabs, search, filter chips and sort for the leads list. State comes from the URL. */
export function LeadsToolbar({ filters, counts, isActive, onChange, onClear }: LeadsToolbarProps) {
  const stages = useStages().data ?? [];
  const users = useUsers().data ?? [];
  const sources = useWorkspace().data?.leadSources ?? [];

  return (
    <div className="flex w-full flex-wrap items-center gap-1.5">
      <ViewTabs value={filters.view} onValueChange={(view) => onChange({ view: view as LeadView })}>
        {LEAD_VIEWS.map((view) => (
          <ViewTab key={view} value={view} label={LEAD_VIEW_LABEL[view]} count={counts?.[view]} />
        ))}
      </ViewTabs>

      <SearchField value={filters.q} onChange={(q) => onChange({ q })} placeholder="Search leads" />

      <FilterChip
        label="Stage"
        value={filters.stageId}
        anyLabel="any"
        items={stages.map((stage) => ({ value: stage.id, label: stage.name }))}
        onChange={(stageId) => onChange({ stageId })}
      />
      <FilterChip
        label="Source"
        value={filters.source}
        anyLabel="any"
        items={sources.map((source) => ({ value: source, label: source }))}
        onChange={(source) => onChange({ source })}
      />
      <FilterChip
        label="Owner"
        value={filters.ownerId}
        anyLabel="anyone"
        items={users.map((user) => ({ value: user.id, label: user.name }))}
        onChange={(ownerId) => onChange({ ownerId })}
      />
      <FilterChip
        label="Priority"
        value={filters.priority}
        anyLabel="any"
        items={PRIORITIES.map((priority) => ({ value: priority, label: PRIORITY_LABEL[priority] }))}
        onChange={(priority) => onChange({ priority: priority as Priority | null })}
      />
      {isActive && (
        <Button variant="ghost" size="xs" className="text-muted-foreground" onClick={onClear}>
          <XIcon /> Clear
        </Button>
      )}

      <SortMenu
        keys={LEAD_SORT_KEYS}
        labels={LEAD_SORT_LABEL}
        sortKey={filters.sort.key}
        direction={filters.sort.direction}
        onChange={(sort) => onChange({ sort })}
      />
    </div>
  );
}
