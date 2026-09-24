import type { Contact, Lead, Stage, User } from '@/types/domain';
import type { LeadFilters, LeadSort, LeadView } from './lead-filters';
import { PRIORITY_RANK } from './priority';

/** A lead joined with what the list and drawer display. Missing references stay `undefined`. */
export interface LeadRow {
  lead: Lead;
  contact: Contact | undefined;
  owner: User | undefined;
  stage: Stage | undefined;
}

export interface LeadRefs {
  contacts: Contact[];
  users: User[];
  stages: Stage[];
}

export function joinLeads(leads: Lead[], refs: LeadRefs): LeadRow[] {
  const contacts = new Map(refs.contacts.map((row) => [row.id, row]));
  const users = new Map(refs.users.map((row) => [row.id, row]));
  const stages = new Map(refs.stages.map((row) => [row.id, row]));
  return leads.map((lead) => ({
    lead,
    contact: contacts.get(lead.contactId),
    owner: users.get(lead.ownerId),
    stage: stages.get(lead.stageId),
  }));
}

/** The saved views: everything, hot open leads, the current user's, and won. */
export function matchesView(
  row: LeadRow,
  view: LeadView,
  currentUserId: string | undefined,
): boolean {
  switch (view) {
    case 'all':
      return true;
    case 'hot':
      return row.lead.priority === 'high' && row.stage?.kind === 'open';
    case 'mine':
      return currentUserId !== undefined && row.lead.ownerId === currentUserId;
    case 'won':
      return row.stage?.kind === 'won';
  }
}

export function viewCounts(
  rows: LeadRow[],
  currentUserId: string | undefined,
): Record<LeadView, number> {
  const counts: Record<LeadView, number> = { all: 0, hot: 0, mine: 0, won: 0 };
  for (const row of rows) {
    for (const view of Object.keys(counts) as LeadView[]) {
      if (matchesView(row, view, currentUserId)) counts[view] += 1;
    }
  }
  return counts;
}

function matchesSearch(row: LeadRow, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    row.contact?.name,
    row.contact?.company,
    row.contact?.phone,
    row.contact?.email,
    row.lead.title,
  ];
  return haystack.some((value) => value?.toLowerCase().includes(q));
}

export function filterLeads(
  rows: LeadRow[],
  filters: LeadFilters,
  currentUserId: string | undefined,
): LeadRow[] {
  return rows.filter(
    (row) =>
      matchesView(row, filters.view, currentUserId) &&
      matchesSearch(row, filters.q) &&
      (!filters.stageId || row.lead.stageId === filters.stageId) &&
      (!filters.source || row.lead.source === filters.source) &&
      (!filters.ownerId || row.lead.ownerId === filters.ownerId) &&
      (!filters.priority || row.lead.priority === filters.priority),
  );
}

const COMPARATORS: Record<LeadSort['key'], (a: LeadRow, b: LeadRow) => number> = {
  activity: (a, b) => a.lead.lastActivityAt.localeCompare(b.lead.lastActivityAt),
  created: (a, b) => a.lead.createdAt.localeCompare(b.lead.createdAt),
  value: (a, b) => (a.lead.value ?? 0) - (b.lead.value ?? 0),
  priority: (a, b) => PRIORITY_RANK[a.lead.priority] - PRIORITY_RANK[b.lead.priority],
  name: (a, b) => (a.contact?.name ?? '').localeCompare(b.contact?.name ?? ''),
};

/** Stable sort by the chosen key; ties fall back to most recent activity first. */
export function sortLeads(rows: LeadRow[], sort: LeadSort): LeadRow[] {
  const compare = COMPARATORS[sort.key];
  const sign = sort.direction === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => sign * compare(a, b) || -COMPARATORS.activity(a, b));
}

/** The stage a "Next stage" action moves to, or `undefined` at the end of the open stages. */
export function nextOpenStage(current: Stage | undefined, stages: Stage[]): Stage | undefined {
  if (!current || current.kind !== 'open') return undefined;
  return stages
    .filter((stage) => stage.pipelineId === current.pipelineId && stage.order > current.order)
    .sort((a, b) => a.order - b.order)[0];
}
