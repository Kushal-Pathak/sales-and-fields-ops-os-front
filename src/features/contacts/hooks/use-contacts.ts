import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { db, queryKeys } from '@/data';
import type { Contact, CreateInput } from '@/types/domain';

export function useContacts() {
  return useQuery({
    queryKey: queryKeys.contacts.list(),
    queryFn: () => db.contacts.list(),
  });
}

export function useCreateContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateInput<Contact>) => db.contacts.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.contacts.all }),
  });
}
