import { describe, expect, it } from 'vitest';
import { buildSeed } from '@/data/seed';
import {
  DEFAULT_TEAM_FILTERS,
  filterMembers,
  joinMembers,
  nextUserColor,
  parseTeamFilters,
  roleUsage,
  serializeTeamFilters,
} from './team-model';

const seed = buildSeed(new Date('2026-09-23T14:00:00'));
const rows = joinMembers(seed);

describe('joinMembers', () => {
  it('resolves the role and counts open leads and tasks per member', () => {
    for (const row of rows) {
      expect(row.role?.id).toBe(row.user.roleId);
      const openStages = new Set(seed.stages.filter((s) => s.kind === 'open').map((s) => s.id));
      expect(row.openLeads).toBe(
        seed.leads.filter((l) => l.ownerId === row.user.id && openStages.has(l.stageId)).length,
      );
      expect(row.openTasks).toBe(
        seed.tasks.filter(
          (t) =>
            t.assigneeId === row.user.id && (t.status === 'pending' || t.status === 'in_progress'),
        ).length,
      );
    }
  });
});

describe('filterMembers', () => {
  it('sorts active members first, then by name', () => {
    const sorted = filterMembers(rows, DEFAULT_TEAM_FILTERS);
    const actives = sorted.map((row) => row.user.active);
    expect(actives.indexOf(false)).toBe(actives.lastIndexOf(true) + 1);
  });

  it('searches and narrows by role and status', () => {
    const target = rows[1]!;
    expect(filterMembers(rows, { ...DEFAULT_TEAM_FILTERS, q: target.user.email })).toEqual([
      target,
    ]);
    const byRole = filterMembers(rows, { ...DEFAULT_TEAM_FILTERS, roleId: target.user.roleId });
    expect(byRole.every((row) => row.user.roleId === target.user.roleId)).toBe(true);
    const inactive = filterMembers(rows, { ...DEFAULT_TEAM_FILTERS, status: 'inactive' });
    expect(inactive.length).toBeGreaterThan(0);
    expect(inactive.every((row) => !row.user.active)).toBe(true);
  });
});

describe('team filters', () => {
  it('round-trips and ignores unknown status', () => {
    const filters = { q: 'ann', roleId: 'role-sales', status: 'active' as const };
    const params = serializeTeamFilters(filters, new URLSearchParams('member=usr-1'));
    expect(params.get('member')).toBe('usr-1');
    expect(parseTeamFilters(params)).toEqual(filters);
    expect(parseTeamFilters(new URLSearchParams('status=gone')).status).toBeNull();
  });
});

describe('helpers', () => {
  it('picks the least used avatar colour', () => {
    expect(nextUserColor([])).toBe('warning');
    expect(nextUserColor(seed.users)).toBe(
      ['warning', 'highlight', 'info', 'success', 'neutral', 'destructive'].find(
        (color) => !seed.users.some((user) => user.color === color),
      ) ?? 'neutral',
    );
  });

  it('counts members per role, including roles with none', () => {
    const usage = roleUsage(seed.roles, seed.users);
    expect([...usage.values()].reduce((a, b) => a + b, 0)).toBe(seed.users.length);
    expect(usage.size).toBe(seed.roles.length);
  });
});
