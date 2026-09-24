import { useEffect, useState } from 'react';
import { ArrowUpDownIcon, ChevronDownIcon, SearchIcon } from 'lucide-react';
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
import { cn } from '@/lib/utils';

/**
 * Building blocks of the design system's filter row (page header, second line):
 * search, `Field <b>value</b>` chips backed by a Select, and a sort menu.
 */

const SEARCH_DEBOUNCE_MS = 200;

interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}

export function SearchField({ value, onChange, placeholder }: SearchFieldProps) {
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
        placeholder={placeholder}
        aria-label={placeholder}
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

export function FilterChip({ label, anyLabel, value, items, onChange }: FilterChipProps) {
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

interface SortMenuProps<K extends string> {
  keys: readonly K[];
  labels: Record<K, string>;
  sortKey: K;
  direction: 'asc' | 'desc';
  onChange: (sort: { key: K; direction: 'asc' | 'desc' }) => void;
}

export function SortMenu<K extends string>({
  keys,
  labels,
  sortKey,
  direction,
  onChange,
}: SortMenuProps<K>) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="xs" className="ml-auto text-muted-foreground" />}
      >
        <ArrowUpDownIcon />
        {labels[sortKey]}
        <ChevronDownIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Sort by</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={sortKey}
          onValueChange={(key) => onChange({ key: key as K, direction })}
        >
          {keys.map((key) => (
            <DropdownMenuRadioItem key={key} value={key}>
              {labels[key]}
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
