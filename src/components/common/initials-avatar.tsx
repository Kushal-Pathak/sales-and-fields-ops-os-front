import type { ComponentProps } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { initials } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { StatusColor } from '@/types/domain';
import { STATUS_COLOR_CLASSES } from './status-color';

interface InitialsAvatarProps extends ComponentProps<typeof Avatar> {
  name: string;
  /** Tint for people with an assigned colour (users); contacts use the plain ring. */
  color?: StatusColor | undefined;
}

/** Initials avatar per the design system: plain ring by default, tinted when `color` is set. */
export function InitialsAvatar({
  name,
  color,
  size = 'default',
  className,
  ...props
}: InitialsAvatarProps) {
  return (
    <Avatar size={size} className={className} {...props}>
      <AvatarFallback
        className={cn(
          'font-semibold group-data-[size=sm]/avatar:text-2xs',
          color ? STATUS_COLOR_CLASSES[color].avatar : 'bg-background text-foreground-secondary',
        )}
      >
        {initials(name)}
      </AvatarFallback>
    </Avatar>
  );
}
