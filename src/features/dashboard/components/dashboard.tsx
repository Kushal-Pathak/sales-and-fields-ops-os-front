import { AlertCircleIcon, CalendarIcon, ClockIcon, FileTextIcon } from 'lucide-react';
import { ErrorState } from '@/components/common/empty-state';
import { InitialsAvatar } from '@/components/common/initials-avatar';
import { StatusBadge } from '@/components/common/status-badge';
import { useWorkspace } from '@/features/workspace';
import { formatDate, formatMoney } from '@/lib/format';
import { useDashboard } from '../hooks/use-dashboard';
import { DashboardPanel, PanelRow } from './dashboard-panel';
import { PipelineStrip } from './pipeline-strip';
import { StatTiles } from './stat-tiles';

/** Tiles, the pipeline strip and the four "what needs attention" panels. */
export function Dashboard() {
  const { model, isPending, error, refetch } = useDashboard();
  const workspace = useWorkspace().data;
  const locale = workspace?.locale;
  const money = (amount: number, currency = workspace?.currency ?? 'USD') =>
    formatMoney(amount, { currency, locale });

  if (error)
    return (
      <ErrorState
        title="Dashboard could not be loaded"
        error={error}
        onRetry={() => void refetch()}
      />
    );

  return (
    <div className="flex flex-col gap-4">
      <StatTiles stats={model?.stats} />
      <PipelineStrip cells={model?.pipeline} />

      <div className="grid gap-3 lg:grid-cols-2">
        <DashboardPanel
          icon={ClockIcon}
          title="Follow-ups due"
          count={model?.followUps.total}
          to="/leads"
          emptyText="No follow-ups due today."
          isPending={isPending}
        >
          {model?.followUps.rows.map(({ lead, contact, stage, overdue }) => (
            <PanelRow
              key={lead.id}
              to={`/leads?lead=${lead.id}`}
              leading={<InitialsAvatar size="sm" name={contact?.name ?? '?'} />}
              title={contact?.name ?? lead.title}
              meta={`${lead.nextAction ?? lead.title} · ${formatDate(lead.nextActionAt!, 'monthDay', locale)}`}
              trailing={
                <span className="flex items-center gap-1.5">
                  {overdue && (
                    <span className="text-xs font-semibold text-destructive">Overdue</span>
                  )}
                  {stage && <StatusBadge color={stage.color}>{stage.name}</StatusBadge>}
                </span>
              }
            />
          ))}
        </DashboardPanel>

        <DashboardPanel
          icon={CalendarIcon}
          title="Appointments today"
          count={model?.appointments.total}
          to="/appointments"
          emptyText="Nothing scheduled today."
          isPending={isPending}
        >
          {model?.appointments.rows.map(({ appointment, contact, assignee }) => (
            <PanelRow
              key={appointment.id}
              to={`/leads?lead=${appointment.leadId}`}
              leading={
                <span className="w-16 shrink-0 text-sm font-semibold tabular-nums">
                  {formatDate(appointment.startAt, 'time', locale)}
                </span>
              }
              title={contact?.name ?? 'Appointment'}
              meta={[appointment.location, assignee?.name].filter(Boolean).join(' · ')}
              trailing={<StatusBadge color="info">Scheduled</StatusBadge>}
            />
          ))}
        </DashboardPanel>

        <DashboardPanel
          icon={FileTextIcon}
          title="Quotes pending approval"
          count={model?.quotes.total}
          to="/quotes?view=pending"
          emptyText="No quotes waiting for approval."
          isPending={isPending}
        >
          {model?.quotes.rows.map(({ quote, contact, createdBy, total }) => (
            <PanelRow
              key={quote.id}
              to={`/quotes?view=pending&quote=${quote.id}`}
              title={contact?.name ?? quote.number}
              meta={`${quote.number} · ${createdBy?.name ?? 'Unknown'}`}
              trailing={
                <span className="text-sm font-semibold tabular-nums">
                  {money(total, quote.currency)}
                </span>
              }
            />
          ))}
        </DashboardPanel>

        <DashboardPanel
          icon={AlertCircleIcon}
          title="Overdue tasks"
          count={model?.overdueTasks.total}
          to="/tasks?view=overdue"
          emptyText="No overdue tasks. Nice."
          isPending={isPending}
        >
          {model?.overdueTasks.rows.map(({ task, contact, assignee }) => (
            <PanelRow
              key={task.id}
              to={`/tasks?view=overdue&task=${task.id}`}
              title={task.title}
              meta={`${contact ? `${contact.name} · ` : ''}Due ${formatDate(task.dueAt, 'datetime', locale)}`}
              trailing={
                assignee && (
                  <InitialsAvatar
                    size="sm"
                    name={assignee.name}
                    color={assignee.color}
                    className="shrink-0"
                  />
                )
              }
            />
          ))}
        </DashboardPanel>
      </div>
    </div>
  );
}
