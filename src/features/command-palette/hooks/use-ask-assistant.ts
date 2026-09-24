import { useMutation } from '@tanstack/react-query';
import { askAssistant, isAssistantConfigured } from '@/data/assistant';

/** Sends a free-form question to the backend assistant, when one is configured. */
export function useAskAssistant() {
  const mutation = useMutation({
    mutationFn: ({ question, route }: { question: string; route: string }) =>
      askAssistant(question, { route }),
  });
  return { ...mutation, isConfigured: isAssistantConfigured };
}
