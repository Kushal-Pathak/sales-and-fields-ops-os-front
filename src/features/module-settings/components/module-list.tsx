import { QueryContent } from '@/components/common/query-content';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { useCan, useFlags } from '@/features/auth';
import { useWorkspace } from '@/features/workspace';
import { useSetModuleEnabled } from '../hooks/use-module-settings';
import { buildModuleRows } from '../utils/module-rows';

/** Every module with its switch. Only modules the backend marks configurable can be changed. */
export function ModuleList() {
  const workspace = useWorkspace();
  const canManage = useCan('modules.manage');
  const flags = useFlags();
  const setEnabled = useSetModuleEnabled();
  const rows = workspace.data ? buildModuleRows(workspace.data.modules, flags) : undefined;

  return (
    <QueryContent
      error={workspace.error}
      hasData={rows !== undefined}
      title="Modules could not be loaded"
      onRetry={() => void workspace.refetch()}
    >
      <div className="flex max-w-2xl flex-col gap-3">
        <ul className="rounded-xl border">
          {rows
            ? rows.map((row) => (
                <li
                  key={row.id}
                  className="flex items-center gap-3 border-b border-border-faint px-3 py-2.5 last:border-0"
                >
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-sm font-semibold">{row.label}</span>
                    <span className="text-xs text-muted-foreground">{row.description}</span>
                    {row.note && (
                      <span className="mt-0.5 text-xs text-foreground-faint">{row.note}</span>
                    )}
                  </span>
                  <Switch
                    aria-label={`${row.label} module`}
                    checked={row.enabled}
                    disabled={!row.configurable || !canManage || setEnabled.isPending}
                    onCheckedChange={(enabled) => setEnabled.mutate({ id: row.id, enabled })}
                  />
                </li>
              ))
            : Array.from({ length: 6 }, (_, index) => (
                <li key={index} className="border-b border-border-faint px-3 py-3 last:border-0">
                  <Skeleton className="h-4 w-1/3" />
                </li>
              ))}
        </ul>
        {setEnabled.isError && (
          <p role="alert" className="text-sm text-destructive">
            The module could not be changed. Try again.
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Switching a module off hides it for everyone and keeps its records. Who can open a module
          that is on is set per role, under Team → Roles.
        </p>
      </div>
    </QueryContent>
  );
}
