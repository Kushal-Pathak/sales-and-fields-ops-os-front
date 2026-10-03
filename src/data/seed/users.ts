import {
  PERMISSION_KEYS,
  type Permission,
  type Role,
  type StatusColor,
  type User,
} from '@/types/domain';
import type { Clock } from './helpers';

/** Every seeded role can open every module; roles differ in what they may do inside. */
const VIEW_ALL_MODULES: Permission[] = [
  'quotes.view',
  'tasks.view',
  'appointments.view',
  'inbox.view',
];

export function buildRoles(clock: Clock): Role[] {
  const stamp = clock.stamp(400);
  return [
    { id: 'role-admin', name: 'Admin', permissions: [...PERMISSION_KEYS], ...stamp },
    {
      id: 'role-manager',
      name: 'Manager',
      permissions: [
        ...VIEW_ALL_MODULES,
        'leads.view_all',
        'leads.edit',
        'quotes.approve',
        'team.manage',
      ],
      ...stamp,
    },
    { id: 'role-sales', name: 'Sales', permissions: [...VIEW_ALL_MODULES, 'leads.edit'], ...stamp },
    {
      id: 'role-viewer',
      name: 'Viewer',
      permissions: [...VIEW_ALL_MODULES, 'leads.view_all'],
      ...stamp,
    },
  ];
}

const USERS: [id: string, name: string, roleId: string, color: StatusColor, active: boolean][] = [
  ['usr-1', 'Jordan Blake', 'role-admin', 'warning', true],
  ['usr-2', 'Priya Raman', 'role-manager', 'highlight', true],
  ['usr-3', 'Diego Alvarez', 'role-sales', 'info', true],
  ['usr-4', 'Mei Chen', 'role-sales', 'success', true],
  ['usr-5', 'Samuel Okafor', 'role-sales', 'neutral', true],
  ['usr-6', 'Lena Fischer', 'role-viewer', 'neutral', false],
];

export function buildUsers(clock: Clock): User[] {
  return USERS.map(([id, name, roleId, color, active], index) => ({
    id,
    name,
    email: `${name.toLowerCase().replace(' ', '.')}@northstar.example`,
    phone: `+1 555 010${index + 1}`,
    roleId,
    active,
    color,
    ...clock.stamp(380 - index * 20, 1),
  }));
}
