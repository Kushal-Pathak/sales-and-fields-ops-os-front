import { describe, expect, it } from 'vitest';
import type { Message } from '@/types/domain';
import { dayLabel, groupByDay } from './message-groups';

const now = new Date('2026-09-24T15:00:00');

function message(id: string, sentAt: string, direction: Message['direction'] = 'inbound'): Message {
  const iso = new Date(sentAt).toISOString();
  return {
    id,
    conversationId: 'c',
    direction,
    body: id,
    sentAt: iso,
    createdAt: iso,
    updatedAt: iso,
  };
}

describe('message groups', () => {
  it('labels today, yesterday and older days', () => {
    expect(dayLabel(new Date('2026-09-24T09:00:00'), now)).toBe('Today');
    expect(dayLabel(new Date('2026-09-23T23:00:00'), now)).toBe('Yesterday');
    expect(dayLabel(new Date('2026-09-21T10:00:00'), now)).toMatch(/Monday/);
  });

  it('groups messages by day in sent order', () => {
    const groups = groupByDay(
      [
        message('c', '2026-09-24T10:00:00'),
        message('a', '2026-09-21T09:00:00'),
        message('b', '2026-09-21T18:00:00'),
      ],
      now,
    );
    expect(groups.map((g) => g.label)).toEqual([expect.stringMatching(/Monday/), 'Today']);
    expect(groups[0]!.messages.map((m) => m.id)).toEqual(['a', 'b']);
    expect(groups[1]!.messages.map((m) => m.id)).toEqual(['c']);
  });
});
