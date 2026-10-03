import { describe, expect, it } from 'vitest';
import { buildSeed } from '@/data/seed';
import type { ModuleId } from '@/types/domain';
import { filterCommands, QUICK_ACTIONS, quickActions, sectionCommands } from './commands';
import { MAX_RESULTS, searchRecords } from './search';

const seed = buildSeed();

describe('searchRecords', () => {
  it('finds leads by contact name, ranking prefix matches first', () => {
    const contact = seed.contacts[0]!;
    const results = searchRecords(contact.name.slice(0, 4), seed);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]!.kind).toBe('lead');
    expect(results[0]!.title).toBe(contact.name);
    expect(results[0]!.to).toMatch(/^\/leads\?lead=/);
  });

  it('finds tasks, quotes and appointments and caps the list', () => {
    const task = seed.tasks[0]!;
    expect(searchRecords(task.title.split(' ')[0]!, seed).some((r) => r.kind === 'task')).toBe(
      true,
    );
    const quote = searchRecords('Q-1040', seed);
    expect(quote[0]).toMatchObject({ kind: 'quote', to: '/quotes?quote=quote-1' });
    expect(searchRecords('boston', seed).some((r) => r.kind === 'appointment')).toBe(true);
    expect(searchRecords('a', seed)).toEqual([]);
    expect(searchRecords('e', seed)).toEqual([]);
    expect(searchRecords('an', seed).length).toBeLessThanOrEqual(MAX_RESULTS);
  });
});

describe('commands', () => {
  it('lists every sidebar section and filters by words', () => {
    const sections = sectionCommands(() => true);
    expect(sections.map((c) => c.to)).toContain('/leads/pipeline');
    expect(filterCommands(sections, 'pipe').map((c) => c.label)).toEqual(['Pipeline']);
    expect(filterCommands(QUICK_ACTIONS, 'dark')).toHaveLength(1);
    expect(filterCommands(QUICK_ACTIONS, 'new csv')).toHaveLength(0);
    expect(filterCommands(QUICK_ACTIONS, '')).toHaveLength(QUICK_ACTIONS.length);
  });

  it('offers only the sections and quick actions of open modules', () => {
    const isOpen = (module: ModuleId) => module !== 'quotes' && module !== 'inbox';
    const sections = sectionCommands(isOpen).map((c) => c.to);
    expect(sections).toContain('/tasks');
    expect(sections).not.toContain('/quotes');
    expect(sections).not.toContain('/inbox');
    const actions = quickActions(isOpen).map((c) => c.action);
    expect(actions).toEqual([
      'new_lead',
      'new_task',
      'new_appointment',
      'import_leads',
      'toggle_theme',
    ]);
  });
});
