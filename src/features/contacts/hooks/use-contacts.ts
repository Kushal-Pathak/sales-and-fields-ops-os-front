import { useWriteOperation } from '@/hooks/use-write-operation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { db, queryKeys } from '@/data';
import type { Contact, CreateInput } from '@/types/domain';

export function useContacts() {
  return useQuery({
    queryKey: queryKeys.contacts.list(),
    queryFn: ({ signal }) => db.contacts.list({ signal }),
  });
}

export function useCreateContact() {
  const write = useWriteOperation();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateInput<Contact>) => write(async (db) => db.contacts.create(input)),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.contacts.all }),
  });
}
