import type { ReactNode } from 'react';
import { InitialsAvatar } from '@/components/common/initials-avatar';
import { StatusDot } from '@/components/common/status-dot';
import { CustomFieldValues } from '@/features/custom-fields';
import { LeadTaskList } from '@/features/tasks';
import { useWorkspace } from '@/features/workspace';
import { formatDate, formatMoney } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { LeadRow } from '../utils/lead-view-model';
import { PRIORITY_COLOR, PRIORITY_LABEL } from '../utils/priority';

/** The drawer's first tab: contact and lead fields, notes, and (when Tasks is open to the user) the lead's open tasks. */
export function LeadOverviewTab({ row, showTasks }: { row: LeadRow; showTasks: boolean }) {
  const { lead, contact, owner } = row;
  const workspace = useWorkspace().data;
  const locale = workspace?.locale;

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

      <CustomFieldValues entity="lead" values={lead.custom} title="Details" />
      <CustomFieldValues entity="contact" values={contact?.custom} title="Contact details" />

      {lead.notes && (
        <section>
          <SectionTitle>Notes</SectionTitle>
          <p className="text-sm whitespace-pre-wrap text-foreground-secondary">{lead.notes}</p>
        </section>
      )}

      {showTasks && (
        <section>
          <SectionTitle>Open tasks</SectionTitle>
          <LeadTaskList leadId={lead.id} openOnly />
        </section>
      )}
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
