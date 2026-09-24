import { Columns3Icon, ListIcon } from 'lucide-react';
import { ViewSwitch } from '@/components/layout/view-switch';

const VIEWS = [
  { to: '/tasks', label: 'Table view', icon: ListIcon },
  { to: '/tasks/board', label: 'Board view', icon: Columns3Icon },
] as const;

export function TaskViewSwitch() {
  return <ViewSwitch views={VIEWS} aria-label="Tasks view" />;
}
