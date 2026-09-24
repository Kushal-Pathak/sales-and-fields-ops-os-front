import type { Contact, FieldDefinition, FieldType, Lead } from '@/types/domain';
import type { Clock } from './helpers';

/** [id, entity, key, label, type, options, required, hint] */
const FIELDS: [
  string,
  FieldDefinition['entity'],
  string,
  string,
  FieldType,
  string[] | undefined,
  boolean,
  string | undefined,
][] = [
  [
    'fld-timeline',
    'lead',
    'decisionTimeline',
    'Decision timeline',
    'select',
    ['This month', 'This quarter', 'Next quarter', 'No date yet'],
    false,
    'When the customer expects to decide.',
  ],
  ['fld-referred', 'lead', 'referredBy', 'Referred by', 'text', undefined, false, undefined],
  [
    'fld-contact-time',
    'contact',
    'preferredContactTime',
    'Preferred contact time',
    'select',
    ['Morning', 'Afternoon', 'Evening'],
    false,
    undefined,
  ],
  [
    'fld-budget',
    'appointment',
    'budgetConfirmed',
    'Budget confirmed',
    'checkbox',
    undefined,
    false,
    undefined,
  ],
  [
    'fld-decision-makers',
    'appointment',
    'decisionMakers',
    'Decision makers present',
    'number',
    undefined,
    false,
    undefined,
  ],
  [
    'fld-outcome-timeline',
    'appointment',
    'timeline',
    'Timeline',
    'select',
    ['This month', 'This quarter', 'Next quarter', 'Later'],
    true,
    'When they want to start.',
  ],
];

export function buildFields(clock: Clock): FieldDefinition[] {
  const perEntity = new Map<string, number>();
  return FIELDS.map(([id, entity, key, label, type, options, required, hint]) => {
    const order = perEntity.get(entity) ?? 0;
    perEntity.set(entity, order + 1);
    return {
      id,
      entity,
      key,
      label,
      type,
      ...(options && { options }),
      ...(required && { required }),
      ...(hint && { hint }),
      order,
      ...clock.stamp(200),
    };
  });
}

/** Fills a few records so the custom fields have something to show. */
export function withCustomValues(leads: Lead[], contacts: Contact[]) {
  const leadValues: Record<number, Lead['custom']> = {
    0: { decisionTimeline: 'This quarter', referredBy: 'Dental association newsletter' },
    6: { decisionTimeline: 'This month' },
    9: { decisionTimeline: 'This quarter', referredBy: 'Trade show' },
    14: { referredBy: 'Aisha Rahman' },
  };
  const contactValues: Record<number, Contact['custom']> = {
    0: { preferredContactTime: 'Morning' },
    9: { preferredContactTime: 'Afternoon' },
  };
  return {
    leads: leads.map((lead, index) =>
      leadValues[index] ? { ...lead, custom: leadValues[index] } : lead,
    ),
    contacts: contacts.map((contact, index) =>
      contactValues[index] ? { ...contact, custom: contactValues[index] } : contact,
    ),
  };
}
