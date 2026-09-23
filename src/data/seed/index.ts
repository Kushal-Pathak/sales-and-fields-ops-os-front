import type {
  Activity,
  Appointment,
  Contact,
  Conversation,
  Lead,
  Message,
  Pipeline,
  Quote,
  Role,
  Stage,
  Task,
  User,
  Workspace,
} from '@/types/domain';
import { buildActivities } from './activities';
import { buildAppointments } from './appointments';
import { buildContacts } from './contacts';
import { buildConversations } from './conversations';
import { createClock } from './helpers';
import { buildLeads } from './leads';
import { buildPipelines, buildStages } from './pipelines';
import { buildQuotes } from './quotes';
import { buildTasks } from './tasks';
import { buildRoles, buildUsers } from './users';
import { buildWorkspace } from './workspace';

/** Keys match the collection names in `src/data/index.ts`. */
export type Seed = {
  workspace: Workspace[];
  roles: Role[];
  users: User[];
  contacts: Contact[];
  pipelines: Pipeline[];
  stages: Stage[];
  leads: Lead[];
  tasks: Task[];
  appointments: Appointment[];
  quotes: Quote[];
  activities: Activity[];
  conversations: Conversation[];
  messages: Message[];
};

/**
 * Demo data for a generic services business. Dates are relative to `now`, so a
 * fresh seed always has tasks due today, overdue tasks and upcoming appointments.
 */
export function buildSeed(now: Date = new Date()): Seed {
  const clock = createClock(now);
  const workspace = buildWorkspace(clock);
  const roles = buildRoles(clock);
  const users = buildUsers(clock);
  const contacts = buildContacts(clock);
  const pipelines = buildPipelines(clock);
  const stages = buildStages(clock);
  const leads = buildLeads(clock, { contacts, stages, users });
  const tasks = buildTasks(clock, { leads, users });
  const appointments = buildAppointments(clock, { leads, users });
  const quotes = buildQuotes(clock, { leads, users, workspace: workspace[0]! });
  const activities = buildActivities(clock, { leads, stages, tasks, quotes });
  const { conversations, messages } = buildConversations(clock, { leads });

  return {
    workspace,
    roles,
    users,
    contacts,
    pipelines,
    stages,
    leads,
    tasks,
    appointments,
    quotes,
    activities,
    conversations,
    messages,
  };
}
