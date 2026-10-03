import { QueryContent } from '@/components/common/query-content';
import { UsersIcon } from 'lucide-react';
import { EmptyState } from '@/components/common/empty-state';
import { InitialsAvatar } from '@/components/common/initials-avatar';
import { StatusBadge } from '@/components/common/status-badge';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useWorkspace } from '@/features/workspace';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { MemberRow } from '../utils/team-model';

interface MembersTableProps {
  rows: MemberRow[] | undefined;
  isPending: boolean;
  error: unknown;
  onOpen: (userId: string) => void;
  onRetry: () => void;
}

const COLUMNS = [
  'Member',
  'Role',
  'Email',
  'Phone',
  'Status',
  'Open leads',
  'Open tasks',
  'Joined',
];
const HEAD_CLASS = 'h-8 px-3 text-xs font-semibold text-muted-foreground';
const CELL_CLASS = 'px-3 py-1.5';

export function MembersTable({ rows, isPending, error, onOpen, onRetry }: MembersTableProps) {
  const locale = useWorkspace().data?.locale;

  if (!isPending && rows && rows.length === 0)
    return (
      <QueryContent
        error={error}
        hasData={rows !== undefined}
        title="Team could not be loaded"
        onRetry={onRetry}
      >
        <EmptyState
          icon={UsersIcon}
          title="No members match"
          hint="Try another search or filter."
        />
      </QueryContent>
    );

  return (
    <QueryContent
      error={error}
      hasData={rows !== undefined}
      title="Team could not be loaded"
      onRetry={onRetry}
    >
      <Table containerClassName="overflow-visible" className="min-w-[1100px]">
        <TableHeader className="[&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-background">
          <TableRow className="border-border hover:bg-transparent">
            {COLUMNS.map((column, index) => (
              <TableHead
                key={column}
                className={cn(HEAD_CLASS, index >= 5 && index <= 6 && 'text-right')}
              >
                {column}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isPending || !rows
            ? Array.from({ length: 5 }, (_, index) => (
                <TableRow key={index} className="border-border-faint hover:bg-transparent">
                  {COLUMNS.map((column) => (
                    <TableCell key={column} className={CELL_CLASS}>
                      <Skeleton className="h-4 w-3/4" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            : rows.map(({ user, role, openLeads, openTasks }) => (
                <TableRow
                  key={user.id}
                  tabIndex={0}
                  onClick={() => onOpen(user.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      onOpen(user.id);
                    }
                  }}
                  aria-label={`Open member ${user.name}`}
                  className={cn(
                    'cursor-pointer border-border-faint hover:bg-muted focus-visible:bg-muted focus-visible:outline-none',
                    !user.active && 'text-muted-foreground',
                  )}
                >
                  <TableCell className={CELL_CLASS}>
                    <span className="flex items-center gap-2">
                      <InitialsAvatar size="sm" name={user.name} color={user.color} />
                      <span className="font-semibold">{user.name}</span>
                    </span>
                  </TableCell>
                  <TableCell className={CELL_CLASS}>
                    {role ? <Badge variant="neutral">{role.name}</Badge> : '—'}
                  </TableCell>
                  <TableCell className={cn(CELL_CLASS, 'text-foreground-secondary')}>
                    {user.email}
                  </TableCell>
                  <TableCell className={cn(CELL_CLASS, 'text-foreground-secondary')}>
                    {user.phone ?? '—'}
                  </TableCell>
                  <TableCell className={CELL_CLASS}>
                    <StatusBadge color={user.active ? 'success' : 'neutral'}>
                      {user.active ? 'Active' : 'Inactive'}
                    </StatusBadge>
                  </TableCell>
                  <TableCell className={cn(CELL_CLASS, 'text-right tabular-nums')}>
                    {openLeads}
                  </TableCell>
                  <TableCell className={cn(CELL_CLASS, 'text-right tabular-nums')}>
                    {openTasks ?? '—'}
                  </TableCell>
                  <TableCell className={cn(CELL_CLASS, 'text-xs text-foreground-faint')}>
                    {formatDate(user.createdAt, 'date', locale)}
                  </TableCell>
                </TableRow>
              ))}
        </TableBody>
      </Table>
    </QueryContent>
  );
}
