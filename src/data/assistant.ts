import { api } from '@/lib/api';
import { env } from '@/lib/env';
import { getDataSessionSignal } from './session-scope';

/**
 * The backend assistant. The browser never talks to a model directly: questions the
 * palette cannot answer locally go to `POST /assistant/ask` on the API, which holds
 * the credentials. Without `VITE_API_BASE_URL` there is no assistant.
 */

export interface AssistantContext {
  /** The route the user was on, so the backend can ground its answer. */
  route: string;
}

export interface AssistantAnswer {
  answer: string;
}

export const isAssistantConfigured = Boolean(env.apiBaseUrl);

export async function askAssistant(
  question: string,
  context: AssistantContext,
): Promise<AssistantAnswer> {
  if (!isAssistantConfigured) throw new Error('No assistant is connected.');
  return api.post<AssistantAnswer>('/assistant/ask', {
    body: { question, context },
    signal: getDataSessionSignal(),
  });
}
