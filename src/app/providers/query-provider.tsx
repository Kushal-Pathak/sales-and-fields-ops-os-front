import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useContext, useEffect, useState, type ReactNode } from 'react';
import { shouldRetryQuery } from '@/data/errors';
import { hasPendingListWrite } from '@/data/optimistic-list';
import { SessionContext } from './session-context';

/**
 * TanStack Query client for server state. Feature hooks wrap `useQuery` /
 * `useMutation` around `db.<collection>` from `@/data` and use `queryKeys`.
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  const session = useContext(SessionContext);
  return <SessionQueries key={session?.cacheVersion ?? 0}>{children}</SessionQueries>;
}

function SessionQueries({ children }: { children: ReactNode }) {
  const [client] = useState(() => {
    const queryClient: QueryClient = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 30_000,
          retry: shouldRetryQuery,
          refetchOnWindowFocus: (query) => !hasPendingListWrite(queryClient, query.queryKey),
          refetchOnReconnect: (query) => !hasPendingListWrite(queryClient, query.queryKey),
          refetchOnMount: (query) => !hasPendingListWrite(queryClient, query.queryKey),
        },
        mutations: { retry: false },
      },
    });
    return queryClient;
  });

  useEffect(() => () => client.clear(), [client]);

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
