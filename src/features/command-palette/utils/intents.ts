import { addDays, isSameDay, startOfDay } from '@/lib/dates';
import {
  isTaskOverdue,
  type Appointment,
  type Contact,
  type Conversation,
  type Lead,
  type Message,
  type ModuleId,
  type Quote,
  type Stage,
  type StatusColor,
  type Task,
  type TaskType,
  type User,
} from '@/types/domain';

/**
 * The questions the palette answers locally. Parsing and answering are pure so
 * they are tested without React; a backend assistant handles everything else.
 */

export interface IntentRefs {
  leads: Lead[];
  contacts: Contact[];
  tasks: Task[];
  quotes: Quote[];
  appointments: Appointment[];
  conversations: Conversation[];
  messages: Message[];
  users: User[];
  stages: Stage[];
}

export type Intent =
  | { type: 'overdue_tasks' }
  | { type: 'leads_without_follow_up' }
  | { type: 'today' }
  | { type: 'hot_leads' }
  | { type: 'pending_quotes' }
  | { type: 'unread_messages' }
  | {
      type: 'create_task';
      contact: Contact;
      lead: Lead | undefined;
      taskType: TaskType;
      title: string;
      dueAt: string;
    }
  | { type: 'assign_hot_leads'; owner: User };

export type IntentType = Intent['type'];

/** The module each intent reads or acts on. The palette drops an intent whose module is closed. */
export const INTENT_MODULE: Record<IntentType, ModuleId> = {
  overdue_tasks: 'tasks',
  leads_without_follow_up: 'leads',
  today: 'calendar',
  hot_leads: 'leads',
  pending_quotes: 'quotes',
  unread_messages: 'inbox',
  create_task: 'tasks',
  assign_hot_leads: 'leads',
};

export interface AnswerRow {
  id: string;
  title: string;
  subtitle: string;
  to: string;
  badge?: { label: string; color: StatusColor } | undefined;
}

export interface IntentAnswer {
  title: string;
  total: number;
  rows: AnswerRow[];
  /** Where "Open list" goes. */
  to: string;
  listLabel: string;
  empty: string;
}

export const SUGGESTED_QUERIES: { text: string; module: ModuleId; risky?: boolean }[] = [
  { text: 'Show overdue tasks', module: 'tasks' },
  { text: 'Find leads without follow-up this week', module: 'leads' },
  { text: 'Summarise today’s messages', module: 'inbox' },
  { text: 'Assign all hot leads to Jordan', module: 'leads', risky: true },
];

const MAX_ROWS = 5;

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function findPerson<T extends { name: string }>(rows: T[], text: string): T | undefined {
  const words = normalize(text).split(' ').filter(Boolean);
  if (words.length === 0) return undefined;
  const full = words.join(' ');
  return (
    rows.find((row) => normalize(row.name) === full) ??
    rows.find((row) => normalize(row.name).split(' ')[0] === words[0]) ??
    rows.find((row) => normalize(row.name).includes(full))
  );
}

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

/** "tomorrow", "in 3 days", "next week", "on friday", "today" → 9:00 that day. */
export function parseDueDate(text: string, now: Date): { dueAt: Date; matched: string } | null {
  const lower = normalize(text);
  const at = (days: number) => {
    const date = addDays(startOfDay(now), days);
    date.setHours(9, 0, 0, 0);
    return date;
  };
  const patterns: [RegExp, (match: RegExpMatchArray) => Date][] = [
    [/\btomorrow\b/, () => at(1)],
    [/\btoday\b/, () => at(0)],
    [/\bin (\d+) days?\b/, (match) => at(Number(match[1]))],
    [/\bnext week\b/, () => at(7)],
    [
      /\b(?:on |next )?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/,
      (match) => {
        const target = WEEKDAYS.indexOf(match[1]!);
        const diff = (target - now.getDay() + 7) % 7 || 7;
        return at(diff);
      },
    ],
  ];
  for (const [pattern, resolve] of patterns) {
    const match = lower.match(pattern);
    if (match) return { dueAt: resolve(match), matched: match[0] };
  }
  return null;
}

const TASK_TYPE_WORDS: [RegExp, TaskType, string][] = [
  [/follow ?up/, 'follow_up', 'Follow up with'],
  [/\bcall\b/, 'call', 'Call'],
  [/\bmeeting\b/, 'meeting', 'Meet with'],
  [/\bquote\b/, 'quote', 'Send quote to'],
];

export function parseIntent(rawText: string, refs: IntentRefs, now = new Date()): Intent | null {
  const text = normalize(rawText);
  if (!text) return null;

  const assign = text.match(/^(?:please )?(?:re)?assign (?:all )?(?:the )?hot leads to (.+)$/);
  if (assign) {
    const owner = findPerson(
      refs.users.filter((user) => user.active),
      assign[1]!,
    );
    return owner ? { type: 'assign_hot_leads', owner } : null;
  }

  const create = text.match(
    /^(?:please )?(?:create|add|make|set up) (?:a |an )?(.*?)task (?:for|with|on) (.+)$/,
  );
  if (create) {
    const due = parseDueDate(create[2]!, now);
    const who = due
      ? create[2]!
          .replace(due.matched, '')
          .replace(/\b(on|by)\b\s*$/, '')
          .trim()
      : create[2]!;
    const contact = findPerson(refs.contacts, who);
    if (!contact) return null;
    const kind = TASK_TYPE_WORDS.find(([pattern]) => pattern.test(create[1]!)) ?? [
      /x/,
      'general',
      'Follow up with',
    ];
    const lead = [...refs.leads]
      .filter((row) => row.contactId === contact.id)
      .sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt))[0];
    const dueAt =
      due?.dueAt ??
      (() => {
        const date = addDays(startOfDay(now), 1);
        date.setHours(9, 0, 0, 0);
        return date;
      })();
    return {
      type: 'create_task',
      contact,
      lead,
      taskType: kind[1],
      title: `${kind[2]} ${contact.name}`,
      dueAt: dueAt.toISOString(),
    };
  }

  if (/\boverdue\b/.test(text) && !/appointment/.test(text)) return { type: 'overdue_tasks' };
  if (
    /(without|no|missing) (a )?(follow ?up|next action)|stale leads|need(s)? (a )?follow ?up/.test(
      text,
    )
  )
    return { type: 'leads_without_follow_up' };
  if (/\bhot leads?\b|high priority leads/.test(text)) return { type: 'hot_leads' };
  if (
    /quotes? (pending|awaiting|waiting)|pending quotes|awaiting approval|approve quotes/.test(text)
  )
    return { type: 'pending_quotes' };
  if (/(summari[sz]e|unread|inbox|replies|messages|conversations)/.test(text))
    return { type: 'unread_messages' };
  if (/\btoday\b|my day|whats on|agenda|schedule/.test(text)) return { type: 'today' };
  return null;
}

/** The read-only answers. `create_task` and `assign_hot_leads` are handled by the panel. */
export function answerIntent(
  intent: Intent,
  refs: IntentRefs,
  now = new Date(),
): IntentAnswer | null {
  const contacts = new Map(refs.contacts.map((row) => [row.id, row]));
  const stages = new Map(refs.stages.map((row) => [row.id, row]));
  const users = new Map(refs.users.map((row) => [row.id, row]));
  const contactName = (id: string | undefined) => (id ? contacts.get(id)?.name : undefined) ?? '';
  const pick = <T>(
    rows: T[],
    toRow: (row: T) => AnswerRow,
    title: string,
    to: string,
    listLabel: string,
    empty: string,
  ): IntentAnswer => ({
    title,
    total: rows.length,
    rows: rows.slice(0, MAX_ROWS).map(toRow),
    to,
    listLabel,
    empty,
  });

  switch (intent.type) {
    case 'overdue_tasks': {
      const rows = refs.tasks
        .filter((task) => isTaskOverdue(task, now))
        .sort((a, b) => a.dueAt.localeCompare(b.dueAt));
      return pick(
        rows,
        (task) => ({
          id: task.id,
          title: task.title,
          subtitle: [contactName(task.contactId), users.get(task.assigneeId)?.name]
            .filter(Boolean)
            .join(' · '),
          to: `/tasks?view=overdue&task=${task.id}`,
          badge: { label: 'Overdue', color: 'destructive' },
        }),
        rows.length === 1 ? '1 overdue task' : `${rows.length} overdue tasks`,
        '/tasks?view=overdue',
        'Open overdue tasks',
        'Nothing is overdue.',
      );
    }
    case 'leads_without_follow_up': {
      const open = new Set(
        refs.stages.filter((stage) => stage.kind === 'open').map((stage) => stage.id),
      );
      const rows = refs.leads
        .filter(
          (lead) =>
            open.has(lead.stageId) && (!lead.nextActionAt || new Date(lead.nextActionAt) < now),
        )
        .sort((a, b) => a.lastActivityAt.localeCompare(b.lastActivityAt));
      return pick(
        rows,
        (lead) => {
          const stage = stages.get(lead.stageId);
          return {
            id: lead.id,
            title: contactName(lead.contactId) || lead.title,
            subtitle: lead.nextActionAt
              ? `${lead.title} · follow-up overdue`
              : `${lead.title} · no next action`,
            to: `/leads?lead=${lead.id}`,
            badge: stage && { label: stage.name, color: stage.color },
          };
        },
        rows.length === 1
          ? '1 open lead needs a follow-up'
          : `${rows.length} open leads need a follow-up`,
        '/leads?sort=activity',
        'Open leads',
        'Every open lead has a next action planned.',
      );
    }
    case 'today': {
      const appointments = refs.appointments
        .filter((row) => row.status === 'scheduled' && isSameDay(new Date(row.startAt), now))
        .map<AnswerRow>((row) => ({
          id: row.id,
          title: contactName(row.contactId) || 'Appointment',
          subtitle: `${new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(row.startAt))}${row.location ? ` · ${row.location}` : ''}`,
          to: `/appointments?view=today&appointment=${row.id}`,
          badge: { label: 'Appointment', color: 'highlight' },
        }));
      const tasks = refs.tasks
        .filter(
          (task) =>
            (task.status === 'pending' || task.status === 'in_progress') &&
            isSameDay(new Date(task.dueAt), now),
        )
        .map<AnswerRow>((task) => ({
          id: task.id,
          title: task.title,
          subtitle: contactName(task.contactId) || 'Task',
          to: `/tasks?view=today&task=${task.id}`,
          badge: { label: 'Task', color: 'info' },
        }));
      const rows = [...appointments, ...tasks];
      return {
        title: `Today: ${appointments.length} appointment${appointments.length === 1 ? '' : 's'}, ${tasks.length} task${tasks.length === 1 ? '' : 's'}`,
        total: rows.length,
        rows: rows.slice(0, MAX_ROWS),
        to: '/calendar',
        listLabel: 'Open calendar',
        empty: 'Nothing scheduled for today.',
      };
    }
    case 'hot_leads': {
      const open = new Set(
        refs.stages.filter((stage) => stage.kind === 'open').map((stage) => stage.id),
      );
      const rows = refs.leads.filter((lead) => lead.priority === 'high' && open.has(lead.stageId));
      return pick(
        rows,
        (lead) => {
          const stage = stages.get(lead.stageId);
          return {
            id: lead.id,
            title: contactName(lead.contactId) || lead.title,
            subtitle: `${lead.title} · ${users.get(lead.ownerId)?.name ?? 'Unassigned'}`,
            to: `/leads?view=hot&lead=${lead.id}`,
            badge: stage && { label: stage.name, color: stage.color },
          };
        },
        rows.length === 1 ? '1 hot lead' : `${rows.length} hot leads`,
        '/leads?view=hot',
        'Open hot leads',
        'No high-priority open leads.',
      );
    }
    case 'pending_quotes': {
      const rows = refs.quotes.filter((quote) => quote.status === 'pending_approval');
      return pick(
        rows,
        (quote) => ({
          id: quote.id,
          title: `${quote.number} · ${contactName(quote.contactId)}`,
          subtitle: users.get(quote.createdById)?.name ?? '',
          to: `/quotes?view=pending&quote=${quote.id}`,
          badge: { label: 'Pending approval', color: 'warning' },
        }),
        rows.length === 1 ? '1 quote awaiting approval' : `${rows.length} quotes awaiting approval`,
        '/quotes?view=pending',
        'Open quotes',
        'No quotes are waiting for approval.',
      );
    }
    case 'unread_messages': {
      const latest = new Map<string, Message>();
      for (const message of refs.messages) {
        const current = latest.get(message.conversationId);
        if (!current || message.sentAt > current.sentAt)
          latest.set(message.conversationId, message);
      }
      const rows = refs.conversations
        .filter((row) => row.unreadCount > 0)
        .sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt));
      return pick(
        rows,
        (conversation) => ({
          id: conversation.id,
          title: contactName(conversation.contactId) || 'Conversation',
          subtitle: latest.get(conversation.id)?.body ?? '',
          to: `/inbox?c=${conversation.id}`,
          badge: { label: `${conversation.unreadCount} unread`, color: 'success' },
        }),
        rows.length === 1
          ? '1 conversation waiting for a reply'
          : `${rows.length} conversations waiting for a reply`,
        '/inbox?view=unread',
        'Open inbox',
        'You are all caught up.',
      );
    }
    case 'create_task':
    case 'assign_hot_leads':
      return null;
  }
}

/** Leads a bulk assignment would touch, with the confirmation copy. */
export function hotLeadsToAssign(owner: User, refs: IntentRefs) {
  const open = new Set(
    refs.stages.filter((stage) => stage.kind === 'open').map((stage) => stage.id),
  );
  const leads = refs.leads.filter(
    (lead) => lead.priority === 'high' && open.has(lead.stageId) && lead.ownerId !== owner.id,
  );
  return {
    leadIds: leads.map((lead) => lead.id),
    confirmText:
      leads.length === 0
        ? `${owner.name} already owns every hot lead.`
        : `This will reassign ${leads.length} hot lead${leads.length === 1 ? '' : 's'} to ${owner.name}. Continue?`,
  };
}
