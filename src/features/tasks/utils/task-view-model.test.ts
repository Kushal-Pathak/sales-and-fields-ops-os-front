import { describe, expect, it } from 'vitest';
import { buildSeed } from '@/data/seed';
import { isTaskOverdue } from '@/types/domain';
import { DEFAULT_TASK_FILTERS, type TaskView } from './task-filters';
import { filterTasks, joinTasks, matchesView, sortTasks, viewCounts } from './task-view-model';

const now = new Date('2026-09-23T14:00:00');
const seed = buildSeed(now);
const rows = joinTasks(seed.tasks, seed);
const me = seed.users[2]!.id;

describe('joinTasks', () => {
  it('resolves lead, contact, assignee and stage; tolerates tasks without a lead', () => {
    for (const row of rows) {
      expect(row.assignee?.id).toBe(row.task.assigneeId);
      if (row.task.leadId) {
        expect(row.lead?.id).toBe(row.task.leadId);
        expect(row.contact?.id).toBe(row.lead?.contactId);
        expect(row.stage?.id).toBe(row.lead?.stageId);
      } else {
        expect(row.lead).toBeUndefined();
      }
    }
    expect(rows.some((row) => row.lead === undefined)).toBe(true);
  });
});

describe('views', () => {
  it('splits today, overdue, upcoming and completed consistently', () => {
    const counts = viewCounts(rows, me, now);
    expect(counts.all).toBe(rows.length);
    const open = rows.filter(
      (row) => row.task.status === 'pending' || row.task.status === 'in_progress',
    );
    for (const row of open) {
      expect(
        ['today', 'overdue', 'upcoming'].some((v) => matchesView(row, v as TaskView, me, now)),
      ).toBe(true);
    }
    expect(counts.completed).toBe(rows.filter((row) => row.task.status === 'completed').length);
    for (const row of filterTasks(rows, { ...DEFAULT_TASK_FILTERS, view: 'overdue' }, me, now)) {
      expect(isTaskOverdue(row.task, now)).toBe(true);
    }
    for (const row of filterTasks(rows, { ...DEFAULT_TASK_FILTERS, view: 'today' }, me, now)) {
      expect(new Date(row.task.dueAt).toDateString()).toBe(now.toDateString());
    }
    for (const row of filterTasks(rows, { ...DEFAULT_TASK_FILTERS, view: 'mine' }, me, now)) {
      expect(row.task.assigneeId).toBe(me);
    }
    expect(counts.mine).toBeGreaterThan(0);
    expect(counts.today).toBeGreaterThan(0);
    expect(counts.overdue).toBeGreaterThan(0);
  });

  it('searches title, contact and lead title and narrows by type, assignee, priority', () => {
    const target = rows.find((row) => row.lead)!;
    const search = (q: string) =>
      filterTasks(rows, { ...DEFAULT_TASK_FILTERS, view: 'all', q }, me, now);
    expect(search(target.task.title.slice(0, 8))).toContainEqual(target);
    expect(search(target.contact!.name)).toContainEqual(target);
    const narrowed = filterTasks(
      rows,
      {
        ...DEFAULT_TASK_FILTERS,
        view: 'all',
        type: target.task.type,
        assigneeId: target.task.assigneeId,
        priority: target.task.priority,
      },
      me,
      now,
    );
    expect(narrowed).toContainEqual(target);
    for (const row of narrowed) {
      expect(row.task.type).toBe(target.task.type);
      expect(row.task.assigneeId).toBe(target.task.assigneeId);
    }
  });
});

describe('sortTasks', () => {
  it('sorts by due date both ways and by priority', () => {
    const asc = sortTasks(rows, { key: 'due', direction: 'asc' }).map((row) => row.task.dueAt);
    expect(asc).toEqual([...asc].sort());
    const desc = sortTasks(rows, { key: 'due', direction: 'desc' }).map((row) => row.task.dueAt);
    expect(desc).toEqual([...desc].sort().reverse());
    const rank = { high: 2, medium: 1, low: 0 };
    const byPriority = sortTasks(rows, { key: 'priority', direction: 'desc' }).map(
      (row) => rank[row.task.priority],
    );
    expect(byPriority).toEqual([...byPriority].sort((a, b) => b - a));
  });
});
