import { useState, type ReactNode } from 'react';
import {
  CheckIcon,
  MailIcon,
  MinusIcon,
  PencilIcon,
  SearchXIcon,
  UserCheckIcon,
  UserMinusIcon,
} from 'lucide-react';
import { Link } from 'react-router';
import { EmptyState } from '@/components/common/empty-state';
import { InitialsAvatar } from '@/components/common/initials-avatar';
import { StatusBadge } from '@/components/common/status-badge';
import {
  DrawerBody,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerPanel,
  DrawerTitle,
} from '@/components/layout/drawer-panel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useCan } from '@/features/auth';
import { useCurrentUser, useWorkspace } from '@/features/workspace';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useUpdateMember } from '../hooks/use-team-mutations';
import { PERMISSIONS, type MemberRow } from '../utils/team-model';
import { DeactivateMemberDialog } from './deactivate-member-dialog';
import { MemberFormDialog } from './member-form-dialog';

interface MemberDrawerProps {
  userId: string | null;
  rows: MemberRow[] | undefined;
  onClose: () => void;
}

/** Member detail panel, opened by `?member=<id>`. Reads from the already loaded team rows. */
export function MemberDrawer({ userId, rows, onClose }: MemberDrawerProps) {
  const row = userId ? rows?.find((item) => item.user.id === userId) : undefined;
  return (
    <DrawerPanel open={userId !== null} onOpenChange={(open) => !open && onClose()}>
      {userId !== null && !rows && (
        <DrawerHeader className="gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-5 w-40" />
        </DrawerHeader>
      )}
      {userId !== null && rows && !row && (
        <>
          <DrawerHeader>
            <DrawerTitle>Member not found</DrawerTitle>
            <DrawerDescription>The link may be stale.</DrawerDescription>
          </DrawerHeader>
          <EmptyState
            icon={SearchXIcon}
            title="This member no longer exists"
            action={
              <Button variant="outline" size="sm" onClick={onClose}>
                Close
              </Button>
            }
          />
        </>
      )}
      {row && rows && <MemberDetails key={row.user.id} row={row} rows={rows} onClose={onClose} />}
    </DrawerPanel>
  );
}

function MemberDetails({
  row,
  rows,
  onClose,
}: {
  row: MemberRow;
  rows: MemberRow[];
  onClose: () => void;
}) {
  const { user, role, openLeads, openTasks } = row;
  const locale = useWorkspace().data?.locale;
  const currentUser = useCurrentUser().data;
  const updateMember = useUpdateMember();
  const [editing, setEditing] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const isSelf = currentUser?.id === user.id;
  const canManage = useCan('team.manage');
  const candidates = rows.filter((item) => item.user.active && item.user.id !== user.id);
  const permissions = new Set(role?.permissions ?? []);

  return (
    <>
      <DrawerHeader className="gap-3">
        <div className="flex items-start gap-3">
          <InitialsAvatar size="lg" name={user.name} color={user.color} className="mt-0.5" />
          <div className="min-w-0 flex-1">
            <DrawerTitle className="truncate">{user.name}</DrawerTitle>
            <DrawerDescription className="truncate">{user.email}</DrawerDescription>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {role && <Badge variant="neutral">{role.name}</Badge>}
              <StatusBadge color={user.active ? 'success' : 'neutral'}>
                {user.active ? 'Active' : 'Inactive'}
              </StatusBadge>
              {isSelf && <Badge variant="outline">You</Badge>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<a href={`mailto:${user.email}`} />}
          >
            <MailIcon /> Email
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!canManage}
            onClick={() => setEditing(true)}
          >
            <PencilIcon /> Edit
          </Button>
        </div>
      </DrawerHeader>

      <DrawerBody className="flex flex-col gap-5">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
          <Field label="Phone">{user.phone}</Field>
          <Field label="Joined">{formatDate(user.createdAt, 'date', locale)}</Field>
          <Field label="Open leads">
            <Link
              to={`/leads?owner=${user.id}`}
              className="font-semibold tabular-nums hover:underline"
            >
              {openLeads}
            </Link>
          </Field>
          <Field label="Open tasks">
            <Link
              to={`/tasks?view=all&assignee=${user.id}`}
              className="font-semibold tabular-nums hover:underline"
            >
              {openTasks ?? '—'}
            </Link>
          </Field>
        </dl>

        <section>
          <h3 className="mb-2 text-2xs font-bold tracking-wider text-foreground-faint uppercase">
            Permissions{role && ` · ${role.name}`}
          </h3>
          <ul className="flex flex-col">
            {PERMISSIONS.map((permission) => {
              const granted = permissions.has(permission.key);
              return (
                <li
                  key={permission.key}
                  className="flex items-center justify-between gap-3 border-b border-border-faint py-2 text-sm last:border-0"
                >
                  <span className={cn(!granted && 'text-muted-foreground')}>
                    {permission.label}
                  </span>
                  {granted ? (
                    <CheckIcon className="size-4 text-success" aria-label="Granted" />
                  ) : (
                    <MinusIcon className="size-4 text-foreground-faint" aria-label="Not granted" />
                  )}
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-xs text-foreground-faint">
            Permissions come from the role. Change them under Team → Roles.
          </p>
        </section>
      </DrawerBody>

      <DrawerFooter>
        {user.active ? (
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            disabled={isSelf || !canManage}
            title={isSelf ? 'You cannot deactivate yourself' : undefined}
            onClick={() => setDeactivating(true)}
          >
            <UserMinusIcon /> Deactivate
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            disabled={updateMember.isPending || !canManage}
            onClick={() => updateMember.mutate({ id: user.id, patch: { active: true } })}
          >
            <UserCheckIcon /> Reactivate
          </Button>
        )}
        <span className="flex-1" />
        <Button variant="outline" size="sm" onClick={onClose}>
          Close
        </Button>
      </DrawerFooter>

      <MemberFormDialog open={editing} onOpenChange={setEditing} member={user} />
      <DeactivateMemberDialog
        open={deactivating}
        onOpenChange={setDeactivating}
        row={row}
        candidates={candidates}
        onDone={() => undefined}
      />
    </>
  );
}

function Field({ label, children }: { label: string; children?: ReactNode }) {
  const empty =
    children === undefined || children === null || children === false || children === '';
  return (
    <div className="min-w-0">
      <dt className="text-2xs font-bold tracking-wider text-foreground-faint uppercase">{label}</dt>
      <dd className={cn('mt-0.5 truncate text-base', empty && 'text-foreground-faint')}>
        {empty ? '—' : children}
      </dd>
    </div>
  );
}
