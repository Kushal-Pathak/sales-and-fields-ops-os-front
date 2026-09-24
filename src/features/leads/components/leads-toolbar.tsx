import { useEffect, useState } from 'react';
import { ArrowUpDownIcon, ChevronDownIcon, SearchIcon, XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useStages, useUsers, useWorkspace } from '@/features/workspace';
import { cn } from '@/lib/utils';
import type { Priority } from '@/types/domain';
import {
  LEAD_SORT_KEYS,
  LEAD_SORT_LABEL,
  LEAD_VIEWS,
  LEAD_VIEW_LABEL,
  type LeadFilters,
  type LeadSortKey,
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
      <Tabs value={filters.view} onValueChange={(view) => onChange({ view: view as LeadView })}>
        <TabsList className="h-auto gap-0.5 bg-transparent p-0">
          {LEAD_VIEWS.map((view) => (
            <TabsTrigger
              key={view}
              value={view}
              className="h-7 gap-1.5 px-2.5 data-active:bg-accent data-active:shadow-none"
            >
              {LEAD_VIEW_LABEL[view]}
              {counts && <span className="text-xs text-foreground-faint">{counts[view]}</span>}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <SearchField value={filters.q} onChange={(q) => onChange({ q })} />

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
        sortKey={filters.sort.key}
        direction={filters.sort.direction}
        onChange={(sort) => onChange({ sort })}
      />
    </div>
  );
}

const SEARCH_DEBOUNCE_MS = 200;

function SearchField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  // `draft` is only set while the user types; `null` means "show what is in the URL".
  const [draft, setDraft] = useState<string | null>(null);

  useEffect(() => {
    if (draft === null) return;
    const timer = setTimeout(() => {
      onChange(draft);
      setDraft(null);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [draft, onChange]);

  return (
    <InputGroup className="h-7 w-52 rounded-full bg-surface-2 has-[[data-slot=input-group-control]:focus-visible]:bg-background">
      <InputGroupInput
        type="search"
        placeholder="Search leads"
        aria-label="Search leads"
        className="text-xs"
        value={draft ?? value}
        onChange={(event) => setDraft(event.target.value)}
      />
      <InputGroupAddon>
        <SearchIcon className="size-3.5" />
      </InputGroupAddon>
    </InputGroup>
  );
}

interface FilterChipProps {
  label: string;
  anyLabel: string;
  value: string | null;
  items: { value: string; label: string }[];
  onChange: (value: string | null) => void;
}

/** A filter chip from the design system: `Field <b>value</b>`, backed by a `Select`. */
function FilterChip({ label, anyLabel, value, items, onChange }: FilterChipProps) {
  const selected = items.find((item) => item.value === value);
  return (
    <Select value={value} onValueChange={(next) => onChange(next)}>
      <SelectTrigger
        size="sm"
        aria-label={`Filter by ${label.toLowerCase()}`}
        className={cn(
          'h-6 gap-1 rounded-full border-transparent bg-surface-2 px-2.5 text-xs text-muted-foreground hover:bg-accent',
          selected && 'bg-accent text-foreground',
        )}
      >
        {label} <b className="font-semibold text-foreground">{selected?.label ?? anyLabel}</b>
      </SelectTrigger>
      <SelectContent align="start">
        <SelectItem value={null}>Any {label.toLowerCase()}</SelectItem>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

interface SortMenuProps {
  sortKey: LeadSortKey;
  direction: 'asc' | 'desc';
  onChange: (sort: { key: LeadSortKey; direction: 'asc' | 'desc' }) => void;
}

function SortMenu({ sortKey, direction, onChange }: SortMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="xs" className="ml-auto text-muted-foreground" />}
      >
        <ArrowUpDownIcon />
        {LEAD_SORT_LABEL[sortKey]}
        <ChevronDownIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Sort by</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={sortKey}
          onValueChange={(key) => onChange({ key: key as LeadSortKey, direction })}
        >
          {LEAD_SORT_KEYS.map((key) => (
            <DropdownMenuRadioItem key={key} value={key}>
              {LEAD_SORT_LABEL[key]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup
          value={direction}
          onValueChange={(next) => onChange({ key: sortKey, direction: next as 'asc' | 'desc' })}
        >
          <DropdownMenuRadioItem value="desc">Descending</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="asc">Ascending</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
