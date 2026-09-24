import { Columns3Icon, ListIcon } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

const VIEWS = [
  { value: '/leads', label: 'Table view', icon: ListIcon },
  { value: '/leads/pipeline', label: 'Board view', icon: Columns3Icon },
] as const;

/**
 * Segmented control switching between the leads table and the pipeline board.
 * The query string travels with the switch, so filters and an open drawer survive.
 */
export function ViewSwitch() {
  const { pathname, search } = useLocation();
  const navigate = useNavigate();

  return (
    <ToggleGroup
      variant="outline"
      size="sm"
      spacing={0}
      aria-label="Leads view"
      value={[pathname]}
      onValueChange={(value) => {
        const next = value[0];
        if (typeof next === 'string' && next !== pathname) void navigate(`${next}${search}`);
      }}
    >
      {VIEWS.map((view) => (
        <ToggleGroupItem
          key={view.value}
          value={view.value}
          aria-label={view.label}
          className="data-pressed:bg-accent aria-pressed:bg-accent"
        >
          <view.icon />
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
