import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db, queryKeys } from '@/data';
import type { Message } from '@/types/domain';

/** One conversation's messages, oldest first, from the shared messages cache. */
export function useThread(conversationId: string | null) {
  const select = useCallback(
    (rows: Message[]) =>
      rows
        .filter((row) => row.conversationId === conversationId)
        .sort((a, b) => a.sentAt.localeCompare(b.sentAt)),
    [conversationId],
  );
  return useQuery({
    queryKey: queryKeys.messages.list(),
    queryFn: () => db.messages.list(),
    enabled: conversationId !== null,
    select,
  });
}
