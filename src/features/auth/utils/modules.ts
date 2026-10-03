import type { CollectionName } from '@/data';
import type { FlagKey } from '@/lib/flags';
import type { ModuleId, Permission } from '@/types/domain';

export interface ModuleDefinition {
  label: string;
  /** One line for the settings page. */
  description: string;
  /** Needed to open the module at all. Omit when every member may. */
  permission?: Permission;
  /**
   * Hides the whole module until it is released. A flag for one capability inside a
   * module (an export button, say) is read with `useFlag` where it is used instead.
   */
  releaseFlag?: FlagKey;
  /** Modules this one cannot work without: every one of `all`, and at least one of `any`. */
  requires?: { all?: readonly ModuleId[]; any?: readonly ModuleId[] };
  /** Collections whose cached rows belong to the module; dropped when access to it is lost. */
  collections: readonly CollectionName[];
}

/**
 * The access rules of every module, as data. Navigation (`app/navigation.ts`) and
 * routes (`app/router.tsx`) point at these ids; nothing else decides visibility.
 * Whether a workspace has a module, and whether an admin may switch it, is workspace
 * data (`Workspace.modules`), not listed here.
 */
export const MODULES: Record<ModuleId, ModuleDefinition> = {
  dashboard: {
    label: 'Dashboard',
    description: 'Today’s numbers and what needs attention.',
    requires: { all: ['leads'] },
    collections: [],
  },
  leads: {
    label: 'Leads',
    description: 'The lead list, the pipeline board and lead import.',
    collections: ['leads'],
  },
  quotes: {
    label: 'Quotes',
    description: 'Build, approve and send quotes for leads.',
    permission: 'quotes.view',
    requires: { all: ['leads'] },
    collections: ['quotes'],
  },
  tasks: {
    label: 'Tasks',
    description: 'Follow-ups and to-dos, as a list and a board.',
    permission: 'tasks.view',
    requires: { all: ['leads'] },
    collections: ['tasks'],
  },
  appointments: {
    label: 'Appointments',
    description: 'Meetings, calls and visits scheduled with leads.',
    permission: 'appointments.view',
    requires: { all: ['leads'] },
    collections: ['appointments'],
  },
  calendar: {
    label: 'Calendar',
    description: 'A week and month view of appointments and due tasks.',
    requires: { any: ['appointments', 'tasks'] },
    collections: [],
  },
  inbox: {
    label: 'Inbox',
    description: 'Conversations with contacts across channels.',
    permission: 'inbox.view',
    requires: { all: ['leads'] },
    collections: ['conversations', 'messages'],
  },
  team: {
    label: 'Team',
    description: 'Members, roles and permissions.',
    requires: { all: ['leads'] },
    collections: [],
  },
  settings: {
    label: 'Settings',
    description: 'Pipeline stages, custom fields, automations and modules.',
    requires: { all: ['leads'] },
    collections: [],
  },
};
