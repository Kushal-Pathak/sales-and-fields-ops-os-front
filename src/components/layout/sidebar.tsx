import { NavLink } from 'react-router';
import { adminNav, mainNav, visibleNav, type NavGroup, type NavItem } from '@/app/navigation';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { UserMenu, useModules } from '@/features/auth';
import { env } from '@/lib/env';
import { cn } from '@/lib/utils';

interface SidebarProps {
  id?: string;
  className?: string;
  /** Icon-only rail; item labels move to tooltips. */
  collapsed?: boolean;
  /** Called after a link is clicked; used to close the mobile sheet. */
  onNavigate?: () => void;
}

/**
 * 236px navigation rail, or a 52px icon rail when `collapsed`. Groups and items
 * come from `src/app/navigation.ts`, limited to the modules open to the signed-in
 * user. Group headings shrink to hairlines when
 * collapsed, animated with the width, so the icons slide rather than jump.
 * The desktop toggle lives in the top bar.
 */
export function Sidebar({ id, className, collapsed = false, onNavigate }: SidebarProps) {
  const modules = useModules();
  const isOpen = (module: NavItem['module']) => modules[module].status === 'allowed';
  const admin = visibleNav([adminNav], isOpen)[0];

  return (
    <aside
      id={id}
      className={cn(
        'flex flex-none flex-col border-r bg-sidebar transition-[width] duration-200 ease-out motion-reduce:transition-none',
        collapsed ? 'w-[52px]' : 'w-[236px]',
        className,
      )}
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="px-2.5 pt-2.5 pb-1.5">
          {collapsed ? (
            <div className="flex h-9 items-center justify-center">
              <BrandTile />
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-lg px-1.5 py-1.5">
              <BrandTile />
              <span className="truncate text-base font-bold tracking-tight">{env.appName}</span>
            </div>
          )}
        </div>

        <nav className="flex-1 overflow-x-hidden overflow-y-auto px-2.5 pb-2.5" aria-label="Main">
          {visibleNav(mainNav, isOpen).map((group, index) => (
            <SidebarGroup
              key={group.label ?? index}
              group={group}
              collapsed={collapsed}
              onNavigate={onNavigate}
            />
          ))}
          {admin && (
            <SidebarGroup group={admin} divider collapsed={collapsed} onNavigate={onNavigate} />
          )}
        </nav>

        <div className="border-t">
          <UserMenu collapsed={collapsed} onNavigate={onNavigate} />
        </div>
      </div>
    </aside>
  );
}

function BrandTile() {
  return (
    <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-brand text-xs font-bold text-brand-foreground">
      {env.appName.charAt(0)}
    </span>
  );
}

function SidebarGroup({
  group,
  collapsed,
  divider = false,
  onNavigate,
}: {
  group: NavGroup;
  collapsed: boolean;
  /** Draw a hairline above the group even when expanded (the admin group). */
  divider?: boolean;
  onNavigate?: (() => void) | undefined;
}) {
  return (
    <div>
      {(group.label || divider) && (
        <GroupHeading label={group.label} divider={divider} collapsed={collapsed} />
      )}
      {group.items.map((item) => (
        <SidebarLink key={item.to} item={item} collapsed={collapsed} onNavigate={onNavigate} />
      ))}
    </div>
  );
}

const headingTransition =
  'overflow-hidden transition-[height,opacity] duration-200 ease-out motion-reduce:transition-none';

/**
 * The space above a group. Expanded: the label (after a hairline for `divider`).
 * Collapsed: only a hairline, 20px tall for every group, so the rail's gaps are
 * even. The label stays in the DOM for screen readers.
 */
function GroupHeading({
  label,
  divider,
  collapsed,
}: {
  label?: string | undefined;
  divider: boolean;
  collapsed: boolean;
}) {
  return (
    <>
      <div
        className={cn('flex items-center', headingTransition, divider || collapsed ? 'h-5' : 'h-0')}
      >
        <Separator />
      </div>
      {label && (
        <div
          className={cn('flex items-end', headingTransition, collapsed ? 'h-0 opacity-0' : 'h-8')}
        >
          <span className="min-w-0 truncate px-2 pb-1 text-2xs font-bold tracking-wider text-foreground-faint uppercase">
            {label}
          </span>
        </div>
      )}
    </>
  );
}

function SidebarLink({
  item,
  collapsed,
  onNavigate,
}: {
  item: NavItem;
  collapsed: boolean;
  onNavigate?: (() => void) | undefined;
}) {
  return (
    <Tooltip disabled={!collapsed}>
      <TooltipTrigger
        render={
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
          />
        }
      >
        <item.icon className="size-[15px] shrink-0" />
        <span className={collapsed ? 'sr-only' : 'flex-1 truncate'}>{item.label}</span>
        {!collapsed && item.count !== undefined && (
          <span className="text-xs text-foreground-faint tabular-nums">{item.count}</span>
        )}
      </TooltipTrigger>
      <TooltipContent side="right">
        {item.label}
        {item.count !== undefined && <span className="tabular-nums opacity-70">{item.count}</span>}
      </TooltipContent>
    </Tooltip>
  );
}
