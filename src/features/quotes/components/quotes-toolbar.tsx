import { XIcon } from 'lucide-react';
import { FilterChip, SearchField, SortMenu } from '@/components/common/list-toolbar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUsers } from '@/features/workspace';
import {
  QUOTE_SORT_KEYS,
  QUOTE_SORT_LABEL,
  QUOTE_VIEWS,
  QUOTE_VIEW_LABEL,
  type QuoteFilters,
  type QuoteView,
} from '../utils/quote-filters';

interface QuotesToolbarProps {
  filters: QuoteFilters;
  counts: Record<QuoteView, number> | undefined;
  isActive: boolean;
  onChange: (patch: Partial<QuoteFilters>) => void;
  onClear: () => void;
}

/** Status views, search, creator filter and sort for quotes. State comes from the URL. */
export function QuotesToolbar({
  filters,
  counts,
  isActive,
  onChange,
  onClear,
}: QuotesToolbarProps) {
  const users = useUsers().data ?? [];

  return (
    <div className="flex w-full flex-wrap items-center gap-1.5">
      <Tabs value={filters.view} onValueChange={(view) => onChange({ view: view as QuoteView })}>
        <TabsList className="h-auto gap-0.5 bg-transparent p-0">
          {QUOTE_VIEWS.map((view) => (
            <TabsTrigger
              key={view}
              value={view}
              className="h-7 gap-1.5 px-2.5 data-active:bg-accent data-active:shadow-none"
            >
              {QUOTE_VIEW_LABEL[view]}
              {counts && (
                <span
                  className={
                    view === 'pending' && counts[view] > 0
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
        placeholder="Search quotes"
      />

      <FilterChip
        label="Created by"
        value={filters.createdById}
        anyLabel="anyone"
        items={users.map((user) => ({ value: user.id, label: user.name }))}
        onChange={(createdById) => onChange({ createdById })}
      />
      {isActive && (
        <Button variant="ghost" size="xs" className="text-muted-foreground" onClick={onClear}>
          <XIcon /> Clear
        </Button>
      )}

      <SortMenu
        keys={QUOTE_SORT_KEYS}
        labels={QUOTE_SORT_LABEL}
        sortKey={filters.sort.key}
        direction={filters.sort.direction}
        onChange={(sort) => onChange({ sort })}
      />
    </div>
  );
}
