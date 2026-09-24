import { useState, type ReactNode } from 'react';
import { CalendarPlusIcon, ExternalLinkIcon, FileTextIcon, PlusIcon } from 'lucide-react';
import { Link } from 'react-router';
import { InitialsAvatar } from '@/components/common/initials-avatar';
import { StatusBadge } from '@/components/common/status-badge';
import { Button } from '@/components/ui/button';
import { AppointmentFormDialog } from '@/features/appointments';
import { LeadTaskList, TaskFormDialog } from '@/features/tasks';
import { useWorkspace } from '@/features/workspace';
import { formatMoney } from '@/lib/format';
import type { ConversationRow } from '../utils/inbox-view-model';

/** The right rail: the contact, the lead and quick actions on it. */
export function ContextRail({ row }: { row: ConversationRow }) {
  const { contact, lead, stage, owner } = row;
  const workspace = useWorkspace().data;
  const [creatingTask, setCreatingTask] = useState(false);
  const [scheduling, setScheduling] = useState(false);

  return (
    <div className="flex flex-col gap-4 p-3.5">
      <section>
        <h2 className="text-sm font-bold">{contact?.name ?? 'Unknown contact'}</h2>
        <dl className="mt-2 flex flex-col gap-2">
          <Field label="Company">{contact?.company}</Field>
          <Field label="Phone">
            {contact?.phone && (
              <a href={`tel:${contact.phone}`} className="hover:underline">
                {contact.phone}
              </a>
            )}
          </Field>
          <Field label="Email">
            {contact?.email && (
              <a href={`mailto:${contact.email}`} className="truncate hover:underline">
                {contact.email}
              </a>
            )}
          </Field>
        </dl>
      </section>

      {lead && (
        <section className="border-t pt-4">
          <h2 className="text-2xs font-bold tracking-wider text-foreground-faint uppercase">
            Lead
          </h2>
          <p className="mt-1 text-sm font-semibold">{lead.title}</p>
          <dl className="mt-2 flex flex-col gap-2">
            <Field label="Stage">
              {stage && <StatusBadge color={stage.color}>{stage.name}</StatusBadge>}
            </Field>
            <Field label="Owner">
              {owner && (
                <span className="flex items-center gap-1.5">
                  <InitialsAvatar size="sm" name={owner.name} color={owner.color} />
                  {owner.name}
                </span>
              )}
            </Field>
            <Field label="Value">
              {lead.value !== undefined &&
                formatMoney(lead.value, {
                  currency: workspace?.currency ?? 'USD',
                  locale: workspace?.locale,
                })}
            </Field>
          </dl>

          <h3 className="mt-4 text-2xs font-bold tracking-wider text-foreground-faint uppercase">
            Open tasks
          </h3>
          <div className="mt-1">
            <LeadTaskList leadId={lead.id} openOnly />
          </div>

          <h3 className="mt-4 text-2xs font-bold tracking-wider text-foreground-faint uppercase">
            Quick actions
          </h3>
          <div className="mt-1.5 flex flex-col gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="justify-start"
              onClick={() => setCreatingTask(true)}
            >
              <PlusIcon /> Create task
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="justify-start"
              onClick={() => setScheduling(true)}
            >
              <CalendarPlusIcon /> Schedule appointment
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="justify-start"
              nativeButton={false}
              render={<Link to={`/quotes/new?lead=${lead.id}`} />}
            >
              <FileTextIcon /> New quote
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="justify-start"
              nativeButton={false}
              render={<Link to={`/leads?lead=${lead.id}`} />}
            >
              <ExternalLinkIcon /> Open lead
            </Button>
          </div>

          <TaskFormDialog
            open={creatingTask}
            onOpenChange={setCreatingTask}
            defaultLeadId={lead.id}
          />
          <AppointmentFormDialog
            open={scheduling}
            onOpenChange={setScheduling}
            defaultLeadId={lead.id}
          />
        </section>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children?: ReactNode }) {
  const empty = children === undefined || children === null || children === false;
  return (
    <div className="min-w-0">
      <dt className="text-2xs font-bold tracking-wider text-foreground-faint uppercase">{label}</dt>
      <dd className={empty ? 'text-sm text-foreground-faint' : 'truncate text-sm'}>
        {empty ? '—' : children}
      </dd>
    </div>
  );
}
