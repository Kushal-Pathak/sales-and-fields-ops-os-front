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
      ...clock.stamp(400, 30),
    },
  ];
}
