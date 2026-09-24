import { NavLink } from 'react-router';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface SectionNavItem {
  label: string;
  to: string;
  /** Match the path exactly (for the section's index route). */
  end?: boolean;
  /** Not built yet: rendered disabled with a "Soon" badge. */
  soon?: boolean;
}

interface SectionNavProps {
  label: string;
  items: readonly SectionNavItem[];
}

const itemClass =
  'inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-sm font-semibold text-muted-foreground';

/** Pill tabs that are links, for the sub-pages of a section (Settings, Team). */
export function SectionNav({ label, items }: SectionNavProps) {
  return (
    <nav aria-label={label} className="flex items-center gap-0.5">
      {items.map((item) =>
        item.soon ? (
          <span key={item.to} aria-disabled className={cn(itemClass, 'opacity-60')}>
            {item.label}
            <Badge variant="neutral" className="h-4 px-1.5 text-2xs">
              Soon
            </Badge>
          </span>
        ) : (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end ?? false}
            className={({ isActive }) =>
              cn(
                itemClass,
                'hover:bg-accent hover:text-foreground',
                isActive && 'bg-accent text-foreground',
              )
            }
          >
            {item.label}
          </NavLink>
        ),
      )}
    </nav>
  );
}
