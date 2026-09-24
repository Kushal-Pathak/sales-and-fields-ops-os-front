import { SectionNav, type SectionNavItem } from '@/components/layout/section-nav';

const SECTIONS: SectionNavItem[] = [
  { label: 'Members', to: '/team', end: true },
  { label: 'Roles', to: '/team/roles' },
];

export function TeamNav() {
  return <SectionNav label="Team sections" items={SECTIONS} />;
}
