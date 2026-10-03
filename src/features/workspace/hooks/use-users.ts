import { useQuery } from '@tanstack/react-query';
import { db, queryKeys } from '@/data';

export function useUsers() {
  return useQuery({
    queryKey: queryKeys.users.list(),
    queryFn: ({ signal }) => db.users.list({ signal }),
  });
}
