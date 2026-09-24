import type { ReactNode } from 'react';
import { ClipboardCheckIcon } from 'lucide-react';
import { InitialsAvatar } from '@/components/common/initials-avatar';
import { StatusDot } from '@/components/common/status-dot';
import { useWorkspace } from '@/features/workspace';
import { formatDate, formatMoney } from '@/lib/format';
import { cn } from '@/lib/utils';
import { isTaskOverdue } from '@/types/domain';
import { useLeadTasks } from '../hooks/use-lead-related';
import type { LeadRow } from '../utils/lead-view-model';
import { PRIORITY_COLOR, PRIORITY_LABEL } from '../utils/priority';

/** The drawer's first tab: contact and lead fields, notes, and the lead's open tasks. */
export function LeadOverviewTab({ row }: { row: LeadRow }) {
  const { lead, contact, owner } = row;
  const workspace = useWorkspace().data;
  const locale = workspace?.locale;
  const tasks = useLeadTasks(lead.id).data ?? [];
  const openTasks = tasks.filter(
    (task) => task.status === 'pending' || task.status === 'in_progress',
  );

  return (
    <div className="flex flex-col gap-5">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
        <Field label="Phone">{contact?.phone}</Field>
        <Field label="Email">{contact?.email}</Field>
        <Field label="Company">{contact?.company}</Field>
        <Field label="Address">{contact?.address}</Field>
        <Field label="Source">
          <span className="flex items-center gap-1.5">
            <StatusDot color="neutral" /> {lead.source}
          </span>
        </Field>
        <Field label="Owner">
          {owner && (
            <span className="flex items-center gap-1.5">
              <InitialsAvatar size="sm" name={owner.name} color={owner.color} />
              {owner.name}
            </span>
          )}
        </Field>
        <Field label="Priority">
          <span className="flex items-center gap-1.5">
            <StatusDot color={PRIORITY_COLOR[lead.priority]} /> {PRIORITY_LABEL[lead.priority]}
          </span>
        </Field>
        <Field label="Value">
          {lead.value !== undefined && (
            <span className="font-semibold tabular-nums">
              {formatMoney(lead.value, { currency: workspace?.currency ?? 'USD', locale })}
            </span>
          )}
        </Field>
        <Field label="Next action">
          {lead.nextAction && (
            <>
              {lead.nextAction}
              {lead.nextActionAt && (
                <span className="ml-1.5 text-xs text-foreground-faint">
                  {formatDate(lead.nextActionAt, 'monthDay', locale)}
                </span>
              )}
            </>
          )}
        </Field>
        <Field label="Created">{formatDate(lead.createdAt, 'date', locale)}</Field>
      </dl>

      {lead.notes && (
        <section>
          <SectionTitle>Notes</SectionTitle>
          <p className="text-sm whitespace-pre-wrap text-foreground-secondary">{lead.notes}</p>
        </section>
      )}

      <section>
        <SectionTitle>Open tasks</SectionTitle>
        {openTasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No open tasks.</p>
        ) : (
          <ul className="flex flex-col">
            {openTasks.map((task) => {
              const overdue = isTaskOverdue(task);
              return (
                <li
                  key={task.id}
                  className="flex items-center gap-2 border-b border-border-faint py-1.5 text-sm last:border-0"
                >
                  <ClipboardCheckIcon
                    className={cn(
                      'size-3.5 shrink-0',
                      overdue ? 'text-destructive' : 'text-foreground-faint',
                    )}
                  />
                  <span className="min-w-0 flex-1 truncate">{task.title}</span>
                  <span
                    className={cn(
                      'shrink-0 text-xs',
                      overdue ? 'font-semibold text-destructive' : 'text-foreground-faint',
                    )}
                  >
                    {formatDate(task.dueAt, 'monthDay', locale)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
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

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="mb-2 text-2xs font-bold tracking-wider text-foreground-faint uppercase">
      {children}
    </h3>
  );
}
