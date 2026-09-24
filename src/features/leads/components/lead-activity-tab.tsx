import { useState, type KeyboardEvent } from 'react';
import { StatusDot } from '@/components/common/status-dot';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useUsers, useWorkspace } from '@/features/workspace';
import { formatRelative } from '@/lib/format';
import { useAddLeadNote } from '../hooks/use-lead-mutations';
import { useLeadActivities } from '../hooks/use-lead-related';
import { ACTIVITY_COLOR } from '../utils/related-status';

/** Timeline of everything that happened to the lead, newest first, plus a note composer. */
export function LeadActivityTab({ leadId }: { leadId: string }) {
  const activities = useLeadActivities(leadId);
  const users = useUsers().data ?? [];
  const locale = useWorkspace().data?.locale;
  const addNote = useAddLeadNote();
  const [note, setNote] = useState('');

  const actorName = (id: string | null) =>
    id === null ? 'System' : (users.find((user) => user.id === id)?.name ?? 'Unknown user');

  const submit = () => {
    const message = note.trim();
    if (!message || addNote.isPending) return;
    addNote.mutate({ leadId, message }, { onSuccess: () => setNote('') });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      submit();
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <form
        className="flex flex-col gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <Textarea
          aria-label="Add a note"
          placeholder="Add a note…"
          rows={2}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          onKeyDown={onKeyDown}
        />
        <div className="flex items-center justify-end gap-2">
          {addNote.isError && (
            <span className="text-xs text-destructive">The note could not be saved.</span>
          )}
          <Button type="submit" size="sm" disabled={!note.trim() || addNote.isPending}>
            Add note
          </Button>
        </div>
      </form>

      {activities.isPending ? (
        <ul className="flex flex-col gap-3">
          {Array.from({ length: 4 }, (_, index) => (
            <li key={index} className="flex gap-2.5">
              <Skeleton className="mt-1 size-1.5 rounded-full" />
              <div className="flex flex-1 flex-col gap-1.5">
                <Skeleton className="h-3.5 w-3/4" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <ol className="flex flex-col">
          {(activities.data ?? []).map((activity) => (
            <li
              key={activity.id}
              className="flex gap-2.5 border-b border-border-faint py-2 last:border-0"
            >
              <StatusDot color={ACTIVITY_COLOR[activity.kind]} className="mt-1.5" />
              <div className="min-w-0 flex-1">
                <p className="text-sm whitespace-pre-wrap">{activity.message}</p>
                <p className="mt-0.5 text-xs text-foreground-faint">
                  {formatRelative(activity.createdAt, undefined, locale)} ·{' '}
                  {actorName(activity.actorId)}
                </p>
              </div>
            </li>
          ))}
          {activities.data?.length === 0 && (
            <li className="py-2 text-sm text-muted-foreground">No activity yet.</li>
          )}
        </ol>
      )}
    </div>
  );
}
