import type { ComponentProps } from 'react';
import { Badge } from '@/components/ui/badge';
import type { StatusColor } from '@/types/domain';
import { STATUS_COLOR_CLASSES } from './status-color';

interface StatusBadgeProps extends Omit<ComponentProps<typeof Badge>, 'variant' | 'color'> {
  color: StatusColor;
  /** Show the leading dot (default true). */
  dot?: boolean;
}

/** A status pill: soft fill, strong text and a leading dot in the same colour. */
export function StatusBadge({ color, dot = true, children, ...props }: StatusBadgeProps) {
  return (
    <Badge variant={STATUS_COLOR_CLASSES[color].badge} {...props}>
      {dot && <span aria-hidden className="size-1.5 rounded-full bg-current" />}
      {children}
    </Badge>
  );
}
