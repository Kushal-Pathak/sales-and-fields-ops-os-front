import {
  CalendarPlusIcon,
  FileTextIcon,
  ListPlusIcon,
  MessageSquarePlusIcon,
  SunMoonIcon,
  UploadIcon,
  UserPlusIcon,
  type LucideIcon,
} from 'lucide-react';
import { adminNav, mainNav } from '@/app/navigation';

export type QuickActionId =
  | 'new_lead'
  | 'new_task'
  | 'new_appointment'
  | 'new_quote'
  | 'new_message'
  | 'import_leads'
  | 'toggle_theme';

export interface Command {
  id: string;
  label: string;
  icon: LucideIcon;
  keywords: string[];
  /** Sections navigate; quick actions run in the palette. */
  to?: string;
  action?: QuickActionId;
}

/** Every sidebar entry, so the palette navigates wherever the sidebar does. */
export function sectionCommands(): Command[] {
  return [...mainNav, adminNav].flatMap((group) =>
    group.items.map((item) => ({
      id: `go:${item.to}`,
      label: item.label,
      icon: item.icon,
      keywords: ['go to', 'open', group.label ?? ''].filter(Boolean),
      to: item.to,
    })),
  );
}

export const QUICK_ACTIONS: Command[] = [
  {
    id: 'new_lead',
    label: 'New lead',
    icon: UserPlusIcon,
    keywords: ['add', 'create', 'contact'],
    action: 'new_lead',
  },
  {
    id: 'new_task',
    label: 'New task',
    icon: ListPlusIcon,
    keywords: ['add', 'create', 'todo'],
    action: 'new_task',
  },
  {
    id: 'new_appointment',
    label: 'Schedule appointment',
    icon: CalendarPlusIcon,
    keywords: ['new', 'meeting', 'book', 'visit', 'call'],
    action: 'new_appointment',
  },
  {
    id: 'new_quote',
    label: 'New quote',
    icon: FileTextIcon,
    keywords: ['create', 'proposal', 'price'],
    action: 'new_quote',
  },
  {
    id: 'new_message',
    label: 'New message',
    icon: MessageSquarePlusIcon,
    keywords: ['send', 'whatsapp', 'sms', 'email', 'chat'],
    action: 'new_message',
  },
  {
    id: 'import_leads',
    label: 'Import leads',
    icon: UploadIcon,
    keywords: ['csv', 'upload', 'spreadsheet'],
    action: 'import_leads',
  },
  {
    id: 'toggle_theme',
    label: 'Toggle dark mode',
    icon: SunMoonIcon,
    keywords: ['theme', 'light', 'dark', 'appearance'],
    action: 'toggle_theme',
  },
];

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Commands whose label or keywords contain every word of the query. */
export function filterCommands(commands: Command[], query: string): Command[] {
  const words = normalize(query).split(' ').filter(Boolean);
  if (words.length === 0) return commands;
  return commands.filter((command) => {
    const haystack = normalize(`${command.label} ${command.keywords.join(' ')}`);
    return words.every((word) => haystack.includes(word));
  });
}
