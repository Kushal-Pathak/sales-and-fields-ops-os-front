import {
  isTaskOverdue,
  quoteTotals,
  type Appointment,
  type Contact,
  type Lead,
  type Quote,
  type Stage,
  type Task,
  type User,
} from '@/types/domain';

export interface DashboardRefs {
  leads: Lead[];
  contacts: Contact[];
  users: User[];
  stages: Stage[];
  tasks: Task[];
  appointments: Appointment[];
  quotes: Quote[];
}

export interface DashboardStats {
  newLeadsToday: number;
  hotLeads: number;
  appointmentsToday: number;
  quotesPending: number;
  wonThisMonth: { count: number; value: number };
  overdueTasks: number;
}

export interface FollowUpRow {
  lead: Lead;
  contact: Contact | undefined;
  stage: Stage | undefined;
  /** True when the next action date has already passed. */
  overdue: boolean;
}

export interface AppointmentRow {
  appointment: Appointment;
  contact: Contact | undefined;
  assignee: User | undefined;
}

export interface QuoteRow {
  quote: Quote;
  contact: Contact | undefined;
  createdBy: User | undefined;
  total: number;
}

export interface OverdueTaskRow {
  task: Task;
  contact: Contact | undefined;
  assignee: User | undefined;
}

export interface PipelineCell {
  stage: Stage;
  count: number;
  total: number;
}

export interface DashboardModel {
  stats: DashboardStats;
  followUps: { rows: FollowUpRow[]; total: number };
  appointments: { rows: AppointmentRow[]; total: number };
  quotes: { rows: QuoteRow[]; total: number };
  overdueTasks: { rows: OverdueTaskRow[]; total: number };
  pipeline: PipelineCell[];
}

const PANEL_LIMIT = 5;

function sameLocalDay(iso: string, now: Date): boolean {
  const date = new Date(iso);
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function sameMonth(iso: string, now: Date): boolean {
  const date = new Date(iso);
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
}

function endOfDay(now: Date): Date {
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return end;
}

/** Everything the dashboard shows, derived from the collections in one pass. Pure and tested. */
export function buildDashboard(refs: DashboardRefs, now = new Date()): DashboardModel {
  const contacts = new Map(refs.contacts.map((row) => [row.id, row]));
  const users = new Map(refs.users.map((row) => [row.id, row]));
  const stages = new Map(refs.stages.map((row) => [row.id, row]));
  const leads = new Map(refs.leads.map((row) => [row.id, row]));
  const stageOf = (lead: Lead) => stages.get(lead.stageId);
  const isOpen = (lead: Lead) => stageOf(lead)?.kind === 'open';
  const todayEnd = endOfDay(now);

  const wonLeads = refs.leads.filter(
    (lead) => stageOf(lead)?.kind === 'won' && sameMonth(lead.lastActivityAt, now),
  );

  const followUpLeads = refs.leads
    .filter((lead) => isOpen(lead) && lead.nextActionAt && new Date(lead.nextActionAt) <= todayEnd)
    .sort((a, b) => a.nextActionAt!.localeCompare(b.nextActionAt!));

  const appointmentsToday = refs.appointments
    .filter((row) => row.status === 'scheduled' && sameLocalDay(row.startAt, now))
    .sort((a, b) => a.startAt.localeCompare(b.startAt));

  const pendingQuotes = refs.quotes
    .filter((row) => row.status === 'pending_approval')
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const overdue = refs.tasks
    .filter((task) => isTaskOverdue(task, now))
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt));

  const pipeline = [...refs.stages]
    .sort((a, b) => a.order - b.order)
    .filter((stage) => stage.kind !== 'lost')
    .map<PipelineCell>((stage) => {
      const inStage = refs.leads.filter((lead) => lead.stageId === stage.id);
      return {
        stage,
        count: inStage.length,
        total: inStage.reduce((sum, lead) => sum + (lead.value ?? 0), 0),
      };
    });

  return {
    stats: {
      newLeadsToday: refs.leads.filter((lead) => sameLocalDay(lead.createdAt, now)).length,
      hotLeads: refs.leads.filter((lead) => lead.priority === 'high' && isOpen(lead)).length,
      appointmentsToday: appointmentsToday.length,
      quotesPending: pendingQuotes.length,
      wonThisMonth: {
        count: wonLeads.length,
        value: wonLeads.reduce((sum, lead) => sum + (lead.value ?? 0), 0),
      },
      overdueTasks: overdue.length,
    },
    followUps: {
      total: followUpLeads.length,
      rows: followUpLeads.slice(0, PANEL_LIMIT).map((lead) => ({
        lead,
        contact: contacts.get(lead.contactId),
        stage: stageOf(lead),
        overdue: new Date(lead.nextActionAt!) < now,
      })),
    },
    appointments: {
      total: appointmentsToday.length,
      rows: appointmentsToday.slice(0, PANEL_LIMIT).map((appointment) => ({
        appointment,
        contact: contacts.get(appointment.contactId),
        assignee: users.get(appointment.assigneeId),
      })),
    },
    quotes: {
      total: pendingQuotes.length,
      rows: pendingQuotes.slice(0, PANEL_LIMIT).map((quote) => ({
        quote,
        contact: contacts.get(quote.contactId),
        createdBy: users.get(quote.createdById),
        total: quoteTotals(quote).total,
      })),
    },
    overdueTasks: {
      total: overdue.length,
      rows: overdue.slice(0, PANEL_LIMIT).map((task) => {
        const lead = task.leadId ? leads.get(task.leadId) : undefined;
        const contactId = task.contactId ?? lead?.contactId;
        return {
          task,
          contact: contactId ? contacts.get(contactId) : undefined,
          assignee: users.get(task.assigneeId),
        };
      }),
    },
    pipeline,
  };
}
