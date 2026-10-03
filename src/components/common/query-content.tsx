import type { ReactNode } from 'react';
import { AlertTriangleIcon } from 'lucide-react';
import { isAccessError } from '@/data/errors';
import { Button } from '@/components/ui/button';
import { ErrorState } from './empty-state';

interface QueryContentProps {
  error: unknown;
  hasData: boolean;
  title: string;
  onRetry?: (() => void) | undefined;
  children: ReactNode;
}

/** Cached content survives a transient refresh failure; access failures still block it. */
export function QueryContent({ error, hasData, title, onRetry, children }: QueryContentProps) {
  if (error && (!hasData || isAccessError(error))) {
    return <ErrorState title={title} error={error} onRetry={onRetry} />;
  }
  return (
    <>
      {Boolean(error) && <RefreshNotice onRetry={onRetry} />}
      {children}
    </>
  );
}

export function RefreshNotice({ onRetry }: { onRetry?: (() => void) | undefined }) {
  return (
    <div
      role="status"
      className="flex items-center gap-2 border-b border-border bg-warning-soft px-3 py-2 text-xs text-foreground-secondary print:hidden"
    >
      <AlertTriangleIcon className="size-3.5 shrink-0" aria-hidden="true" />
      <span className="flex-1">Could not refresh. Showing previously loaded data.</span>
      {onRetry && (
        <Button variant="outline" size="xs" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}
