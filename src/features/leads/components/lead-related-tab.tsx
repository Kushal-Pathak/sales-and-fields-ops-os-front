import type { ReactNode } from 'react';
import { CalendarIcon, type LucideIcon } from 'lucide-react';
import { EmptyState } from '@/components/common/empty-state';
import { StatusBadge } from '@/components/common/status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { LeadQuoteList } from '@/features/quotes';
import { LeadTaskList } from '@/features/tasks';
import { useUsers, useWorkspace } from '@/features/workspace';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useLeadAppointments } from '../hooks/use-lead-related';
import { APPOINTMENT_STATUS_COLOR, humanize } from '../utils/related-status';

/**
 * The lead's tasks and quotes (owned by their features), and a read-only list of
 * appointments until that section is built.
 */

export function LeadTasksTab({ leadId }: { leadId: string }) {
  return <LeadTaskList leadId={leadId} withCreate />;
}

export function LeadQuotesTab({ leadId }: { leadId: string }) {
  return <LeadQuoteList leadId={leadId} />;
}

export function LeadAppointmentsTab({ leadId }: { leadId: string }) {
  const appointments = useLeadAppointments(leadId);
  const users = useUsers().data ?? [];
  const locale = useWorkspace().data?.locale;

  return (
    <RelatedList
      isPending={appointments.isPending}
      isEmpty={appointments.data?.length === 0}
      icon={CalendarIcon}
      emptyTitle="No appointments for this lead"
      emptyHint="Appointments are scheduled in the Appointments section, coming in a later step."
    >
      {(appointments.data ?? []).map((appointment) => (
        <RelatedRow
          key={appointment.id}
          title={formatDate(appointment.startAt, 'datetime', locale)}
          meta={[
            appointment.location,
            users.find((user) => user.id === appointment.assigneeId)?.name,
          ]}
          badge={
            <StatusBadge color={APPOINTMENT_STATUS_COLOR[appointment.status]}>
              {humanize(appointment.status)}
            </StatusBadge>
          }
        />
      ))}
    </RelatedList>
  );
}

interface RelatedListProps {
  isPending: boolean;
  isEmpty: boolean;
  icon: LucideIcon;
  emptyTitle: string;
  emptyHint: string;
  children: ReactNode;
}

function RelatedList({
  isPending,
  isEmpty,
  icon,
  emptyTitle,
  emptyHint,
  children,
}: RelatedListProps) {
  if (isPending) {
    return (
      <ul className="flex flex-col">
        {Array.from({ length: 3 }, (_, index) => (
          <li
            key={index}
            className="flex items-center gap-3 border-b border-border-faint py-2.5 last:border-0"
          >
            <div className="flex flex-1 flex-col gap-1.5">
              <Skeleton className="h-3.5 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-5 w-16" />
          </li>
        ))}
      </ul>
    );
  }
  if (isEmpty) {
    return <EmptyState icon={icon} title={emptyTitle} hint={emptyHint} className="p-2 pt-6" />;
  }
  return <ul className="flex flex-col">{children}</ul>;
}

interface RelatedRowProps {
  title: string;
  meta: (string | undefined | false)[];
  metaClassName?: string | undefined;
  badge: ReactNode;
  trailing?: ReactNode;
}

function RelatedRow({ title, meta, metaClassName, badge, trailing }: RelatedRowProps) {
  return (
    <li className="flex items-center gap-3 border-b border-border-faint py-2.5 last:border-0">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{title}</p>
        <p className={cn('mt-0.5 truncate text-xs text-foreground-faint', metaClassName)}>
          {meta.filter(Boolean).join(' · ')}
        </p>
      </div>
      {trailing}
      {badge}
    </li>
  );
}
