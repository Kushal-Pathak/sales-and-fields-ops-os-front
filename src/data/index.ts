import { env } from '@/lib/env';
import type {
  Activity,
  Appointment,
  BaseEntity,
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
import { createHttpCollection, createLocalCollection, type Collection } from './collection';
import { ensureSeeded, resetLocalData } from './local-store';
import { buildSeed } from './seed';

/**
 * Data access for the whole app. Feature hooks call `db.<collection>` inside
 * TanStack Query; components never import this directly.
 *
 * With `VITE_API_BASE_URL` unset the collections are local demo data persisted
 * in localStorage; with it set they call the REST API.
 */
const useLocal = !env.apiBaseUrl;

if (useLocal) ensureSeeded(buildSeed);

function collection<T extends BaseEntity>(name: string): Collection<T> {
  return useLocal ? createLocalCollection<T>(name) : createHttpCollection<T>(name, `/${name}`);
}

export const db = {
  workspace: collection<Workspace>('workspace'),
  roles: collection<Role>('roles'),
  users: collection<User>('users'),
  contacts: collection<Contact>('contacts'),
  pipelines: collection<Pipeline>('pipelines'),
  stages: collection<Stage>('stages'),
  leads: collection<Lead>('leads'),
  tasks: collection<Task>('tasks'),
  appointments: collection<Appointment>('appointments'),
  quotes: collection<Quote>('quotes'),
  activities: collection<Activity>('activities'),
  conversations: collection<Conversation>('conversations'),
  messages: collection<Message>('messages'),
};

export type Db = typeof db;
export type CollectionName = keyof Db;

/** True when the app runs on local demo data rather than a backend. */
export const isDemoData = useLocal;

/** Replaces all local demo data with a fresh seed. No-op against a real backend. */
export function resetDemoData(): void {
  if (useLocal) resetLocalData(buildSeed);
}

export { queryKeys } from './query-keys';
export { NotFoundError } from './errors';
export type { Collection } from './collection';
