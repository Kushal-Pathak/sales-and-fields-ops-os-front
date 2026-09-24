import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';
import type { StatusColor } from '@/types/domain';
import { STATUS_COLOR_CLASSES } from './status-color';

interface StatusDotProps extends ComponentProps<'span'> {
  color: StatusColor;
}

/** The 6px category dot used before labels in tables and pills. */
export function StatusDot({ color, className, ...props }: StatusDotProps) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-block size-1.5 shrink-0 rounded-full',
        STATUS_COLOR_CLASSES[color].dot,
        className,
      )}
      {...props}
    />
  );
}
