import { beginOptimisticListUpdate } from '@/data/optimistic-list';
import { useWriteOperation } from '@/hooks/use-write-operation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys, type Db } from '@/data';
import { useCurrentUser } from '@/features/workspace';
import type { Channel, Conversation, Message } from '@/types/domain';
import { CHANNEL_LABEL } from '../utils/inbox-labels';

/**
 * Inbox mutations. There is no messaging provider yet: sending stores the outbound
 * message locally and logs it on the lead's timeline, so the rest of the app sees it.
 */

function useInvalidate() {
  const queryClient = useQueryClient();
  return (...keys: readonly (readonly string[])[]) =>
    Promise.all(keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
}

const AFTER_SEND = [
  queryKeys.messages.all,
  queryKeys.conversations.all,
  queryKeys.activities.all,
  queryKeys.leads.all,
] as const;

const PREVIEW_LENGTH = 80;

async function deliver(
  db: Db,
  conversation: Conversation,
  body: string,
  actorId: string | null,
): Promise<Message> {
  const now = new Date().toISOString();
  const message = await db.messages.create({
    conversationId: conversation.id,
    direction: 'outbound',
    body,
    sentAt: now,
  });
  await db.conversations.update(conversation.id, { lastMessageAt: now, unreadCount: 0 });
  if (conversation.leadId) {
    const preview = body.length > PREVIEW_LENGTH ? `${body.slice(0, PREVIEW_LENGTH)}…` : body;
    await db.activities.create({
      entityType: 'lead',
      entityId: conversation.leadId,
      kind: 'message',
      message: `Message sent via ${CHANNEL_LABEL[conversation.channel]}: ${preview}`,
      actorId,
    });
    await db.leads.update(conversation.leadId, { lastActivityAt: now });
  }
  return message;
}

export function useSendMessage() {
  const write = useWriteOperation('inbox');
  const invalidate = useInvalidate();
  const actorId = useCurrentUser().data?.id ?? null;
  return useMutation({
    mutationFn: async ({ conversationId, body }: { conversationId: string; body: string }) =>
      write(async (db) => {
        const trimmed = body.trim();
        if (!trimmed) throw new Error('Type a message first.');
        const conversation = await db.conversations.get(conversationId);
        return deliver(db, conversation, trimmed, actorId);
      }),
    onSettled: () => invalidate(...AFTER_SEND),
  });
}

/** Clears the unread badge as soon as a thread is opened. Optimistic on the list. */
export function useMarkRead() {
  const write = useWriteOperation('inbox');
  const queryClient = useQueryClient();
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) =>
      write(async (db) => db.conversations.update(id, { unreadCount: 0 })),
    onMutate: async (id) => {
      return beginOptimisticListUpdate<Conversation>(
        queryClient,
        queryKeys.conversations.list(),
        (rows) => rows.map((row) => (row.id === id ? { ...row, unreadCount: 0 } : row)),
        write.signal,
      );
    },
    onError: (_error, _id, context) => {
      context?.rollback();
    },
    onSettled: async (_data, _error, _input, context) => {
      try {
        return await invalidate(queryKeys.conversations.all);
      } finally {
        context?.release();
      }
    },
  });
}

export function useMarkUnread() {
  const write = useWriteOperation('inbox');
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) =>
      write(async (db) => db.conversations.update(id, { unreadCount: 1 })),
    onSettled: () => invalidate(queryKeys.conversations.all),
  });
}

export interface StartConversationInput {
  leadId: string;
  channel: Channel;
  body: string;
}

/** Sends the first message, reusing the lead's conversation on that channel if one exists. */
export function useStartConversation() {
  const write = useWriteOperation('inbox');
  const invalidate = useInvalidate();
  const actorId = useCurrentUser().data?.id ?? null;
  return useMutation({
    mutationFn: async ({ leadId, channel, body }: StartConversationInput): Promise<string> =>
      write(async (db) => {
        const trimmed = body.trim();
        if (!trimmed) throw new Error('Type a message first.');
        const lead = await db.leads.get(leadId);
        const existing = (await db.conversations.list()).find(
          (row) => row.leadId === leadId && row.channel === channel,
        );
        const conversation =
          existing ??
          (await db.conversations.create({
            contactId: lead.contactId,
            leadId,
            channel,
            lastMessageAt: new Date().toISOString(),
            unreadCount: 0,
          }));
        await deliver(db, conversation, trimmed, actorId);
        return conversation.id;
      }),
    onSettled: () => invalidate(...AFTER_SEND),
  });
}
