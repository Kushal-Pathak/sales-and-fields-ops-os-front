import type { Appointment, Contact, Conversation, Lead, Quote, Stage, Task } from '@/types/domain';

export type RecordKind = 'lead' | 'contact' | 'task' | 'quote' | 'appointment';

export interface RecordResult {
  kind: RecordKind;
  id: string;
  title: string;
  subtitle: string;
  to: string;
  /** Lower comes first. */
  rank: number;
}

export interface SearchRefs {
  leads: Lead[];
  contacts: Contact[];
  tasks: Task[];
  quotes: Quote[];
  appointments: Appointment[];
  conversations: Conversation[];
  stages: Stage[];
}

export const MAX_RESULTS = 8;

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

/** 0 = a field starts with the query, 1 = a word starts with it, 2 = contains it, -1 = no match. */
function score(query: string, fields: (string | undefined)[]): number {
  let best = -1;
  for (const field of fields) {
    if (!field) continue;
    const value = normalize(field);
    let current = -1;
    if (value.startsWith(query)) current = 0;
    else if (value.split(' ').some((word) => word.startsWith(query))) current = 1;
    else if (value.includes(query)) current = 2;
    if (current !== -1 && (best === -1 || current < best)) best = current;
  }
  return best;
}

/** Records matching the query across every collection, best matches first. */
export function searchRecords(rawQuery: string, refs: SearchRefs): RecordResult[] {
  const query = normalize(rawQuery);
  if (query.length < 2) return [];
  const contacts = new Map(refs.contacts.map((row) => [row.id, row]));
  const stages = new Map(refs.stages.map((row) => [row.id, row]));
  const results: RecordResult[] = [];
  const push = (rank: number, result: Omit<RecordResult, 'rank'>) => {
    if (rank !== -1) results.push({ ...result, rank });
  };

  for (const lead of refs.leads) {
    const contact = contacts.get(lead.contactId);
    push(score(query, [contact?.name, lead.title, contact?.company]), {
      kind: 'lead',
      id: lead.id,
      title: contact?.name ?? lead.title,
      subtitle: [lead.title, stages.get(lead.stageId)?.name].filter(Boolean).join(' · '),
      to: `/leads?lead=${lead.id}`,
    });
  }

  const leadByContact = new Map<string, Lead>();
  for (const lead of [...refs.leads].sort((a, b) =>
    b.lastActivityAt.localeCompare(a.lastActivityAt),
  )) {
    if (!leadByContact.has(lead.contactId)) leadByContact.set(lead.contactId, lead);
  }
  for (const contact of refs.contacts) {
    if (leadByContact.has(contact.id)) continue;
    const conversation = refs.conversations.find((row) => row.contactId === contact.id);
    push(score(query, [contact.name, contact.company, contact.email]), {
      kind: 'contact',
      id: contact.id,
      title: contact.name,
      subtitle: contact.company ?? contact.email ?? 'Contact',
      to: conversation ? `/inbox?c=${conversation.id}` : '/leads',
    });
  }

  for (const task of refs.tasks) {
    const contact = task.contactId ? contacts.get(task.contactId) : undefined;
    push(score(query, [task.title]), {
      kind: 'task',
      id: task.id,
      title: task.title,
      subtitle: [contact?.name, task.status.replace('_', ' ')].filter(Boolean).join(' · '),
      to: `/tasks?view=all&task=${task.id}`,
    });
  }

  for (const quote of refs.quotes) {
    const contact = contacts.get(quote.contactId);
    push(score(query, [quote.number, contact?.name]), {
      kind: 'quote',
      id: quote.id,
      title: `${quote.number} · ${contact?.name ?? 'Quote'}`,
      subtitle: quote.status.replace('_', ' '),
      to: `/quotes?quote=${quote.id}`,
    });
  }

  for (const appointment of refs.appointments) {
    const contact = contacts.get(appointment.contactId);
    push(score(query, [contact?.name, appointment.location]), {
      kind: 'appointment',
      id: appointment.id,
      title: contact?.name ?? 'Appointment',
      subtitle: [appointment.location, appointment.status].filter(Boolean).join(' · '),
      to: `/appointments?view=all&appointment=${appointment.id}`,
    });
  }

  return results.sort((a, b) => a.rank - b.rank).slice(0, MAX_RESULTS);
}
