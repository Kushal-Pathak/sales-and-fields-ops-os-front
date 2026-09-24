import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  /** Faint count next to the title, e.g. "124 leads". */
  count?: string | undefined;
  /** Right-aligned action buttons. */
  actions?: ReactNode;
  /** Optional second row, typically filter chips. */
  children?: ReactNode;
}

/** Page title row rendered directly under the top bar. Follow it with `PageBody`. */
export function PageHeader({ title, count, actions, children }: PageHeaderProps) {
  return (
    <div className="flex-none px-4 pt-3.5 pb-2.5">
      <div className="flex items-center gap-2.5">
        <h1 className="text-2xl font-bold">{title}</h1>
        {count && <span className="text-sm text-foreground-faint">{count}</span>}
        {actions && <div className="ml-auto flex items-center gap-1.5">{actions}</div>}
      </div>
      {children && <div className="mt-2.5 flex items-center gap-1.5">{children}</div>}
    </div>
  );
}

/** The page's scroll container. Sticky table headers stick to this element. */
export function PageBody({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('min-h-0 flex-1 overflow-auto border-t', className)} {...props} />;
}
