import { CheckIcon, DownloadIcon, ListIcon, UploadIcon } from 'lucide-react';
import { Link } from 'react-router';
import { ErrorState } from '@/components/common/empty-state';
import { StatusDot } from '@/components/common/status-dot';
import { Button } from '@/components/ui/button';
import { Progress, ProgressLabel, ProgressValue } from '@/components/ui/progress';
import { serializeCsv } from '@/lib/csv';
import type { ImportResult, RunProgress } from '../hooks/use-run-import';

interface ResultStepProps {
  headers: string[];
  progress: RunProgress | null;
  result: ImportResult | undefined;
  error: unknown;
  source: string;
  onImportMore: () => void;
}

/** Step 5: the progress bar while importing, then the counts and where to go next. */
export function ResultStep({
  headers,
  progress,
  result,
  error,
  source,
  onImportMore,
}: ResultStepProps) {
  if (error) {
    return <ErrorState title="The import stopped" error={error} onRetry={onImportMore} />;
  }

  if (!result) {
    const value = progress && progress.total > 0 ? (progress.done / progress.total) * 100 : 0;
    return (
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-xl font-bold">Importing leads…</h1>
          <p className="mt-1 text-sm text-muted-foreground">Please keep this tab open.</p>
        </div>
        <Progress value={value} aria-label="Import progress">
          <ProgressLabel>
            {progress ? `${progress.done} of ${progress.total} rows` : 'Preparing'}
          </ProgressLabel>
          <ProgressValue>{() => `${Math.round(value)}%`}</ProgressValue>
        </Progress>
        <p className="text-xs text-foreground-faint" aria-live="polite">
          {progress?.phase}
        </p>
      </div>
    );
  }

  const skippedHref = `data:text/csv;charset=utf-8,${encodeURIComponent(
    serializeCsv(
      [...headers, 'Reason'],
      result.skippedRows.map(({ row, reason }) => [...row.raw, reason]),
    ),
  )}`;
  const lines = [
    { label: 'Leads imported', value: result.leadsCreated, color: 'success' as const },
    { label: 'New contacts created', value: result.contactsCreated, color: 'success' as const },
    {
      label: 'Existing contacts matched',
      value: result.contactsMatched,
      color: 'warning' as const,
    },
    { label: 'Contacts updated', value: result.contactsUpdated, color: 'info' as const },
    { label: 'Follow-up tasks created', value: result.tasksCreated, color: 'highlight' as const },
    { label: 'Rows skipped', value: result.skipped, color: 'neutral' as const },
    { label: 'Failed', value: result.failed, color: 'destructive' as const },
  ];

  return (
    <div className="flex flex-col items-center gap-5 text-center">
      <span className="flex size-10 items-center justify-center rounded-full bg-success-soft text-success">
        <CheckIcon className="size-5" />
      </span>
      <div>
        <h1 className="text-xl font-bold">Import complete</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {result.leadsCreated} lead{result.leadsCreated === 1 ? '' : 's'} added to Pilot CRM.
        </p>
      </div>

      <dl className="w-full max-w-sm rounded-lg border text-left">
        {lines
          .filter((line) => line.value > 0 || line.label === 'Leads imported')
          .map((line) => (
            <div
              key={line.label}
              className="flex items-center gap-2.5 border-b border-border-faint px-3 py-2 last:border-0"
            >
              <StatusDot color={line.color} />
              <dt className="flex-1 text-sm">{line.label}</dt>
              <dd className="text-sm font-bold tabular-nums">{line.value}</dd>
            </div>
          ))}
      </dl>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button
          size="sm"
          nativeButton={false}
          render={<Link to={`/leads?source=${encodeURIComponent(source)}&sort=-created`} />}
        >
          <ListIcon /> View imported leads
        </Button>
        <Button variant="outline" size="sm" onClick={onImportMore}>
          <UploadIcon /> Import more
        </Button>
        {result.skippedRows.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            nativeButton={false}
            render={<a href={skippedHref} download="skipped-rows.csv" />}
          >
            <DownloadIcon /> Skipped rows
          </Button>
        )}
      </div>
    </div>
  );
}
