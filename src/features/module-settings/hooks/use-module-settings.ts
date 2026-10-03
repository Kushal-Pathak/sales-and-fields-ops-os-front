import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/data';
import { useWriteOperation } from '@/hooks/use-write-operation';
import { setModuleEnabled, type SetModuleEnabledInput } from '@/data/module-settings';

/**
 * Switches a module on or off for the whole workspace. Records are kept; the module
 * simply stops being shown and fetched. The backend has the last word (plan limits,
 * `modules.manage`), so the access context is reloaded rather than patched.
 */
export function useSetModuleEnabled() {
  const write = useWriteOperation('settings');
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SetModuleEnabledInput) =>
      write((_db, options) => setModuleEnabled(input, options)),
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.workspace.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.access.all }),
      ]),
  });
}
