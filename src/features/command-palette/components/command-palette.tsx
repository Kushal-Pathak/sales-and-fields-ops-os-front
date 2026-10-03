import { useCallback, useMemo, useState } from 'react';
import {
  AlertCircleIcon,
  CalendarIcon,
  ClockIcon,
  FileTextIcon,
  ListChecksIcon,
  SparklesIcon,
  UserIcon,
  UsersIcon,
  type LucideIcon,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Kbd } from '@/components/ui/kbd';
import { getRecentQueries, pushRecentQuery } from '@/data/preferences';
import { AppointmentFormDialog } from '@/features/appointments';
import { useFlag, useModules } from '@/features/auth';
import { NewMessageDialog } from '@/features/inbox';
import { LeadFormDialog } from '@/features/leads';
import { TaskFormDialog } from '@/features/tasks';
import { useCommandPalette } from '@/hooks/use-command-palette';
import { useTheme } from '@/hooks/use-theme';
import { formatDate } from '@/lib/format';
import type { ModuleId, TaskType } from '@/types/domain';
import { usePaletteData } from '../hooks/use-palette-data';
import {
  filterCommands,
  quickActions,
  sectionCommands,
  type Command as PaletteCommand,
  type QuickActionId,
} from '../utils/commands';
import { INTENT_MODULE, parseIntent, SUGGESTED_QUERIES, type Intent } from '../utils/intents';
import { searchRecords, type RecordKind } from '../utils/search';
import { AnswerPanel, type AnswerState } from './answer-panel';

const KIND_ICON: Record<RecordKind, LucideIcon> = {
  lead: UserIcon,
  contact: UsersIcon,
  task: ListChecksIcon,
  quote: FileTextIcon,
  appointment: CalendarIcon,
};

const INTENT_LABEL: Record<
  Exclude<Intent, { type: 'create_task' | 'assign_hot_leads' }>['type'],
  string
> = {
  overdue_tasks: 'Show overdue tasks',
  leads_without_follow_up: 'Find leads without a follow-up',
  today: 'What is on today',
  hot_leads: 'Show hot leads',
  pending_quotes: 'Show quotes awaiting approval',
  unread_messages: 'Summarise unread messages',
};

type OpenDialog = 'lead' | 'task' | 'appointment' | 'message' | null;

interface TaskPrefill {
  leadId?: string | undefined;
  title?: string | undefined;
  type?: TaskType | undefined;
  dueAt?: string | undefined;
}

/**
 * The global ⌘K palette: navigate, search records, run quick actions, answer a
 * few questions locally, and hand the rest to the backend assistant. The dialogs
 * a quick action opens live here too, so they outlive the palette closing.
 */
export function CommandPalette() {
  const { open, initialQuery, closePalette } = useCommandPalette();
  const navigate = useNavigate();
  const [dialog, setDialog] = useState<OpenDialog>(null);
  const [taskPrefill, setTaskPrefill] = useState<TaskPrefill>({});
  const modules = useModules();

  const openDialog = (next: Exclude<OpenDialog, null>, prefill: TaskPrefill = {}) => {
    setTaskPrefill(prefill);
    closePalette();
    setDialog(next);
  };

  return (
    <>
      <CommandDialog
        open={open}
        onOpenChange={(next) => !next && closePalette()}
        title="Command palette"
        description="Search, navigate, or ask a question"
        className="shadow-overlay sm:max-w-[556px]"
      >
        {open && <PaletteBody initialQuery={initialQuery} onOpenDialog={openDialog} />}
      </CommandDialog>

      <LeadFormDialog
        open={dialog === 'lead'}
        onOpenChange={(next) => !next && setDialog(null)}
        onSaved={(id) => navigate(`/leads?lead=${id}`)}
      />
      {modules.tasks.status === 'allowed' && (
        <TaskFormDialog
          open={dialog === 'task'}
          onOpenChange={(next) => !next && setDialog(null)}
          defaultLeadId={taskPrefill.leadId}
          defaultTitle={taskPrefill.title}
          defaultType={taskPrefill.type}
          defaultDueAt={taskPrefill.dueAt}
          onSaved={(id) => navigate(`/tasks?view=all&task=${id}`)}
        />
      )}
      {modules.appointments.status === 'allowed' && (
        <AppointmentFormDialog
          open={dialog === 'appointment'}
          onOpenChange={(next) => !next && setDialog(null)}
          onSaved={(id) => navigate(`/appointments?view=all&appointment=${id}`)}
        />
      )}
      {modules.inbox.status === 'allowed' && (
        <NewMessageDialog
          open={dialog === 'message'}
          onOpenChange={(next) => !next && setDialog(null)}
          onStarted={(id) => navigate(`/inbox?c=${id}`)}
        />
      )}
    </>
  );
}

/** Mounted fresh on every open, so its state starts from the initial query. */
function PaletteBody({
  initialQuery,
  onOpenDialog,
}: {
  initialQuery: string;
  onOpenDialog: (dialog: Exclude<OpenDialog, null>, prefill?: TaskPrefill) => void;
}) {
  const { closePalette } = useCommandPalette();
  const navigate = useNavigate();
  const location = useLocation();
  const { resolvedTheme, setTheme } = useTheme();
  const refs = usePaletteData(true);
  const modules = useModules();
  const assistantOn = useFlag('assistant.ask');
  const [query, setQuery] = useState(initialQuery);
  const [answer, setAnswer] = useState<AnswerState | null>(null);
  const [recent] = useState<string[]>(() => getRecentQueries());

  // Everything the palette offers is limited to the modules open to the signed-in user.
  const isOpen = useCallback((id: ModuleId) => modules[id].status === 'allowed', [modules]);
  const findIntent = useCallback(
    (text: string): Intent | null => {
      const found = refs ? parseIntent(text, refs) : null;
      return found && isOpen(INTENT_MODULE[found.type]) ? found : null;
    },
    [refs, isOpen],
  );
  const sections = useMemo(() => sectionCommands(isOpen), [isOpen]);
  const actions = useMemo(() => quickActions(isOpen), [isOpen]);
  const suggested = useMemo(
    () => SUGGESTED_QUERIES.filter((item) => isOpen(item.module)),
    [isOpen],
  );
  const trimmed = query.trim();
  const records = useMemo(() => (refs ? searchRecords(trimmed, refs) : []), [refs, trimmed]);
  const intent = useMemo(() => (trimmed ? findIntent(trimmed) : null), [findIntent, trimmed]);
  const matchingSections = useMemo(() => filterCommands(sections, trimmed), [sections, trimmed]);
  const matchingActions = useMemo(() => filterCommands(actions, trimmed), [actions, trimmed]);
  const nothing =
    trimmed.length > 0 &&
    records.length === 0 &&
    !intent &&
    matchingSections.length === 0 &&
    matchingActions.length === 0;

  const go = (to: string) => {
    closePalette();
    navigate(to);
  };

  const remember = (text: string) => {
    pushRecentQuery(text);
  };

  const runIntent = (found: Intent, text: string) => {
    remember(text);
    if (found.type === 'create_task') {
      onOpenDialog('task', {
        leadId: found.lead?.id,
        title: found.title,
        type: found.taskType,
        dueAt: found.dueAt,
      });
      return;
    }
    setAnswer({ kind: 'intent', intent: found });
  };

  const runQuery = (text: string) => {
    if (!refs || !text.trim()) return;
    const found = findIntent(text);
    if (found) runIntent(found, text);
    else if (assistantOn) {
      remember(text);
      setAnswer({ kind: 'assistant', question: text.trim(), route: location.pathname });
    }
  };

  const runAction = (action: QuickActionId) => {
    switch (action) {
      case 'new_lead':
        onOpenDialog('lead');
        return;
      case 'new_task':
        onOpenDialog('task');
        return;
      case 'new_appointment':
        onOpenDialog('appointment');
        return;
      case 'new_message':
        onOpenDialog('message');
        return;
      case 'new_quote':
        go('/quotes/new');
        return;
      case 'import_leads':
        go('/leads/import');
        return;
      case 'toggle_theme':
        setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
        closePalette();
        return;
    }
  };

  const select = (command: PaletteCommand) => {
    if (command.to) go(command.to);
    else if (command.action) runAction(command.action);
  };

  const intentLabel = (found: Intent): { label: string; risky: boolean } => {
    if (found.type === 'create_task') {
      return {
        label: `Create task “${found.title}” due ${formatDate(found.dueAt, 'weekday')}`,
        risky: false,
      };
    }
    if (found.type === 'assign_hot_leads') {
      return { label: `Assign all hot leads to ${found.owner.name}`, risky: true };
    }
    return { label: INTENT_LABEL[found.type], risky: false };
  };

  return (
    <Command shouldFilter={false} loop>
      <CommandInput
        placeholder="Search leads, tasks, quotes, or ask a question…"
        value={query}
        onValueChange={(value) => {
          setQuery(value);
          setAnswer(null);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && trimmed && (intent || nothing)) {
            event.preventDefault();
            runQuery(trimmed);
          }
        }}
      />
      {answer && refs ? (
        <AnswerPanel state={answer} refs={refs} onNavigate={go} onBack={() => setAnswer(null)} />
      ) : (
        <CommandList>
          <CommandEmpty>{refs ? 'Nothing matches.' : 'Loading…'}</CommandEmpty>
          {!trimmed && recent.length > 0 && (
            <CommandGroup heading="Recent">
              {recent.map((text) => (
                <CommandItem key={text} value={`recent:${text}`} onSelect={() => runQuery(text)}>
                  <ClockIcon className="text-foreground-faint" /> {text}
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {!trimmed && suggested.length > 0 && (
            <CommandGroup heading="Suggested">
              {suggested.map((item) => (
                <CommandItem
                  key={item.text}
                  value={`suggested:${item.text}`}
                  onSelect={() => runQuery(item.text)}
                  className={item.risky ? 'items-start' : undefined}
                >
                  {item.risky ? (
                    <AlertCircleIcon className="mt-0.5 text-destructive" />
                  ) : (
                    <SparklesIcon />
                  )}
                  <span className="flex flex-col">
                    <span>{item.text}</span>
                    {item.risky && (
                      <span className="text-xs text-destructive">Requires confirmation</span>
                    )}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {records.length > 0 && (
            <CommandGroup heading="Results">
              {records.map((row) => {
                const Icon = KIND_ICON[row.kind];
                return (
                  <CommandItem
                    key={`${row.kind}:${row.id}`}
                    value={`${row.kind}:${row.id}`}
                    onSelect={() => go(row.to)}
                  >
                    <Icon className="text-foreground-faint" />
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate">{row.title}</span>
                      <span className="truncate text-xs text-muted-foreground">{row.subtitle}</span>
                    </span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          )}
          {trimmed && refs && (intent || assistantOn) && (
            <CommandGroup heading="Ask">
              {intent ? (
                (() => {
                  const { label, risky } = intentLabel(intent);
                  return (
                    <CommandItem
                      value="ask:intent"
                      onSelect={() => runIntent(intent, trimmed)}
                      className={risky ? 'items-start' : undefined}
                    >
                      {risky ? (
                        <AlertCircleIcon className="mt-0.5 text-destructive" />
                      ) : (
                        <SparklesIcon />
                      )}
                      <span className="flex flex-col">
                        <span>{label}</span>
                        {risky && (
                          <span className="text-xs text-destructive">Requires confirmation</span>
                        )}
                      </span>
                      <Kbd className="ml-auto">↵</Kbd>
                    </CommandItem>
                  );
                })()
              ) : (
                <CommandItem value="ask:assistant" onSelect={() => runQuery(trimmed)}>
                  <SparklesIcon />
                  <span className="truncate">Ask the assistant: “{trimmed}”</span>
                </CommandItem>
              )}
            </CommandGroup>
          )}
          {matchingSections.length > 0 && (
            <CommandGroup heading="Go to">
              {matchingSections.map((command) => (
                <CommandItem key={command.id} value={command.id} onSelect={() => select(command)}>
                  <command.icon className="text-foreground-faint" /> {command.label}
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {matchingActions.length > 0 && (
            <CommandGroup heading="Quick actions">
              {matchingActions.map((command) => (
                <CommandItem key={command.id} value={command.id} onSelect={() => select(command)}>
                  <command.icon className="text-foreground-faint" /> {command.label}
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      )}
    </Command>
  );
}
