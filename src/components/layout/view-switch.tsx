import type { LucideIcon } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

export interface ViewSwitchOption {
  to: string;
  label: string;
  icon: LucideIcon;
}

interface ViewSwitchProps {
  views: readonly ViewSwitchOption[];
  'aria-label': string;
}

/**
 * Segmented control between sibling routes (table / board). The query string
 * travels with the switch, so filters and an open drawer survive.
 */
export function ViewSwitch({ views, 'aria-label': ariaLabel }: ViewSwitchProps) {
  const { pathname, search } = useLocation();
  const navigate = useNavigate();

  return (
    <ToggleGroup
      variant="outline"
      size="sm"
      spacing={0}
      aria-label={ariaLabel}
      value={[pathname]}
      onValueChange={(value) => {
        const next = value[0];
        if (typeof next === 'string' && next !== pathname) void navigate(`${next}${search}`);
      }}
    >
      {views.map((view) => (
        <ToggleGroupItem
          key={view.to}
          value={view.to}
          aria-label={view.label}
          className="data-pressed:bg-accent aria-pressed:bg-accent"
        >
          <view.icon />
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
