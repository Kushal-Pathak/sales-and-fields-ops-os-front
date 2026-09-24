import { SectionNav, type SectionNavItem } from './section-nav';

const SECTIONS: SectionNavItem[] = [
  { label: 'Overview', to: '/settings', end: true },
  { label: 'Pipeline', to: '/settings/pipeline' },
  { label: 'Custom fields', to: '/settings/fields', soon: true },
  { label: 'Automations', to: '/settings/automations', soon: true },
];

/** Pill tabs across the settings pages, rendered in the `PageHeader`. */
export function SettingsNav() {
  return <SectionNav label="Settings sections" items={SECTIONS} />;
}
