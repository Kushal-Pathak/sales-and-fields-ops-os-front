import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db, queryKeys } from '@/data';
import type { IntentRefs } from '../utils/intents';

/** Every collection the palette searches or reasons over, fetched only while it is open. */
export function usePaletteData(enabled: boolean) {
  const leads = useQuery({
    queryKey: queryKeys.leads.list(),
    queryFn: () => db.leads.list(),
    enabled,
  });
  const contacts = useQuery({
    queryKey: queryKeys.contacts.list(),
    queryFn: () => db.contacts.list(),
    enabled,
  });
  const tasks = useQuery({
    queryKey: queryKeys.tasks.list(),
    queryFn: () => db.tasks.list(),
    enabled,
  });
  const quotes = useQuery({
    queryKey: queryKeys.quotes.list(),
    queryFn: () => db.quotes.list(),
    enabled,
  });
  const appointments = useQuery({
    queryKey: queryKeys.appointments.list(),
    queryFn: () => db.appointments.list(),
    enabled,
  });
  const conversations = useQuery({
    queryKey: queryKeys.conversations.list(),
    queryFn: () => db.conversations.list(),
    enabled,
  });
  const messages = useQuery({
    queryKey: queryKeys.messages.list(),
    queryFn: () => db.messages.list(),
    enabled,
  });
  const users = useQuery({
    queryKey: queryKeys.users.list(),
    queryFn: () => db.users.list(),
    enabled,
  });
  const stages = useQuery({
    queryKey: queryKeys.stages.list(),
    queryFn: () => db.stages.list(),
    enabled,
  });

  const refs = useMemo<IntentRefs | undefined>(() => {
    if (
      !leads.data ||
      !contacts.data ||
      !tasks.data ||
      !quotes.data ||
      !appointments.data ||
      !conversations.data ||
      !messages.data ||
      !users.data ||
      !stages.data
    )
      return undefined;
    return {
      leads: leads.data,
      contacts: contacts.data,
      tasks: tasks.data,
      quotes: quotes.data,
      appointments: appointments.data,
      conversations: conversations.data,
      messages: messages.data,
      users: users.data,
      stages: stages.data,
    };
  }, [
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
