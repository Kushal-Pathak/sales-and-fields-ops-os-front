import type { Workspace } from '@/types/domain';
import type { Clock } from './helpers';

export function buildWorkspace(clock: Clock): Workspace[] {
  return [
    {
      id: 'default',
      name: 'Northstar Services',
      currency: 'USD',
      locale: 'en-US',
      timezone: 'America/New_York',
      leadSources: ['Website', 'Referral', 'Social', 'Phone', 'Email', 'Event', 'Import'],
      taxRatePct: 10,
      quoteTerms:
        '1. Prices are valid until the date shown on this quote.\n2. A 50% deposit confirms the order.\n3. The balance is due on delivery.',
      ...clock.stamp(400, 30),
    },
  ];
}
