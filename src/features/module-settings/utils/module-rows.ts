import type { AccessContext } from '@/data/access';
import { MODULES, resolveModule, type ModuleDefinition } from '@/features/auth';
import { MODULE_IDS, PERMISSION_KEYS, type ModuleId, type WorkspaceModule } from '@/types/domain';

export interface ModuleRow {
  id: ModuleId;
  label: string;
  description: string;
  enabled: boolean;
  /** Whether a workspace admin may switch it; the backend decides. */
  configurable: boolean;
  /** What an admin should know before or after switching it, if anything. */
  note: string | null;
}

type Definitions = Record<ModuleId, ModuleDefinition>;

function list(labels: string[], word: 'and' | 'or'): string {
  if (labels.length <= 1) return labels.join('');
  return `${labels.slice(0, -1).join(', ')} ${word} ${labels[labels.length - 1]}`;
}

/** The modules a workspace with exactly `enabled` switched on could use, permissions aside. */
function available(
  enabled: ModuleId[],
  flags: AccessContext['flags'],
  definitions: Definitions,
): Set<ModuleId> {
  const context: AccessContext = {
    workspaceId: '',
    revision: '',
    permissions: [...PERMISSION_KEYS],
    modules: enabled,
    flags,
  };
  return new Set(
    MODULE_IDS.filter((id) => resolveModule(id, context, definitions).status === 'allowed'),
  );
}

/** The modules it needs that are switched off, phrased for "Not available until … is on". */
function missing(id: ModuleId, enabled: ModuleId[], definitions: Definitions): string {
  const requires = definitions[id].requires;
  const off = (ids: readonly ModuleId[]) =>
    ids.filter((dependency) => !enabled.includes(dependency));
  const all = off(requires?.all ?? []).map((dependency) => definitions[dependency].label);
  const any = requires?.any ?? [];
  const anyOff = off(any).length === any.length ? any.map((d) => definitions[d].label) : [];
  return [list(all, 'and'), list(anyOff, 'or')].filter(Boolean).join(', and ');
}

/**
 * One row per module for the settings page, with the consequence of its current state:
 * a module that is on but cannot work, or what else closes when it is switched off.
 * Uses the same resolver as the rest of the app, so the page cannot disagree with it.
 */
export function buildModuleRows(
  modules: WorkspaceModule[],
  flags: AccessContext['flags'],
  definitions: Definitions = MODULES,
): ModuleRow[] {
  const state = new Map(modules.map((module) => [module.id, module]));
  const enabled = MODULE_IDS.filter((id) => state.get(id)?.enabled);
  const usable = available(enabled, flags, definitions);

  return MODULE_IDS.map((id) => {
    const isEnabled = enabled.includes(id);
    const configurable = state.get(id)?.configurable ?? false;
    let note: string | null = null;
    if (!configurable) {
      note = isEnabled ? 'Always on.' : 'Not included in this workspace.';
    } else if (isEnabled && !usable.has(id)) {
      const needs = missing(id, enabled, definitions);
      note = needs ? `Not available until ${needs} is on.` : 'Not available yet.';
    } else if (isEnabled) {
      const without = available(
        enabled.filter((other) => other !== id),
        flags,
        definitions,
      );
      const closes = [...usable].filter((other) => other !== id && !without.has(other));
      if (closes.length > 0)
        note = `Switching it off also closes ${list(
          closes.map((other) => definitions[other].label),
          'and',
        )}.`;
    }
    return {
      id,
      label: definitions[id].label,
      description: definitions[id].description,
      enabled: isEnabled,
      configurable,
      note,
    };
  });
}
