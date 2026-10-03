import { describe, expect, it } from 'vitest';
import type { AccessContext } from '@/data/access';
import { flagDefaults } from '@/lib/flags';
import { MODULE_IDS, PERMISSION_KEYS, type ModuleId } from '@/types/domain';
import { MODULES, type ModuleDefinition } from './modules';
import {
  lostCollections,
  moduleRows,
  resolveModule,
  resolveModules,
  validateModules,
} from './resolve-access';

function context(overrides: Partial<AccessContext> = {}): AccessContext {
  return {
    workspaceId: 'default',
    revision: 'r1',
    permissions: [...PERMISSION_KEYS],
    modules: [...MODULE_IDS],
    flags: flagDefaults(),
    ...overrides,
  };
}

const without = (...ids: ModuleId[]) => MODULE_IDS.filter((id) => !ids.includes(id));

describe('resolveModule', () => {
  it('opens every module to a role with every permission in a workspace with every module', () => {
    for (const id of MODULE_IDS)
      expect(resolveModule(id, context())).toEqual({ status: 'allowed' });
  });

  it('reports a module the workspace has switched off as disabled, whatever the role', () => {
    expect(resolveModule('quotes', context({ modules: without('quotes') }))).toEqual({
      status: 'denied',
      reason: 'disabled',
    });
  });

  it('treats a module missing from the payload as off', () => {
    expect(resolveModule('inbox', context({ modules: [] }))).toEqual({
      status: 'denied',
      reason: 'disabled',
    });
  });

  it('reports a module the role cannot open as forbidden', () => {
    const permissions = PERMISSION_KEYS.filter((key) => key !== 'quotes.view');
    expect(resolveModule('quotes', context({ permissions }))).toEqual({
      status: 'denied',
      reason: 'forbidden',
    });
    // A capability inside a module is not the right to open it, and the reverse.
    expect(resolveModule('quotes', context({ permissions: ['quotes.approve'] })).status).toBe(
      'denied',
    );
    expect(resolveModule('quotes', context({ permissions: ['quotes.view'] })).status).toBe(
      'allowed',
    );
  });

  it('says disabled rather than forbidden when both apply', () => {
    expect(
      resolveModule('quotes', context({ modules: without('quotes'), permissions: [] })),
    ).toEqual({ status: 'denied', reason: 'disabled' });
  });

  it('closes a module whose required module is off', () => {
    expect(resolveModule('quotes', context({ modules: without('leads') }))).toEqual({
      status: 'denied',
      reason: 'dependency',
    });
  });

  it('keeps the calendar open while any one of its sources is available', () => {
    expect(resolveModule('calendar', context({ modules: without('tasks') })).status).toBe(
      'allowed',
    );
    expect(resolveModule('calendar', context({ modules: without('appointments') })).status).toBe(
      'allowed',
    );
    expect(
      resolveModule('calendar', context({ modules: without('tasks', 'appointments') })),
    ).toEqual({ status: 'denied', reason: 'dependency' });
  });

  it('closes the calendar as forbidden when the role can open none of its sources', () => {
    const permissions = PERMISSION_KEYS.filter(
      (key) => key !== 'tasks.view' && key !== 'appointments.view',
    );
    expect(resolveModule('calendar', context({ permissions }))).toEqual({
      status: 'denied',
      reason: 'forbidden',
    });
    expect(
      resolveModule('calendar', context({ permissions: [...permissions, 'tasks.view'] })).status,
    ).toBe('allowed');
  });

  it('hides a module behind its release flag before anything else', () => {
    const definitions: Record<ModuleId, ModuleDefinition> = {
      ...MODULES,
      inbox: { ...MODULES.inbox, releaseFlag: 'assistant.ask' },
    };
    const off = context({ flags: { ...flagDefaults(), 'assistant.ask': false }, modules: [] });
    expect(resolveModule('inbox', off, definitions)).toEqual({
      status: 'denied',
      reason: 'not_released',
    });
    expect(resolveModule('inbox', context(), definitions).status).toBe('allowed');
  });

  it('resolves every module at once', () => {
    const resolved = resolveModules(context({ modules: without('inbox') }));
    expect(Object.keys(resolved)).toEqual([...MODULE_IDS]);
    expect(resolved.inbox.status).toBe('denied');
    expect(resolved.leads.status).toBe('allowed');
  });
});

describe('validateModules', () => {
  it('finds no cycle in the real module table', () => {
    expect(validateModules()).toEqual([]);
  });

  it('reports a cycle, and the resolver closes its members instead of looping', () => {
    const definitions: Record<ModuleId, ModuleDefinition> = {
      ...MODULES,
      tasks: { ...MODULES.tasks, requires: { all: ['calendar'] } },
      calendar: { ...MODULES.calendar, requires: { all: ['tasks'] } },
    };
    expect(validateModules(definitions).some((problem) => problem.includes('tasks'))).toBe(true);
    expect(resolveModule('tasks', context(), definitions)).toEqual({
      status: 'denied',
      reason: 'dependency',
    });
  });
});

describe('lostCollections', () => {
  it('lists the collections of modules that closed, including through a dependency', () => {
    expect(lostCollections(context(), context({ modules: without('inbox') }))).toEqual([
      'conversations',
      'messages',
    ]);
    expect(lostCollections(context(), context({ modules: without('leads') }))).toEqual([
      'leads',
      'quotes',
      'tasks',
      'appointments',
      'conversations',
      'messages',
    ]);
    const permissions = PERMISSION_KEYS.filter((key) => key !== 'tasks.view');
    expect(lostCollections(context(), context({ permissions }))).toEqual(['tasks']);
  });

  it('lists nothing when access is unchanged or only widened', () => {
    expect(lostCollections(context(), context())).toEqual([]);
    expect(lostCollections(context({ modules: without('quotes') }), context())).toEqual([]);
  });
});

describe('moduleRows', () => {
  const cached = [{ id: 'cached' }];

  it('uses the rows only while the module is open', () => {
    expect(moduleRows({ status: 'allowed' }, cached)).toBe(cached);
    expect(moduleRows({ status: 'allowed' }, undefined)).toBeUndefined();
  });

  it('is empty for a closed module even when rows are still cached', () => {
    expect(moduleRows({ status: 'denied', reason: 'disabled' }, cached)).toEqual([]);
  });

  it('waits while access is loading rather than guessing', () => {
    expect(moduleRows({ status: 'loading' }, cached)).toBeUndefined();
  });
});
