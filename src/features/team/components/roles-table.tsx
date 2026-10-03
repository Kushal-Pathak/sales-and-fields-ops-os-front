import { QueryContent } from '@/components/common/query-content';
import { CheckIcon, MinusIcon, PlusIcon, ShieldIcon } from 'lucide-react';
import { EmptyState } from '@/components/common/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useRoles, useUsers } from '@/features/workspace';
import { cn } from '@/lib/utils';
import { PERMISSIONS, roleUsage } from '../utils/team-model';

interface RolesTableProps {
  onOpen: (roleId: string) => void;
  onCreate: () => void;
}

const HEAD_CLASS = 'h-8 px-3 text-xs font-semibold text-muted-foreground';
const CELL_CLASS = 'px-3 py-1.5';

/** Roles with a column per permission. Click a row to edit. */
export function RolesTable({ onOpen, onCreate }: RolesTableProps) {
  const roles = useRoles();
  const users = useUsers().data ?? [];
  const usage = roleUsage(roles.data ?? [], users);

  if (roles.data && roles.data.length === 0)
    return (
      <QueryContent
        error={roles.error}
        hasData={roles.data !== undefined}
        title="Roles could not be loaded"
        onRetry={() => void roles.refetch()}
      >
        <EmptyState
          icon={ShieldIcon}
          title="No roles yet"
          hint="Add a role to decide what members can do."
          action={
            <button type="button" className="text-sm font-semibold underline" onClick={onCreate}>
              Add role
            </button>
          }
        />
      </QueryContent>
    );

  return (
    <QueryContent
      error={roles.error}
      hasData={roles.data !== undefined}
      title="Roles could not be loaded"
      onRetry={() => void roles.refetch()}
    >
      <div className="rounded-xl border">
        <Table containerClassName="overflow-visible rounded-xl" className="min-w-[860px]">
          <TableHeader className="[&_th]:bg-sidebar [&_th:first-child]:rounded-tl-xl [&_th:last-child]:rounded-tr-xl">
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className={cn(HEAD_CLASS, 'w-[200px]')}>Role</TableHead>
              <TableHead className={cn(HEAD_CLASS, 'w-[90px] text-right')}>Members</TableHead>
              {PERMISSIONS.map((permission) => (
                <TableHead key={permission.key} className={cn(HEAD_CLASS, 'text-center')}>
                  {permission.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {roles.data
              ? roles.data.map((role) => (
                  <TableRow
                    key={role.id}
                    tabIndex={0}
                    onClick={() => onOpen(role.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        onOpen(role.id);
                      }
                    }}
                    aria-label={`Open role ${role.name}`}
                    className="cursor-pointer border-border-faint hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                  >
                    <TableCell className={cn(CELL_CLASS, 'font-semibold')}>{role.name}</TableCell>
                    <TableCell className={cn(CELL_CLASS, 'text-right tabular-nums')}>
                      {usage.get(role.id) ?? 0}
                    </TableCell>
                    {PERMISSIONS.map((permission) => {
                      const granted = role.permissions.includes(permission.key);
                      return (
                        <TableCell key={permission.key} className={cn(CELL_CLASS, 'text-center')}>
                          {granted ? (
                            <CheckIcon
                              className="inline size-4 text-success"
                              aria-label="Granted"
                            />
                          ) : (
                            <MinusIcon
                              className="inline size-4 text-foreground-faint"
                              aria-label="Not granted"
                            />
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))
              : Array.from({ length: 4 }, (_, index) => (
                  <TableRow key={index} className="border-border-faint hover:bg-transparent">
                    <TableCell className={CELL_CLASS} colSpan={2 + PERMISSIONS.length}>
                      <Skeleton className="h-4 w-1/2" />
                    </TableCell>
                  </TableRow>
                ))}
            {roles.data && (
              <TableRow className="border-0 hover:bg-muted">
                <TableCell colSpan={2 + PERMISSIONS.length} className="p-0">
                  <button
                    type="button"
                    onClick={onCreate}
                    className="flex w-full items-center gap-1.5 px-3 py-2 text-sm text-foreground-faint hover:text-foreground"
                  >
                    <PlusIcon className="size-3.5" /> New role
                  </button>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </QueryContent>
  );
}
