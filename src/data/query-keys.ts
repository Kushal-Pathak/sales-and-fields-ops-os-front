/**
 * TanStack Query key factory. Invalidate a whole collection with
 * `queryClient.invalidateQueries({ queryKey: queryKeys.leads.all })`.
 */
function keysFor<const N extends string>(name: N) {
  return {
    all: [name] as const,
    list: () => [name, 'list'] as const,
    detail: (id: string) => [name, 'detail', id] as const,
  };
}

export const queryKeys = {
  workspace: keysFor('workspace'),
  roles: keysFor('roles'),
  users: keysFor('users'),
  contacts: keysFor('contacts'),
  pipelines: keysFor('pipelines'),
  stages: keysFor('stages'),
  leads: keysFor('leads'),
  tasks: keysFor('tasks'),
  appointments: keysFor('appointments'),
  quotes: keysFor('quotes'),
  activities: keysFor('activities'),
  conversations: keysFor('conversations'),
  messages: keysFor('messages'),
  fields: keysFor('fields'),
  automations: keysFor('automations'),
  automationRuns: keysFor('automationRuns'),
} as const;
