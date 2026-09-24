import {
  isTaskOverdue,
  type Contact,
  type Lead,
  type Stage,
  type Task,
  type User,
} from '@/types/domain';
import type { TaskFilters, TaskSort, TaskView } from './task-filters';
import { isOpenTask } from './task-labels';

export interface TaskRow {
  task: Task;
  lead: Lead | undefined;
  contact: Contact | undefined;
  assignee: User | undefined;
  stage: Stage | undefined;
}

export interface TaskRefs {
  leads: Lead[];
  contacts: Contact[];
  users: User[];
  stages: Stage[];
}

export function joinTasks(tasks: Task[], refs: TaskRefs): TaskRow[] {
  const leads = new Map(refs.leads.map((row) => [row.id, row]));
  const contacts = new Map(refs.contacts.map((row) => [row.id, row]));
  const users = new Map(refs.users.map((row) => [row.id, row]));
  const stages = new Map(refs.stages.map((row) => [row.id, row]));
  return tasks.map((task) => {
    const lead = task.leadId ? leads.get(task.leadId) : undefined;
    const contactId = task.contactId ?? lead?.contactId;
    return {
      task,
      lead,
      contact: contactId ? contacts.get(contactId) : undefined,
      assignee: users.get(task.assigneeId),
      stage: lead ? stages.get(lead.stageId) : undefined,
    };
  });
}

function isSameLocalDay(iso: string, now: Date): boolean {
  const date = new Date(iso);
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function endOfToday(now: Date): Date {
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return end;
}

export function matchesView(
  row: TaskRow,
  view: TaskView,
  currentUserId: string | undefined,
  now: Date,
): boolean {
  const { task } = row;
  switch (view) {
    case 'all':
      return true;
    case 'mine':
      return currentUserId !== undefined && task.assigneeId === currentUserId;
    case 'today':
      return isOpenTask(task) && isSameLocalDay(task.dueAt, now);
    case 'overdue':
      return isTaskOverdue(task, now);
    case 'upcoming':
      return isOpenTask(task) && new Date(task.dueAt) > endOfToday(now);
    case 'completed':
      return task.status === 'completed';
  }
}

export function viewCounts(
  rows: TaskRow[],
  currentUserId: string | undefined,
  now = new Date(),
): Record<TaskView, number> {
  const counts: Record<TaskView, number> = {
    mine: 0,
    all: 0,
    today: 0,
    overdue: 0,
    upcoming: 0,
    completed: 0,
  };
  for (const row of rows) {
    for (const view of Object.keys(counts) as TaskView[]) {
      if (matchesView(row, view, currentUserId, now)) counts[view] += 1;
    }
  }
  return counts;
}

function matchesSearch(row: TaskRow, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [row.task.title, row.task.description, row.contact?.name, row.lead?.title].some((value) =>
    value?.toLowerCase().includes(q),
  );
}

export function filterTasks(
  rows: TaskRow[],
  filters: TaskFilters,
  currentUserId: string | undefined,
  now = new Date(),
): TaskRow[] {
  return rows.filter(
    (row) =>
      matchesView(row, filters.view, currentUserId, now) &&
      matchesSearch(row, filters.q) &&
      (!filters.type || row.task.type === filters.type) &&
      (!filters.assigneeId || row.task.assigneeId === filters.assigneeId) &&
      (!filters.priority || row.task.priority === filters.priority),
  );
}

const PRIORITY_RANK = { high: 2, medium: 1, low: 0 } as const;

const COMPARATORS: Record<TaskSort['key'], (a: TaskRow, b: TaskRow) => number> = {
  due: (a, b) => a.task.dueAt.localeCompare(b.task.dueAt),
  priority: (a, b) => PRIORITY_RANK[a.task.priority] - PRIORITY_RANK[b.task.priority],
  created: (a, b) => a.task.createdAt.localeCompare(b.task.createdAt),
};

/** Sort by the chosen key; ties fall back to the earliest due date. */
export function sortTasks(rows: TaskRow[], sort: TaskSort): TaskRow[] {
  const compare = COMPARATORS[sort.key];
  const sign = sort.direction === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => sign * compare(a, b) || COMPARATORS.due(a, b));
}
