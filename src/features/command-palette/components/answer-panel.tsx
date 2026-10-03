import { useEffect } from 'react';
import {
  AlertTriangleIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  SparklesIcon,
} from 'lucide-react';
import { StatusBadge } from '@/components/common/status-badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useFlag } from '@/features/auth';
import { useBulkAssignLeads } from '@/features/leads';
import type { User } from '@/types/domain';
import { useAskAssistant } from '../hooks/use-ask-assistant';
import { answerIntent, hotLeadsToAssign, type Intent, type IntentRefs } from '../utils/intents';

export type AnswerState =
  | { kind: 'intent'; intent: Exclude<Intent, { type: 'create_task' }> }
  | { kind: 'assistant'; question: string; route: string };

interface AnswerPanelProps {
  state: AnswerState;
  refs: IntentRefs;
  onNavigate: (to: string) => void;
  onBack: () => void;
}

/** What the palette shows once a question is chosen: rows, a confirmation, or the assistant's reply. */
export function AnswerPanel({ state, refs, onNavigate, onBack }: AnswerPanelProps) {
  return (
    <div className="flex flex-col gap-3 border-t p-3" data-slot="answer-panel">
      {state.kind === 'assistant' ? (
        <AssistantAnswer question={state.question} route={state.route} />
      ) : state.intent.type === 'assign_hot_leads' ? (
        <AssignHotLeads owner={state.intent.owner} refs={refs} onNavigate={onNavigate} />
      ) : (
        <IntentRows intent={state.intent} refs={refs} onNavigate={onNavigate} />
      )}
      <div className="flex">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeftIcon /> Back
        </Button>
      </div>
    </div>
  );
}

function IntentRows({
  intent,
  refs,
  onNavigate,
}: {
  intent: Exclude<Intent, { type: 'create_task' | 'assign_hot_leads' }>;
  refs: IntentRefs;
  onNavigate: (to: string) => void;
}) {
  const answer = answerIntent(intent, refs);
  if (!answer) return null;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <SparklesIcon className="size-4 text-foreground-faint" />
        <h3 className="text-sm font-bold">{answer.title}</h3>
      </div>
      {answer.rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{answer.empty}</p>
      ) : (
        <ul className="flex flex-col rounded-lg border">
          {answer.rows.map((row) => (
            <li key={row.id} className="border-b border-border-faint last:border-0">
              <button
                type="button"
                onClick={() => onNavigate(row.to)}
                className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{row.title}</span>
                  {row.subtitle && (
                    <span className="block truncate text-xs text-muted-foreground">
                      {row.subtitle}
                    </span>
                  )}
                </span>
                {row.badge && <StatusBadge color={row.badge.color}>{row.badge.label}</StatusBadge>}
                <ArrowRightIcon className="size-3.5 shrink-0 text-foreground-faint" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {answer.total > answer.rows.length && (
        <p className="text-xs text-foreground-faint">
          Showing {answer.rows.length} of {answer.total}.
        </p>
      )}
      <div>
        <Button size="sm" onClick={() => onNavigate(answer.to)}>
          {answer.listLabel} <ArrowRightIcon />
        </Button>
      </div>
    </div>
  );
}

function AssignHotLeads({
  owner,
  refs,
  onNavigate,
}: {
  owner: User;
  refs: IntentRefs;
  onNavigate: (to: string) => void;
}) {
  const { leadIds, confirmText } = hotLeadsToAssign(owner, refs);
  const assign = useBulkAssignLeads();

  if (assign.isSuccess) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <CheckIcon className="size-4 text-success" />
          <h3 className="text-sm font-bold">
            Reassigned {assign.data.changed} lead{assign.data.changed === 1 ? '' : 's'} to{' '}
            {owner.name}
          </h3>
        </div>
        <div>
          <Button size="sm" onClick={() => onNavigate(`/leads?view=hot&owner=${owner.id}`)}>
            Open their leads <ArrowRightIcon />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-destructive/40 bg-danger-soft/40 p-3">
      <div className="flex items-center gap-2">
        <AlertTriangleIcon className="size-4 text-destructive" />
        <h3 className="text-sm font-bold">Confirm action</h3>
      </div>
      <p className="text-sm text-foreground-secondary">{confirmText}</p>
      {assign.isError && (
        <p role="alert" className="text-xs text-destructive">
          The leads could not be reassigned.
        </p>
      )}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="destructive"
          disabled={leadIds.length === 0 || assign.isPending}
          onClick={() => assign.mutate({ leadIds, ownerId: owner.id })}
        >
          Yes, proceed
        </Button>
      </div>
    </div>
  );
}

function AssistantAnswer({ question, route }: { question: string; route: string }) {
  const ask = useAskAssistant();
  const { mutate } = ask;
  // The `assistant.ask` flag is the kill switch, and it can flip while this panel is open.
  const switchedOn = useFlag('assistant.ask');
  const isConfigured = ask.isConfigured && switchedOn;

  // Ask once per question; `mutate` is referentially stable.
  useEffect(() => {
    if (isConfigured) mutate({ question, route });
  }, [isConfigured, mutate, question, route]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <SparklesIcon className="size-4 text-foreground-faint" />
        <h3 className="truncate text-sm font-bold">“{question}”</h3>
      </div>
      {!switchedOn ? (
        <p className="text-sm text-muted-foreground">The assistant is switched off right now.</p>
      ) : !isConfigured ? (
        <p className="text-sm text-muted-foreground">
          No assistant is connected. Pilot CRM can answer this once a backend behind{' '}
          <code className="font-mono text-xs">VITE_API_BASE_URL</code> implements{' '}
          <code className="font-mono text-xs">POST /assistant/ask</code>. Model keys never live in
          the browser.
        </p>
      ) : ask.isPending || ask.isIdle ? (
        <div className="flex flex-col gap-1.5" aria-busy="true" aria-label="Thinking">
          <Skeleton className="h-3.5 w-3/4" />
          <Skeleton className="h-3.5 w-1/2" />
        </div>
      ) : ask.isError ? (
        <p role="alert" className="text-sm text-destructive">
          The assistant did not answer. Try again in a moment.
        </p>
      ) : (
        <p className="text-sm whitespace-pre-wrap text-foreground-secondary">{ask.data?.answer}</p>
      )}
    </div>
  );
}
