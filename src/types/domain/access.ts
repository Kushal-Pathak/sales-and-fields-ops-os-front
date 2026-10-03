/**
 * The areas of the product a workspace can have. Ids are stable: they are stored on
 * the workspace, declared on route handles and referenced by the navigation.
 */
export const MODULE_IDS = [
  'dashboard',
  'leads',
  'quotes',
  'tasks',
  'appointments',
  'calendar',
  'inbox',
  'team',
  'settings',
] as const;

export type ModuleId = (typeof MODULE_IDS)[number];

/** One module's state for a workspace. */
export interface WorkspaceModule {
  id: ModuleId;
  enabled: boolean;
  /** Whether a workspace admin may switch it. The backend (plan) decides; the UI only reflects it. */
  configurable: boolean;
}
