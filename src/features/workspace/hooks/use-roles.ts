import { useQuery } from '@tanstack/react-query';
import { db, queryKeys } from '@/data';

export function useRoles() {
  return useQuery({
    queryKey: queryKeys.roles.list(),
    queryFn: ({ signal }) => db.roles.list({ signal }),
  });
}
