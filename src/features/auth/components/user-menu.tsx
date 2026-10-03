import { ChevronsUpDownIcon, LogOutIcon, UsersIcon } from 'lucide-react';
import { useNavigate } from 'react-router';
import { InitialsAvatar } from '@/components/common/initials-avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { useRoles } from '@/features/workspace';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';

/**
 * The sidebar footer: who is signed in, and how to switch (demo) or sign out.
 * `collapsed` (the icon rail) shows only the avatar and opens the menu to the side.
 */
export function UserMenu({
  collapsed = false,
  onNavigate,
}: {
  collapsed?: boolean;
  onNavigate?: (() => void) | undefined;
}) {
  const { user, adapterKind, signOut } = useAuth();
  const roles = useRoles().data ?? [];
  const navigate = useNavigate();

  if (!user) {
    return (
      <div className={cn('flex items-center gap-2 py-2.5', collapsed ? 'px-3.5' : 'px-4')}>
        <Skeleton className="size-6 shrink-0 rounded-full" />
        {!collapsed && <Skeleton className="h-4 w-24" />}
      </div>
    );
  }
  const role = roles.find((row) => row.id === user.roleId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            aria-label={`Account menu for ${user.name}`}
            className={cn(
              'flex w-full items-center gap-2 py-2.5 text-left hover:bg-accent focus-visible:bg-accent focus-visible:outline-none',
              collapsed ? 'px-3.5' : 'px-4',
            )}
          />
        }
      >
        <InitialsAvatar size="sm" name={user.name} color={user.color} />
        {!collapsed && (
          <>
            <span className="flex min-w-0 flex-1 flex-col leading-tight">
              <span className="truncate text-sm font-medium">{user.name}</span>
              <span className="truncate text-2xs text-foreground-faint">
                {role?.name ?? 'Member'}
              </span>
            </span>
            <ChevronsUpDownIcon className="size-3.5 shrink-0 text-foreground-faint" />
          </>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={collapsed ? 'end' : 'start'}
        side={collapsed ? 'right' : 'top'}
        className="w-56"
      >
        <div className="px-2 py-1.5">
          <p className="truncate text-sm font-semibold">{user.name}</p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
        </div>
        <DropdownMenuSeparator />
        {adapterKind === 'demo' && (
          <DropdownMenuItem
            onClick={() => {
              onNavigate?.();
              navigate('/sign-in?switch=1');
            }}
          >
            <UsersIcon /> Switch user
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          onClick={() => {
            onNavigate?.();
            void signOut();
          }}
        >
          <LogOutIcon /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
