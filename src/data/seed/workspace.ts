import { MODULE_IDS, type ModuleId, type Workspace, type WorkspaceModule } from '@/types/domain';
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
      quickReplies: [
        {
          id: 'qr-greeting',
          title: 'Greeting',
          body: 'Hi {{name}}, thanks for getting in touch with us. How can we help?',
        },
        {
          id: 'qr-follow-up',
          title: 'Follow-up',
          body: 'Hi {{name}}, just checking in on our last conversation. Is there anything you need from us to move forward?',
        },
        {
          id: 'qr-meeting',
          title: 'Meeting confirmation',
          body: 'Hi {{name}}, confirming our meeting. Let me know if the time no longer works. — {{owner}}',
        },
        {
          id: 'qr-quote',
          title: 'Quote sent',
          body: 'Hi {{name}}, I have sent over the quote for {{company}}. Happy to walk you through it whenever suits.',
        },
      ],
      modules: buildModules(),
      ...clock.stamp(400, 30),
    },
  ];
}

/** The modules a workspace admin may switch off; the rest are always on. */
const CONFIGURABLE: ReadonlySet<ModuleId> = new Set([
  'quotes',
  'tasks',
  'appointments',
  'calendar',
  'inbox',
]);

function buildModules(): WorkspaceModule[] {
  return MODULE_IDS.map((id) => ({ id, enabled: true, configurable: CONFIGURABLE.has(id) }));
}
