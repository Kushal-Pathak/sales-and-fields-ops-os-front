import type { Channel, Conversation, Lead, Message } from '@/types/domain';
import { at, type Clock } from './helpers';

type MessageRow = [direction: 'inbound' | 'outbound', body: string, hoursAgo: number];

/** [lead index, channel, unread count, messages] */
const CONVERSATIONS: [number, Channel, number, MessageRow[]][] = [
  [
    0,
    'whatsapp',
    2,
    [
      ['inbound', 'Hi, we are looking for a reminder system for patient appointments.', 30],
      ['outbound', 'Thanks for reaching out! Happy to help. How many locations do you run?', 29],
      ['inbound', 'Two clinics, about 60 appointments a day between them.', 28],
      ['outbound', 'Great, that fits well. Could we book a short call this week?', 27],
      ['inbound', 'Thursday morning works.', 3],
      ['inbound', 'Can you also send pricing beforehand?', 2],
    ],
  ],
  [
    9,
    'email',
    1,
    [
      ['outbound', 'Please find attached the proposal for the guest messaging platform.', 96],
      ['inbound', 'Thank you. Our team is reviewing it; expect feedback by Friday.', 70],
      ['inbound', 'Could you break out the integration cost separately?', 20],
    ],
  ],
  [
    2,
    'chat',
    0,
    [
      ['inbound', 'Do you support online ordering for multiple locations?', 26],
      ['outbound', 'Yes, each location gets its own menu and pickup times.', 25],
      ['inbound', 'Perfect. What is the setup time?', 25],
      ['outbound', 'Typically two weeks from kickoff. I will send a summary.', 24],
    ],
  ],
  [
    16,
    'sms',
    0,
    [
      [
        'outbound',
        'Hi Omar, confirming our meeting on Thursday at 10:00 at your Detroit site.',
        50,
      ],
      ['inbound', 'Confirmed, see you then.', 48],
    ],
  ],
  [
    6,
    'email',
    0,
    [
      ['outbound', 'Here is the proposal for the project showcase site.', 120],
      ['inbound', 'Looks good overall. Can we add a section for awards?', 100],
      ['outbound', 'Absolutely, added at no extra cost. Updated proposal attached.', 98],
      ['inbound', 'Thanks, will discuss with my partner this week.', 26],
    ],
  ],
  [
    14,
    'whatsapp',
    1,
    [
      [
        'inbound',
        'Hello, I was referred by Aisha at Harbor Dental. We need a site for our second location.',
        72,
      ],
      ['outbound', 'Welcome! Aisha mentioned you. When would be a good time to call?', 70],
      ['inbound', 'Tomorrow afternoon, after 3pm.', 9],
    ],
  ],
  [
    17,
    'chat',
    1,
    [
      ['inbound', 'Does the check-in app work on tablets at the front desk?', 6],
      ['outbound', 'Yes, on iPad and Android tablets. I can show you a demo this week.', 5],
      ['inbound', 'Great. Which days are you free?', 1],
    ],
  ],
];

export function buildConversations(
  clock: Clock,
  refs: { leads: Lead[] },
): { conversations: Conversation[]; messages: Message[] } {
  const conversations: Conversation[] = [];
  const messages: Message[] = [];

  CONVERSATIONS.forEach(([leadIndex, channel, unreadCount, rows], index) => {
    const lead = at(refs.leads, leadIndex, 'leads');
    const id = `conv-${index + 1}`;
    const sent = rows.map(([, , hoursAgo]) => clock.hoursFromNow(-hoursAgo));
    rows.forEach(([direction, body], i) => {
      const sentAt = sent[i] ?? clock.hoursFromNow(0);
      messages.push({
        id: `msg-${index + 1}-${i + 1}`,
        conversationId: id,
        direction,
        body,
        sentAt,
        createdAt: sentAt,
        updatedAt: sentAt,
      });
    });
    const first = sent[0] ?? clock.hoursFromNow(0);
    const last = sent[sent.length - 1] ?? first;
    conversations.push({
      id,
      contactId: lead.contactId,
      leadId: lead.id,
      channel,
      lastMessageAt: last,
      unreadCount,
      createdAt: first,
      updatedAt: last,
    });
  });

  return { conversations, messages };
}
