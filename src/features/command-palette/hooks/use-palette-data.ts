import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db, queryKeys } from '@/data';
import { moduleRows, useModules } from '@/features/auth';
import type { ModuleId } from '@/types/domain';
import type { IntentRefs } from '../utils/intents';

/**
 * Every collection the palette searches or reasons over, fetched only while it is open.
 * A module that is closed to the user is not fetched and contributes no rows, even if
 * some are still cached.
 */
export function usePaletteData(enabled: boolean) {
  const modules = useModules();
  const on = (id: ModuleId) => enabled && modules[id].status === 'allowed';
  const leads = useQuery({
    queryKey: queryKeys.leads.list(),
    queryFn: ({ signal }) => db.leads.list({ signal }),
    enabled: on('leads'),
  });
  const contacts = useQuery({
    queryKey: queryKeys.contacts.list(),
    queryFn: ({ signal }) => db.contacts.list({ signal }),
    enabled,
  });
  const tasks = useQuery({
    queryKey: queryKeys.tasks.list(),
    queryFn: ({ signal }) => db.tasks.list({ signal }),
    enabled: on('tasks'),
  });
  const quotes = useQuery({
    queryKey: queryKeys.quotes.list(),
    queryFn: ({ signal }) => db.quotes.list({ signal }),
    enabled: on('quotes'),
  });
  const appointments = useQuery({
    queryKey: queryKeys.appointments.list(),
    queryFn: ({ signal }) => db.appointments.list({ signal }),
    enabled: on('appointments'),
  });
  const conversations = useQuery({
    queryKey: queryKeys.conversations.list(),
    queryFn: ({ signal }) => db.conversations.list({ signal }),
    enabled: on('inbox'),
  });
  const messages = useQuery({
    queryKey: queryKeys.messages.list(),
    queryFn: ({ signal }) => db.messages.list({ signal }),
    enabled: on('inbox'),
  });
  const users = useQuery({
    queryKey: queryKeys.users.list(),
    queryFn: ({ signal }) => db.users.list({ signal }),
    enabled,
  });
  const stages = useQuery({
    queryKey: queryKeys.stages.list(),
    queryFn: ({ signal }) => db.stages.list({ signal }),
    enabled,
  });

  const refs = useMemo<IntentRefs | undefined>(() => {
    const rows = {
      leads: moduleRows(modules.leads, leads.data),
      contacts: contacts.data,
      tasks: moduleRows(modules.tasks, tasks.data),
      quotes: moduleRows(modules.quotes, quotes.data),
      appointments: moduleRows(modules.appointments, appointments.data),
      conversations: moduleRows(modules.inbox, conversations.data),
      messages: moduleRows(modules.inbox, messages.data),
      users: users.data,
      stages: stages.data,
    };
    if (
      !rows.leads ||
      !rows.contacts ||
      !rows.tasks ||
      !rows.quotes ||
      !rows.appointments ||
      !rows.conversations ||
      !rows.messages ||
      !rows.users ||
      !rows.stages
    )
      return undefined;
    return {
      leads: rows.leads,
      contacts: rows.contacts,
      tasks: rows.tasks,
      quotes: rows.quotes,
      appointments: rows.appointments,
      conversations: rows.conversations,
      messages: rows.messages,
      users: rows.users,
      stages: rows.stages,
    };
  }, [
    modules,
    leads.data,
    contacts.data,
    tasks.data,
    quotes.data,
    appointments.data,
    conversations.data,
    messages.data,
    users.data,
    stages.data,
  ]);

  return refs;
}
