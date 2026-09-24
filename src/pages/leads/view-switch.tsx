import { Columns3Icon, ListIcon } from 'lucide-react';
import { ViewSwitch } from '@/components/layout/view-switch';

const VIEWS = [
  { to: '/leads', label: 'Table view', icon: ListIcon },
  { to: '/leads/pipeline', label: 'Board view', icon: Columns3Icon },
] as const;

export function LeadViewSwitch() {
  return <ViewSwitch views={VIEWS} aria-label="Leads view" />;
}
