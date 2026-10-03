import {
  CalendarIcon,
  ClipboardCheckIcon,
  Columns3Icon,
  FileTextIcon,
  InboxIcon,
  LayoutDashboardIcon,
  ListIcon,
  MapPinIcon,
  SettingsIcon,
  UsersIcon,
  type LucideIcon,
} from 'lucide-react';
import type { ModuleId } from '@/types/domain';

/**
 * Single source of truth for the sidebar. Routes in `router.tsx` must match these paths
 * and modules (a test checks both). An entry is shown only when its module is open to
 * the signed-in user; see `visibleNav`.
 * Sub-views (hot leads, overdue tasks, …) are in-page tabs, not sidebar entries.
 */
export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  /** The module the entry belongs to. One module may have several entries (Leads, Pipeline). */
  module: ModuleId;
  /** Match the path exactly (so `/leads` is not active on `/leads/pipeline`). */
  end?: boolean;
  /** Live count shown on the right; wired up by features later. */
  count?: number;
}

export interface NavGroup {
  label?: string;
  items: NavItem[];
}

export const mainNav: NavGroup[] = [
  {
    items: [
      { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboardIcon, module: 'dashboard' },
    ],
  },
  {
    label: 'Sales',
    items: [
      { label: 'Leads', to: '/leads', icon: ListIcon, end: true, module: 'leads' },
      { label: 'Pipeline', to: '/leads/pipeline', icon: Columns3Icon, module: 'leads' },
      { label: 'Quotes', to: '/quotes', icon: FileTextIcon, module: 'quotes' },
    ],
  },
  {
    label: 'Work',
    items: [
      { label: 'Tasks', to: '/tasks', icon: ClipboardCheckIcon, module: 'tasks' },
      { label: 'Appointments', to: '/appointments', icon: MapPinIcon, module: 'appointments' },
      { label: 'Calendar', to: '/calendar', icon: CalendarIcon, module: 'calendar' },
    ],
  },
  {
    label: 'Communication',
    items: [{ label: 'Inbox', to: '/inbox', icon: InboxIcon, module: 'inbox' }],
  },
];

/** Rendered after a separator at the bottom of the nav list. */
export const adminNav: NavGroup = {
  label: 'Admin',
  items: [
    { label: 'Team', to: '/team', icon: UsersIcon, module: 'team' },
    { label: 'Settings', to: '/settings', icon: SettingsIcon, module: 'settings' },
  ],
};

/** The groups with only the entries whose module passes `isOpen`; groups left empty are dropped. */
export function visibleNav(groups: NavGroup[], isOpen: (module: ModuleId) => boolean): NavGroup[] {
  return groups
    .map((group) => ({ ...group, items: group.items.filter((item) => isOpen(item.module)) }))
    .filter((group) => group.items.length > 0);
}
