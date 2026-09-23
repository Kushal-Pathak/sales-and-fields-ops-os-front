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

/**
 * Single source of truth for the sidebar. Routes in `router.tsx` must match these paths.
 * Sub-views (hot leads, overdue tasks, …) are in-page tabs, not sidebar entries.
 */
export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
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
    items: [{ label: 'Dashboard', to: '/dashboard', icon: LayoutDashboardIcon }],
  },
  {
    label: 'Sales',
    items: [
      { label: 'Leads', to: '/leads', icon: ListIcon, end: true },
      { label: 'Pipeline', to: '/leads/pipeline', icon: Columns3Icon },
      { label: 'Quotes', to: '/quotes', icon: FileTextIcon },
    ],
  },
  {
    label: 'Work',
    items: [
      { label: 'Tasks', to: '/tasks', icon: ClipboardCheckIcon },
      { label: 'Appointments', to: '/appointments', icon: MapPinIcon },
      { label: 'Calendar', to: '/calendar', icon: CalendarIcon },
    ],
  },
  {
    label: 'Communication',
    items: [{ label: 'Inbox', to: '/inbox', icon: InboxIcon }],
  },
];

/** Rendered after a separator at the bottom of the nav list. */
export const adminNav: NavGroup = {
  label: 'Admin',
  items: [
    { label: 'Team', to: '/team', icon: UsersIcon },
    { label: 'Settings', to: '/settings', icon: SettingsIcon },
  ],
};
