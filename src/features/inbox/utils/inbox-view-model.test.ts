import { describe, expect, it } from 'vitest';
import { buildSeed } from '@/data/seed';
import { DEFAULT_INBOX_FILTERS } from './inbox-filters';
import {
  filterConversations,
  joinConversations,
  sortConversations,
  viewCounts,
} from './inbox-view-model';

const seed = buildSeed();
const rows = joinConversations(seed.conversations, seed);
const me = seed.users[0]!;

describe('inbox view model', () => {
  it('joins contact, lead, stage, owner and the latest message', () => {
    for (const row of rows) {
      expect(row.contact?.id).toBe(row.conversation.contactId);
      expect(row.lead?.id).toBe(row.conversation.leadId);
      expect(row.stage?.id).toBe(row.lead?.stageId);
      expect(row.owner?.id).toBe(row.lead?.ownerId);
      const mine = seed.messages.filter((m) => m.conversationId === row.conversation.id);
      const latest = mine.reduce((a, b) => (a.sentAt > b.sentAt ? a : b));
      expect(row.lastMessage?.id).toBe(latest.id);
    }
  });

  it('counts unread and mine', () => {
    const counts = viewCounts(rows, me.id);
    expect(counts.all).toBe(rows.length);
    expect(counts.unread).toBe(rows.filter((r) => r.conversation.unreadCount > 0).length);
    expect(counts.unread).toBeGreaterThan(0);
    expect(counts.mine).toBe(rows.filter((r) => r.lead?.ownerId === me.id).length);
  });

  it('filters by view, search and channel', () => {
    const unread = filterConversations(rows, { ...DEFAULT_INBOX_FILTERS, view: 'unread' }, me.id);
    expect(unread.every((r) => r.conversation.unreadCount > 0)).toBe(true);
    const email = filterConversations(rows, { ...DEFAULT_INBOX_FILTERS, channel: 'email' }, me.id);
    expect(email.length).toBeGreaterThan(0);
    expect(email.every((r) => r.conversation.channel === 'email')).toBe(true);
    const first = rows[0]!;
    const byName = filterConversations(
      rows,
      { ...DEFAULT_INBOX_FILTERS, q: first.contact!.name.toLowerCase() },
      me.id,
    );
    expect(byName.map((r) => r.conversation.id)).toContain(first.conversation.id);
    const byBody = filterConversations(rows, { ...DEFAULT_INBOX_FILTERS, q: 'pricing' }, me.id);
    expect(byBody.length).toBeGreaterThan(0);
  });

  it('sorts latest message first', () => {
    const sorted = sortConversations(rows);
    for (let i = 1; i < sorted.length; i += 1) {
      expect(
        sorted[i - 1]!.conversation.lastMessageAt >= sorted[i]!.conversation.lastMessageAt,
      ).toBe(true);
    }
  });
});
