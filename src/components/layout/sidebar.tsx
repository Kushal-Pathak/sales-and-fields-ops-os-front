import { NavLink } from 'react-router';
import { adminNav, mainNav, type NavGroup, type NavItem } from '@/app/navigation';
import { Separator } from '@/components/ui/separator';
import { UserMenu } from '@/features/auth';
import { env } from '@/lib/env';
import { cn } from '@/lib/utils';

interface SidebarProps {
  className?: string;
  /** Called after a link is clicked; used to close the mobile sheet. */
  onNavigate?: () => void;
}

/** 236px navigation rail. Groups and items come from `src/app/navigation.ts`. */
export function Sidebar({ className, onNavigate }: SidebarProps) {
  return (
    <aside
      className={cn(
        'flex w-[236px] flex-none flex-col overflow-hidden border-r bg-sidebar',
        className,
      )}
    >
      <div className="px-2.5 pt-2.5 pb-1.5">
        <div className="flex items-center gap-2 rounded-lg px-1.5 py-1.5">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-brand text-xs font-bold text-brand-foreground">
            {env.appName.charAt(0)}
          </span>
          <span className="truncate text-base font-bold tracking-tight">{env.appName}</span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2.5 pb-2.5" aria-label="Main">
        {mainNav.map((group, index) => (
          <SidebarGroup key={group.label ?? index} group={group} onNavigate={onNavigate} />
        ))}
        <Separator className="my-2.5" />
        <SidebarGroup group={adminNav} onNavigate={onNavigate} />
      </nav>

      <div className="border-t">
        <UserMenu onNavigate={onNavigate} />
      </div>
    </aside>
  );
}

function SidebarGroup({
  group,
  onNavigate,
}: {
  group: NavGroup;
  onNavigate?: (() => void) | undefined;
}) {
  return (
    <div>
      {group.label && (
        <div className="px-2 pt-3.5 pb-1 text-2xs font-bold tracking-wider text-foreground-faint uppercase">
          {group.label}
        </div>
      )}
      {group.items.map((item) => (
        <SidebarLink key={item.to} item={item} onNavigate={onNavigate} />
      ))}
    </div>
  );
}

function SidebarLink({
  item,
  onNavigate,
}: {
  item: NavItem;
  onNavigate?: (() => void) | undefined;
}) {
  return (
    <NavLink
      to={item.to}
      end={item.end ?? false}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'mb-px flex items-center gap-2 rounded-lg px-2 py-1.5 text-base font-medium text-sidebar-foreground transition-colors hover:bg-accent',
          isActive &&
            'bg-sidebar-accent font-semibold text-sidebar-accent-foreground hover:bg-sidebar-accent',
        )
      }
    >
      <item.icon className="size-[15px] shrink-0" />
      <span className="flex-1 truncate">{item.label}</span>
      {item.count !== undefined && (
        <span className="text-xs text-foreground-faint tabular-nums">{item.count}</span>
      )}
    </NavLink>
  );
}
