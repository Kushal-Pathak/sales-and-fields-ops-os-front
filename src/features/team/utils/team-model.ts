import type { Lead, Permission, Role, Stage, StatusColor, Task, User } from '@/types/domain';

export const PERMISSIONS: { key: Permission; label: string; hint: string }[] = [
  { key: 'leads.view_all', label: 'View all leads', hint: 'See every lead, not only their own.' },
  { key: 'leads.edit', label: 'Edit leads', hint: 'Create, update, move and delete leads.' },
  { key: 'quotes.view', label: 'Open quotes', hint: 'See the Quotes module and quotes on leads.' },
  {
    key: 'quotes.approve',
    label: 'Approve quotes',
    hint: 'Approve or reject quotes before they are sent.',
  },
  { key: 'tasks.view', label: 'Open tasks', hint: 'See the Tasks module and tasks on leads.' },
  {
    key: 'appointments.view',
    label: 'Open appointments',
    hint: 'See the Appointments module and appointments on leads.',
  },
  { key: 'inbox.view', label: 'Open inbox', hint: 'See the Inbox and messages on leads.' },
  { key: 'team.manage', label: 'Manage team', hint: 'Invite members and change roles.' },
  {
    key: 'settings.manage',
    label: 'Manage settings',
    hint: 'Edit pipeline stages, fields and automations.',
  },
  {
    key: 'modules.manage',
    label: 'Manage modules',
    hint: 'Switch modules on or off for the whole workspace.',
  },
];

export interface MemberRow {
  user: User;
  role: Role | undefined;
  /** Leads the member owns that are still open. */
  openLeads: number;
  /** Tasks assigned to the member that are pending or in progress; `null` when tasks are closed to the viewer. */
  openTasks: number | null;
}

export interface TeamRefs {
  users: User[];
  roles: Role[];
  leads: Lead[];
  /** `null` when the Tasks module is closed to the viewer: the counts are then unknown, not zero. */
  tasks: Task[] | null;
  stages: Stage[];
}

export function joinMembers(refs: TeamRefs): MemberRow[] {
  const roles = new Map(refs.roles.map((role) => [role.id, role]));
  const openStages = new Set(
    refs.stages.filter((stage) => stage.kind === 'open').map((stage) => stage.id),
  );
  const openLeads = new Map<string, number>();
  for (const lead of refs.leads) {
    if (openStages.has(lead.stageId))
      openLeads.set(lead.ownerId, (openLeads.get(lead.ownerId) ?? 0) + 1);
  }
  const openTasks = new Map<string, number>();
  for (const task of refs.tasks ?? []) {
    if (task.status === 'pending' || task.status === 'in_progress')
      openTasks.set(task.assigneeId, (openTasks.get(task.assigneeId) ?? 0) + 1);
  }
  return refs.users.map((user) => ({
    user,
    role: roles.get(user.roleId),
    openLeads: openLeads.get(user.id) ?? 0,
    openTasks: refs.tasks ? (openTasks.get(user.id) ?? 0) : null,
  }));
}

export interface TeamFilters {
  q: string;
  roleId: string | null;
  status: 'active' | 'inactive' | null;
}

export const DEFAULT_TEAM_FILTERS: TeamFilters = { q: '', roleId: null, status: null };

export function parseTeamFilters(params: URLSearchParams): TeamFilters {
  const status = params.get('status');
  return {
    q: params.get('q')?.trim() ?? '',
    roleId: params.get('role') || null,
    status: status === 'active' || status === 'inactive' ? status : null,
  };
}

export function serializeTeamFilters(
  filters: TeamFilters,
  params: URLSearchParams,
): URLSearchParams {
  const next = new URLSearchParams(params);
  const set = (key: string, value: string | null) => {
    if (value) next.set(key, value);
    else next.delete(key);
  };
  set('q', filters.q.trim() || null);
  set('role', filters.roleId);
  set('status', filters.status);
  return next;
}

export function filterMembers(rows: MemberRow[], filters: TeamFilters): MemberRow[] {
  const q = filters.q.trim().toLowerCase();
  return rows
    .filter(
      (row) =>
        (!q ||
          [row.user.name, row.user.email, row.user.phone, row.role?.name].some((value) =>
            value?.toLowerCase().includes(q),
          )) &&
        (!filters.roleId || row.user.roleId === filters.roleId) &&
        (!filters.status || (filters.status === 'active') === row.user.active),
    )
    .sort(
      (a, b) =>
        Number(b.user.active) - Number(a.user.active) || a.user.name.localeCompare(b.user.name),
    );
}

const AVATAR_COLORS: StatusColor[] = [
  'warning',
  'highlight',
  'info',
  'success',
  'neutral',
  'destructive',
];

/** The least-used avatar tint, so new members are easy to tell apart. */
export function nextUserColor(users: User[]): StatusColor {
  const counts = new Map(AVATAR_COLORS.map((color) => [color, 0]));
  for (const user of users) counts.set(user.color, (counts.get(user.color) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => a[1] - b[1])[0]![0];
}

/** Members per role, for the roles table and the delete guard. */
export function roleUsage(roles: Role[], users: User[]): Map<string, number> {
  const usage = new Map(roles.map((role) => [role.id, 0]));
  for (const user of users) usage.set(user.roleId, (usage.get(user.roleId) ?? 0) + 1);
  return usage;
}
