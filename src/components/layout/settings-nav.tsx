import { NavLink } from 'react-router';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

/** Settings sections. Unbuilt ones render disabled until their step lands. */
const settingsSections = [
  { label: 'Overview', to: '/settings', end: true },
  { label: 'Pipeline', to: '/settings/pipeline' },
  { label: 'Custom fields', to: '/settings/fields', soon: true },
  { label: 'Automations', to: '/settings/automations', soon: true },
] as const;

const itemClass =
  'inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-sm font-semibold text-muted-foreground';

/** Pill tabs across the settings pages, rendered in the `PageHeader`. */
export function SettingsNav() {
  return (
    <nav aria-label="Settings sections" className="flex items-center gap-0.5">
      {settingsSections.map((section) =>
        'soon' in section ? (
          <span key={section.to} aria-disabled className={cn(itemClass, 'opacity-60')}>
            {section.label}
            <Badge variant="neutral" className="h-4 px-1.5 text-2xs">
              Soon
            </Badge>
          </span>
        ) : (
          <NavLink
            key={section.to}
            to={section.to}
            end={'end' in section}
            className={({ isActive }) =>
              cn(
                itemClass,
                'hover:bg-accent hover:text-foreground',
                isActive && 'bg-accent text-foreground',
              )
            }
          >
            {section.label}
          </NavLink>
        ),
      )}
    </nav>
  );
}
