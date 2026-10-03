import type { AccessContext } from '@/data/access';
import type { CollectionName } from '@/data';
import { MODULE_IDS, type ModuleId } from '@/types/domain';
import { MODULES, type ModuleDefinition } from './modules';

/**
 * Why a module is closed, most fundamental reason first:
 * - `not_released`: its release flag is off.
 * - `disabled`: the workspace does not have it switched on.
 * - `dependency`: a module it needs is not available to the workspace.
 * - `forbidden`: the workspace has it, but this user's role may not open it.
 *
 * The first three mean the module does not exist for this workspace; only `forbidden`
 * is about the person, so only it is worth telling them about.
 */
export type AccessDenial = 'not_released' | 'disabled' | 'dependency' | 'forbidden';

export type ModuleAccess = { status: 'allowed' } | { status: 'denied'; reason: AccessDenial };

/** What a hook reports before the access context has loaded. */
export type ModuleState = ModuleAccess | { status: 'loading' };

type Definitions = Record<ModuleId, ModuleDefinition>;

/** `all` must each pass and, when `any` is listed, at least one of it must. */
function dependenciesMet(
  definition: ModuleDefinition,
  passes: (dependency: ModuleId) => boolean,
): boolean {
  const all = definition.requires?.all ?? [];
  const any = definition.requires?.any ?? [];
  return all.every(passes) && (any.length === 0 || any.some(passes));
}

/** Whether the workspace has the module at all, regardless of who is asking. */
function unavailable(
  context: AccessContext,
  definitions: Definitions,
  id: ModuleId,
  trail: ReadonlySet<ModuleId>,
): AccessDenial | null {
  const definition = definitions[id];
  if (definition.releaseFlag && !context.flags[definition.releaseFlag]) return 'not_released';
  if (!context.modules.includes(id)) return 'disabled';
  // A module that (indirectly) requires itself can never be satisfied.
  if (trail.has(id)) return 'dependency';
  const next = new Set(trail).add(id);
  return dependenciesMet(
    definition,
    (dependency) => unavailable(context, definitions, dependency, next) === null,
  )
    ? null
    : 'dependency';
}

function denial(
  context: AccessContext,
  definitions: Definitions,
  id: ModuleId,
  trail: ReadonlySet<ModuleId>,
): AccessDenial | null {
  const missing = unavailable(context, definitions, id, new Set());
  if (missing) return missing;
  const definition = definitions[id];
  if (definition.permission && !context.permissions.includes(definition.permission))
    return 'forbidden';
  if (trail.has(id)) return 'forbidden';
  const next = new Set(trail).add(id);
  // The workspace has what this module needs; the user must be able to open it too.
  return dependenciesMet(
    definition,
    (dependency) => denial(context, definitions, dependency, next) === null,
  )
    ? null
    : 'forbidden';
}

/** Whether `context` may open module `id`, and if not, why. Pure; the one place this is decided. */
export function resolveModule(
  id: ModuleId,
  context: AccessContext,
  definitions: Definitions = MODULES,
): ModuleAccess {
  const reason = denial(context, definitions, id, new Set());
  return reason ? { status: 'denied', reason } : { status: 'allowed' };
}

export function resolveModules(
  context: AccessContext,
  definitions: Definitions = MODULES,
): Record<ModuleId, ModuleAccess> {
  const resolved = {} as Record<ModuleId, ModuleAccess>;
  for (const id of MODULE_IDS) resolved[id] = resolveModule(id, context, definitions);
  return resolved;
}

/** Problems in a module table: a module requiring itself, directly or through others. */
export function validateModules(definitions: Definitions = MODULES): string[] {
  const problems: string[] = [];
  const visit = (id: ModuleId, path: ModuleId[]): void => {
    if (path.includes(id)) {
      problems.push(`Dependency cycle: ${[...path.slice(path.indexOf(id)), id].join(' → ')}`);
      return;
    }
    const requires = definitions[id].requires;
    for (const dependency of [...(requires?.all ?? []), ...(requires?.any ?? [])])
      visit(dependency, [...path, id]);
  };
  for (const id of MODULE_IDS) visit(id, []);
  return [...new Set(problems)];
}

/** Collections of modules that were open in `before` and are closed in `after`. */
export function lostCollections(
  before: AccessContext,
  after: AccessContext,
  definitions: Definitions = MODULES,
): CollectionName[] {
  const lost = MODULE_IDS.filter(
    (id) =>
      resolveModule(id, before, definitions).status === 'allowed' &&
      resolveModule(id, after, definitions).status !== 'allowed',
  );
  return [...new Set(lost.flatMap((id) => definitions[id].collections))];
}

/** One shared empty list, so a closed module does not defeat `useMemo` on every render. */
const NO_ROWS: never[] = [];

/**
 * The rows a composite screen should use for an optional module's collection:
 * `undefined` while access or the rows are loading, and `[]` when the module is closed,
 * whatever is still cached. Pair it with `enabled: state.status === 'allowed'` on the query.
 */
export function moduleRows<T>(state: ModuleState, rows: T[] | undefined): T[] | undefined {
  if (state.status === 'denied') return NO_ROWS;
  if (state.status === 'loading') return undefined;
  return rows;
}
