import { LockIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Permission } from '@/types/domain';
import { useCan } from '../hooks/use-can';

const NOTE: Record<Permission, string> = {
  'leads.view_all': 'Your role only shows your own leads.',
  'leads.edit': 'Your role can view leads but not change them. Ask an admin to make changes.',
  'quotes.approve': 'Your role cannot approve quotes.',
  'team.manage': 'You can view the team; ask an admin to make changes.',
  'settings.manage': 'You can view settings; ask an admin to make changes.',
};

/** A quiet line shown when the signed-in role lacks `permission`; renders nothing otherwise. */
export function PermissionNote({
  permission,
  className,
}: {
  permission: Permission;
  className?: string | undefined;
}) {
  const allowed = useCan(permission);
  if (allowed) return null;
  return (
    <p
      role="note"
      className={cn('flex items-center gap-1.5 text-xs text-muted-foreground', className)}
    >
      <LockIcon className="size-3" /> {NOTE[permission]}
    </p>
  );
}
