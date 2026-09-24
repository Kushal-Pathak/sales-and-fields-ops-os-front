import type { Contact, Conversation, Lead, Message, Stage, User } from '@/types/domain';
import type { InboxFilters, InboxView } from './inbox-filters';

export interface ConversationRow {
  conversation: Conversation;
  contact: Contact | undefined;
  lead: Lead | undefined;
  stage: Stage | undefined;
  owner: User | undefined;
  lastMessage: Message | undefined;
}

export interface InboxRefs {
  messages: Message[];
  contacts: Contact[];
  leads: Lead[];
  stages: Stage[];
  users: User[];
}

export function joinConversations(
  conversations: Conversation[],
  refs: InboxRefs,
): ConversationRow[] {
  const contacts = new Map(refs.contacts.map((row) => [row.id, row]));
  const leads = new Map(refs.leads.map((row) => [row.id, row]));
  const stages = new Map(refs.stages.map((row) => [row.id, row]));
  const users = new Map(refs.users.map((row) => [row.id, row]));
  const latest = new Map<string, Message>();
  for (const message of refs.messages) {
    const current = latest.get(message.conversationId);
    if (!current || message.sentAt > current.sentAt) latest.set(message.conversationId, message);
  }
  return conversations.map((conversation) => {
    const lead = conversation.leadId ? leads.get(conversation.leadId) : undefined;
    return {
      conversation,
      contact: contacts.get(conversation.contactId),
      lead,
      stage: lead ? stages.get(lead.stageId) : undefined,
      owner: lead ? users.get(lead.ownerId) : undefined,
      lastMessage: latest.get(conversation.id),
    };
  });
}

export function matchesView(
  row: ConversationRow,
  view: InboxView,
  currentUserId: string | undefined,
): boolean {
  switch (view) {
    case 'all':
      return true;
    case 'unread':
      return row.conversation.unreadCount > 0;
    case 'mine':
      return currentUserId !== undefined && row.lead?.ownerId === currentUserId;
  }
}

export function viewCounts(
  rows: ConversationRow[],
  currentUserId: string | undefined,
): Record<InboxView, number> {
  const counts: Record<InboxView, number> = { all: 0, unread: 0, mine: 0 };
  for (const row of rows) {
    for (const view of Object.keys(counts) as InboxView[]) {
      if (matchesView(row, view, currentUserId)) counts[view] += 1;
    }
  }
  return counts;
}

function matchesSearch(row: ConversationRow, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [row.contact?.name, row.contact?.company, row.lead?.title, row.lastMessage?.body].some(
    (value) => value?.toLowerCase().includes(q),
  );
}

export function filterConversations(
  rows: ConversationRow[],
  filters: InboxFilters,
  currentUserId: string | undefined,
): ConversationRow[] {
  return rows.filter(
    (row) =>
      matchesView(row, filters.view, currentUserId) &&
      matchesSearch(row, filters.q) &&
      (!filters.channel || row.conversation.channel === filters.channel),
  );
}

/** Latest message first. */
export function sortConversations(rows: ConversationRow[]): ConversationRow[] {
  return [...rows].sort((a, b) =>
    b.conversation.lastMessageAt.localeCompare(a.conversation.lastMessageAt),
  );
}
