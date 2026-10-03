import { describe, expect, it } from 'vitest';
import { buildSeed } from '@/data/seed';
import { flagDefaults } from '@/lib/flags';
import type { ModuleId, WorkspaceModule } from '@/types/domain';
import { buildModuleRows } from './module-rows';

const seeded = buildSeed().workspace[0]!.modules;
const flags = flagDefaults();

function without(...ids: ModuleId[]): WorkspaceModule[] {
  return seeded.map((module) => (ids.includes(module.id) ? { ...module, enabled: false } : module));
}

const row = (modules: WorkspaceModule[], id: ModuleId) =>
  buildModuleRows(modules, flags).find((item) => item.id === id)!;

describe('buildModuleRows', () => {
  it('lists every module, with the ones the backend does not let admins switch marked', () => {
    const rows = buildModuleRows(seeded, flags);
    expect(rows).toHaveLength(seeded.length);
    expect(rows.filter((item) => item.configurable).map((item) => item.id)).toEqual([
      'quotes',
      'tasks',
      'appointments',
      'calendar',
      'inbox',
    ]);
    expect(row(seeded, 'leads')).toMatchObject({ enabled: true, note: 'Always on.' });
    expect(row(seeded, 'quotes').note).toBeNull();
  });

  it('warns that switching off the last calendar source also closes the calendar', () => {
    expect(row(seeded, 'tasks').note).toBeNull();
    expect(row(without('appointments'), 'tasks').note).toBe(
      'Switching it off also closes Calendar.',
    );
  });

  it('explains a module that is on but cannot work', () => {
    expect(row(without('appointments', 'tasks'), 'calendar')).toMatchObject({
      enabled: true,
      note: 'Not available until Appointments or Tasks is on.',
    });
  });

  it('treats a module the workspace does not list as off and not switchable', () => {
    const modules = seeded.filter((module) => module.id !== 'inbox');
    expect(row(modules, 'inbox')).toMatchObject({
      enabled: false,
      configurable: false,
      note: 'Not included in this workspace.',
    });
  });
});
