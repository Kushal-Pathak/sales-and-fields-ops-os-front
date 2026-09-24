import type { Lead, Quote, QuoteLineItem, QuoteStatus, User, Workspace } from '@/types/domain';
import { at, type Clock } from './helpers';

type ItemRow = [description: string, unit: string, quantity: number, unitPrice: number];

/** [lead index, creator index, status, discount %, created days ago, items] */
const QUOTES: [number, number, QuoteStatus, number, number, ItemRow[]][] = [
  [
    9,
    5,
    'pending_approval',
    5,
    3,
    [
      ['Platform licence (12 months)', 'year', 1, 24000],
      ['Onboarding and configuration', 'project', 1, 6500],
      ['Staff training sessions', 'session', 4, 450],
      ['Custom integration: booking engine', 'project', 1, 9800],
      ['Priority support', 'month', 12, 350],
    ],
  ],
  [
    8,
    2,
    'pending_approval',
    0,
    2,
    [
      ['Workflow design workshop', 'day', 2, 1800],
      ['Claims portal build', 'project', 1, 21000],
      ['Data migration', 'project', 1, 4200],
      ['Support retainer', 'month', 6, 600],
    ],
  ],
  [
    10,
    5,
    'pending_approval',
    10,
    1,
    [
      ['Loyalty app (iOS + Android)', 'project', 1, 11500],
      ['Point-of-sale integration', 'project', 1, 2400],
      ['App store setup', 'project', 1, 500],
    ],
  ],
  [
    7,
    4,
    'draft',
    0,
    1,
    [
      ['Kiosk hardware', 'unit', 2, 3200],
      ['Check-in software licence', 'year', 1, 4800],
      ['Installation', 'visit', 1, 900],
      ['Signage', 'unit', 2, 350],
    ],
  ],
  [
    11,
    5,
    'accepted',
    5,
    12,
    [
      ['Intake portal build', 'project', 1, 18500],
      ['E-signature integration', 'project', 1, 3200],
      ['Training', 'session', 3, 450],
      ['Support retainer', 'month', 12, 400],
    ],
  ],
  [
    12,
    2,
    'accepted',
    0,
    16,
    [
      ['SMS reminder service setup', 'project', 1, 2900],
      ['Messages bundle', '1k msgs', 12, 45],
      ['Pharmacy system connector', 'project', 1, 5400],
    ],
  ],
  [
    6,
    4,
    'sent',
    0,
    5,
    [
      ['Showcase website design', 'project', 1, 8400],
      ['Photography day', 'day', 1, 1500],
      ['Copywriting', 'page', 8, 350],
      ['Hosting and maintenance', 'month', 12, 120],
      ['Domain and SSL', 'year', 1, 90],
    ],
  ],
  [
    13,
    4,
    'rejected',
    15,
    22,
    [
      ['Booking calendar module', 'project', 1, 4200],
      ['Payment gateway setup', 'project', 1, 1200],
      ['Support retainer', 'month', 6, 150],
    ],
  ],
  [
    17,
    0,
    'approved',
    0,
    2,
    [
      ['Check-in app (iOS + Android)', 'project', 1, 14500],
      ['Access control integration', 'project', 1, 3600],
      ['Support retainer', 'month', 12, 150],
    ],
  ],
  [
    21,
    5,
    'declined',
    0,
    30,
    [
      ['Client gallery portal', 'project', 1, 3200],
      ['Storage bundle', 'year', 1, 480],
      ['Training session', 'session', 1, 450],
    ],
  ],
];

export function buildQuotes(
  clock: Clock,
  refs: { leads: Lead[]; users: User[]; workspace: Workspace },
): Quote[] {
  return QUOTES.map((row, index) => {
    const [leadIndex, creatorIndex, status, discountPct, createdDaysAgo, itemRows] = row;
    const lead = at(refs.leads, leadIndex, 'leads');
    const items: QuoteLineItem[] = itemRows.map(([description, unit, quantity, unitPrice], i) => ({
      id: `qli-${index + 1}-${i + 1}`,
      description,
      unit,
      quantity,
      unitPrice,
    }));
    const wasSent = status === 'sent' || status === 'accepted' || status === 'declined';
    return {
      id: `quote-${index + 1}`,
      number: `Q-${1040 + index}`,
      leadId: lead.id,
      contactId: lead.contactId,
      createdById: at(refs.users, creatorIndex, 'users').id,
      status,
      currency: refs.workspace.currency,
      items,
      discountPct,
      taxRatePct: refs.workspace.taxRatePct,
      notes: 'Pricing assumes a single site. Additional locations quoted separately.',
      ...(refs.workspace.quoteTerms !== undefined && { terms: refs.workspace.quoteTerms }),
      validUntil: clock.daysFromNow(30 - createdDaysAgo, 23),
      ...(wasSent && { sentAt: clock.daysFromNow(-createdDaysAgo + 1, 16) }),
      ...clock.stamp(createdDaysAgo, Math.max(0, createdDaysAgo - 1)),
    };
  });
}
