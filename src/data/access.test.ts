import { beforeEach, describe, expect, it } from 'vitest';
import { flagDefaults } from '@/lib/flags';
import { MODULE_IDS, PERMISSION_KEYS } from '@/types/domain';
import {
  AccessContextError,
  demoAccess,
  getFlagOverrides,
  parseAccessContext,
  setFlagOverride,
} from './access';
import { db, resetDemoData } from './index';
import { buildSeed } from './seed';

const valid = {
  workspaceId: 'ws-1',
  revision: '42',
  permissions: ['leads.edit', 'quotes.view'],
  modules: ['leads', 'quotes'],
  flags: { 'assistant.ask': false },
};

describe('parseAccessContext', () => {
  it('accepts a well-formed payload', () => {
    expect(parseAccessContext(valid)).toEqual({ ...valid, flags: { 'assistant.ask': false } });
  });

  it('drops permissions, modules and flags this build does not know', () => {
    const parsed = parseAccessContext({
      ...valid,
      permissions: ['leads.edit', 'billing.manage', 7],
      modules: ['leads', 'reports'],
      flags: { 'reports.beta': true },
    });
    expect(parsed.permissions).toEqual(['leads.edit']);
    expect(parsed.modules).toEqual(['leads']);
    expect(parsed.flags).toEqual(flagDefaults());
  });

  it('uses the declared default for a flag the backend omits', () => {
    const { workspaceId, revision, permissions, modules } = valid;
    expect(parseAccessContext({ workspaceId, revision, permissions, modules }).flags).toEqual(
      flagDefaults(),
    );
  });

  it.each(['false', 'yes', 0, null, {}])('rejects a known flag with value %j', (value) => {
    expect(() => parseAccessContext({ ...valid, flags: { 'assistant.ask': value } })).toThrow(
      AccessContextError,
    );
  });

  it.each([
    ['null', null],
    ['an array', []],
    ['a string', 'ok'],
    ['no workspace', { ...valid, workspaceId: '' }],
    ['no revision', { ...valid, revision: undefined }],
    ['permissions that are not a list', { ...valid, permissions: 'all' }],
    ['modules missing', { ...valid, modules: undefined }],
    ['flags that are not an object', { ...valid, flags: ['assistant.ask'] }],
  ])('rejects %s instead of granting anything', (_label, payload) => {
    expect(() => parseAccessContext(payload)).toThrow(AccessContextError);
  });
});

describe('demoAccess', () => {
  const seed = buildSeed();
  const admin = seed.users.find((user) => user.roleId === 'role-admin')!;
  const sales = seed.users.find((user) => user.roleId === 'role-sales')!;

  beforeEach(() => {
    resetDemoData();
    setFlagOverride('assistant.ask', null);
  });

  it('resolves the role’s permissions and the workspace’s enabled modules', async () => {
    const context = await demoAccess.load(admin.id);
    expect(context.workspaceId).toBe('default');
    expect(context.permissions).toEqual([...PERMISSION_KEYS]);
    expect(context.modules).toEqual([...MODULE_IDS]);
    expect(context.flags).toEqual(flagDefaults());

    const limited = await demoAccess.load(sales.id);
    expect(limited.permissions).toContain('quotes.view');
    expect(limited.permissions).not.toContain('modules.manage');
  });

  it('follows the member’s current role, and grants nothing when that role is gone', async () => {
    await db.users.update(sales.id, { roleId: 'role-viewer' });
    const viewer = await demoAccess.load(sales.id);
    expect(viewer.permissions).toContain('leads.view_all');
    expect(viewer.permissions).not.toContain('leads.edit');

    await db.users.update(sales.id, { roleId: 'role-removed' });
    expect((await demoAccess.load(sales.id)).permissions).toEqual([]);
  });

  it('rejects for a member that does not exist rather than granting anything', async () => {
    await expect(demoAccess.load('usr-missing')).rejects.toBeInstanceOf(AccessContextError);
  });

  it('changes its revision when a module is switched off', async () => {
    const before = await demoAccess.load(admin.id);
    const workspace = (await db.workspace.list())[0]!;
    await db.workspace.update(workspace.id, {
      modules: workspace.modules.map((module) =>
        module.id === 'inbox' ? { ...module, enabled: false } : module,
      ),
    });
    const after = await demoAccess.load(admin.id);
    expect(after.modules).not.toContain('inbox');
    expect(after.revision).not.toBe(before.revision);
  });

  it('applies a per-browser flag override on top of the default', async () => {
    setFlagOverride('assistant.ask', false);
    expect(getFlagOverrides()).toEqual({ 'assistant.ask': false });
    expect((await demoAccess.load(admin.id)).flags['assistant.ask']).toBe(false);
    setFlagOverride('assistant.ask', null);
    expect((await demoAccess.load(admin.id)).flags['assistant.ask']).toBe(true);
  });
});
