import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db, queryKeys } from '@/data';
import { useContacts } from '@/features/contacts';
import { useStages, useUsers } from '@/features/workspace';
import { joinConversations, type ConversationRow } from '../utils/inbox-view-model';

/**
 * Every conversation joined with its contact, lead, stage, owner and latest
 * message. Leads are read through the shared cache key, so this feature does not
 * depend on `features/leads`.
 */
export function useConversations() {
  const conversations = useQuery({
    queryKey: queryKeys.conversations.list(),
    queryFn: () => db.conversations.list(),
  });
  const messages = useQuery({
    queryKey: queryKeys.messages.list(),
    queryFn: () => db.messages.list(),
  });
  const leads = useQuery({ queryKey: queryKeys.leads.list(), queryFn: () => db.leads.list() });
  const contacts = useContacts();
  const stages = useStages();
  const users = useUsers();

  const rows = useMemo<ConversationRow[] | undefined>(() => {
    if (
      !conversations.data ||
      !messages.data ||
      !leads.data ||
      !contacts.data ||
      !stages.data ||
      !users.data
    )
      return undefined;
    return joinConversations(conversations.data, {
      messages: messages.data,
      leads: leads.data,
      contacts: contacts.data,
      stages: stages.data,
      users: users.data,
    });
  }, [conversations.data, messages.data, leads.data, contacts.data, stages.data, users.data]);

  const queries = [conversations, messages, leads, contacts, stages, users];
  return {
    rows,
    isPending: queries.some((query) => query.isPending),
    error: queries.find((query) => query.error)?.error ?? null,
    refetch: () => Promise.all(queries.map((query) => query.refetch())),
  };
}

export interface LeadOption {
  lead: { id: string; title: string; contactId: string };
  contact: { name: string } | undefined;
}

/** Lead + contact pairs for the new-message dialog. */
export function useLeadOptions(): LeadOption[] | undefined {
  const leads = useQuery({ queryKey: queryKeys.leads.list(), queryFn: () => db.leads.list() });
  const contacts = useContacts();
  return useMemo(() => {
    if (!leads.data || !contacts.data) return undefined;
    const byId = new Map(contacts.data.map((contact) => [contact.id, contact]));
    return leads.data.map((lead) => ({ lead, contact: byId.get(lead.contactId) }));
  }, [leads.data, contacts.data]);
}
