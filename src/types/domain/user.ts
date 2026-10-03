import type { BaseEntity, StatusColor } from './base';

/**
 * Everything a role can grant. `<module>.view` opens a module at all; the other keys
 * are actions inside one. The list is a runtime value so server payloads can be checked.
 */
export const PERMISSION_KEYS = [
  'leads.view_all',
  'leads.edit',
  'quotes.view',
  'quotes.approve',
  'tasks.view',
  'appointments.view',
  'inbox.view',
  'team.manage',
  'settings.manage',
  'modules.manage',
] as const;

export type Permission = (typeof PERMISSION_KEYS)[number];

export interface Role extends BaseEntity {
  name: string;
  permissions: Permission[];
}

export interface User extends BaseEntity {
  name: string;
  email: string;
  phone?: string;
  roleId: string;
  active: boolean;
  /** Tint for the user's initials avatar. */
  color: StatusColor;
}
