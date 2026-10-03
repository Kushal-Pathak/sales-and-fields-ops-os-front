import { api, onForbidden } from '@/lib/api';
import { FLAG_KEYS, flagDefaults, isFlagKey, type FlagKey } from '@/lib/flags';
import { MODULE_IDS, PERMISSION_KEYS, type ModuleId, type Permission } from '@/types/domain';
import type { CollectionOptions } from './collection';
import { db, isDemoData } from './index';
import { readValue, writeValue } from './local-store';

/**
 * What the signed-in user may see, already resolved by the backend for their active
 * workspace. The client never works this out from raw roles or targeting rules, and it
 * never guesses: a missing or malformed answer is an error, not "allowed".
 *
 * This shapes the UI only. The backend enforces the same rules on every request.
 */
export interface AccessContext {
  workspaceId: string;
  /** Opaque; changes whenever the permissions, modules or flags below change. */
  revision: string;
  permissions: Permission[];
  /** Modules switched on for the workspace. A module that is not listed is off. */
  modules: ModuleId[];
  /** Every declared flag, resolved. Flags the backend omits take their code default. */
  flags: Record<FlagKey, boolean>;
}

export class AccessContextError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AccessContextError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function knownStrings<T extends string>(value: unknown, known: readonly T[], field: string): T[] {
  if (!Array.isArray(value)) throw new AccessContextError(`Access response has no ${field} list.`);
  // Keys this build does not know (a newer backend) are dropped rather than trusted.
  return known.filter((key) => value.includes(key));
}

/**
 * Checks a server payload at runtime; TypeScript cannot. Anything that is not the
 * expected shape throws, so the shell shows an error instead of a half-open app.
 */
export function parseAccessContext(value: unknown): AccessContext {
  if (!isRecord(value)) throw new AccessContextError('Access response is not an object.');
  const { workspaceId, revision, permissions, modules, flags } = value;
  if (typeof workspaceId !== 'string' || workspaceId === '')
    throw new AccessContextError('Access response has no workspace.');
  if (typeof revision !== 'string' || revision === '')
    throw new AccessContextError('Access response has no revision.');
  if (flags !== undefined && !isRecord(flags))
    throw new AccessContextError('Access response has malformed flags.');

  const resolved = flagDefaults();
  for (const [key, flag] of Object.entries(flags ?? {})) {
    if (!isFlagKey(key)) continue;
    if (typeof flag !== 'boolean')
      throw new AccessContextError(`Access response has a malformed ${key} flag.`);
    resolved[key] = flag;
  }
  return {
    workspaceId,
    revision,
    permissions: knownStrings(permissions, PERMISSION_KEYS, 'permissions'),
    modules: knownStrings(modules, MODULE_IDS, 'modules'),
    flags: resolved,
  };
}

export interface AccessAdapter {
  kind: 'demo' | 'api';
  /** The resolved access of the signed-in member. Rejects when it cannot be determined. */
  load(userId: string, options?: CollectionOptions): Promise<AccessContext>;
}

const FLAG_OVERRIDES_KEY = 'flag-overrides';

/** Demo only: flags forced on or off in this browser, on top of the code defaults. */
export function getFlagOverrides(): Partial<Record<FlagKey, boolean>> {
  const stored = readValue<unknown>(FLAG_OVERRIDES_KEY);
  const overrides: Partial<Record<FlagKey, boolean>> = {};
  if (!isRecord(stored)) return overrides;
  for (const key of FLAG_KEYS) {
    const flag = stored[key];
    if (typeof flag === 'boolean') overrides[key] = flag;
  }
  return overrides;
}

/** Demo only: force a flag in this browser; `null` returns it to its default. */
export function setFlagOverride(key: FlagKey, value: boolean | null): void {
  const next = getFlagOverrides();
  if (value === null) delete next[key];
  else next[key] = value;
  writeValue(FLAG_OVERRIDES_KEY, next);
}

/** Resolves access from the seeded workspace and the member's role, as a backend would. */
export const demoAccess: AccessAdapter = {
  kind: 'demo',
  async load(userId, options) {
    // Read the member afresh, as a backend would: a role change must not wait for a new session.
    const [workspaces, roles, users] = await Promise.all([
      db.workspace.list(options),
      db.roles.list(options),
      db.users.list(options),
    ]);
    const workspace = workspaces[0];
    if (!workspace) throw new AccessContextError('The workspace could not be found.');
    const user = users.find((row) => row.id === userId);
    if (!user) throw new AccessContextError('The signed-in member could not be found.');
    const role = roles.find((row) => row.id === user.roleId);
    const enabled = (Array.isArray(workspace.modules) ? workspace.modules : [])
      .filter((module) => module.enabled)
      .map((module) => module.id);
    const resolved = {
      permissions: PERMISSION_KEYS.filter((key) => role?.permissions.includes(key)),
      modules: MODULE_IDS.filter((id) => enabled.includes(id)),
      flags: { ...flagDefaults(), ...getFlagOverrides() },
    };
    return { workspaceId: workspace.id, revision: JSON.stringify(resolved), ...resolved };
  },
};

/** `GET /auth/context` → `{ workspaceId, revision, permissions, modules, flags }` for the bearer token. */
export const apiAccess: AccessAdapter = {
  kind: 'api',
  async load(_userId, options) {
    return parseAccessContext(
      await api.get<unknown>('/auth/context', { ...options, handleForbidden: false }),
    );
  },
};

export const access: AccessAdapter = isDemoData ? demoAccess : apiAccess;

/** Registers the handler the API client calls on a 403, so access can be reloaded. */
export { onForbidden };
