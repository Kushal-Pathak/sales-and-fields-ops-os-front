import { queryKeys } from '@/data';

export { runAutomations } from './engine/run-automations';
export type { AutomationEvent } from './engine/match';
export { AutomationsTable } from './components/automations-table';
export { AutomationDrawer, NEW_AUTOMATION_ID } from './components/automation-drawer';
export { DeleteAutomationDialog } from './components/delete-automation-dialog';
export { useAutomations, useAutomationRuns } from './hooks/use-automations';

/** Everything a run may touch; callers of `runAutomations` invalidate these after it. */
export const AUTOMATION_EFFECT_KEYS = [
  queryKeys.leads.all,
  queryKeys.tasks.all,
  queryKeys.activities.all,
  queryKeys.conversations.all,
  queryKeys.messages.all,
  queryKeys.automations.all,
  queryKeys.automationRuns.all,
] as const;
