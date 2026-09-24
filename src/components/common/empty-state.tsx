import type { ReactNode } from 'react';
import { AlertTriangleIcon, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  hint?: string | undefined;
  action?: ReactNode;
  className?: string | undefined;
  /** Use the destructive icon tile (error states). */
  tone?: 'default' | 'destructive';
}

/** Centred empty / error block per the design system "Empty, loading, error states". */
export function EmptyState({
  icon: Icon,
  title,
  hint,
  action,
  className,
  tone = 'default',
}: EmptyStateProps) {
  return (
    <div className={cn('flex flex-1 items-center justify-center p-6', className)}>
      <div className="flex max-w-xs flex-col items-center text-center">
        <span
          className={cn(
            'flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground',
            tone === 'destructive' && 'bg-danger-soft text-destructive',
          )}
        >
          <Icon className="size-4" />
        </span>
        <h2 className="mt-3 text-base font-semibold">{title}</h2>
        {hint && <p className="mt-1 text-sm text-muted-foreground">{hint}</p>}
        {action && <div className="mt-3">{action}</div>}
      </div>
    </div>
  );
}

interface ErrorStateProps {
  title?: string;
  error?: unknown;
  onRetry?: (() => void) | undefined;
  className?: string | undefined;
}

/** Error block with a Retry button. Shows the error message when it is an `Error`. */
export function ErrorState({
  title = 'Something went wrong',
  error,
  onRetry,
  className,
}: ErrorStateProps) {
  const hint = error instanceof Error ? error.message : 'The data could not be loaded.';
  return (
    <EmptyState
      icon={AlertTriangleIcon}
      tone="destructive"
      title={title}
      hint={hint}
      action={
        onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            Retry
          </Button>
        )
      }
      className={className}
    />
  );
}
