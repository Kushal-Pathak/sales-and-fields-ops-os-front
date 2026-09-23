import type { BaseEntity, StatusColor } from './base';

export type Permission =
  'leads.view_all' | 'leads.edit' | 'quotes.approve' | 'team.manage' | 'settings.manage';

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
