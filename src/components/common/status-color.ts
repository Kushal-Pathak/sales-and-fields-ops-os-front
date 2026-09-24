import type { StatusColor } from '@/types/domain';

/**
 * The one place a `StatusColor` (stage / priority / avatar tint …) becomes classes.
 * Features map their categories onto `StatusColor`; they never pick colours directly.
 */
export interface StatusColorClasses {
  /** `Badge` variant for a pill. */
  badge: 'neutral' | 'info' | 'highlight' | 'warning' | 'success' | 'destructive';
  /** Fill for a 6px dot. */
  dot: string;
  /** Soft fill + strong text for a tinted avatar. */
  avatar: string;
  /** Solid fill for a colour swatch; important so it beats a radio's checked/dark styles. */
  swatch: string;
}

export const STATUS_COLOR_CLASSES: Record<StatusColor, StatusColorClasses> = {
  neutral: {
    badge: 'neutral',
    dot: 'bg-foreground-faint',
    avatar: 'bg-surface-2 text-foreground-secondary',
    swatch: 'bg-foreground-faint!',
  },
  info: {
    badge: 'info',
    dot: 'bg-info',
    avatar: 'bg-info-soft text-info',
    swatch: 'bg-info!',
  },
  highlight: {
    badge: 'highlight',
    dot: 'bg-highlight',
    avatar: 'bg-highlight-soft text-highlight',
    swatch: 'bg-highlight!',
  },
  warning: {
    badge: 'warning',
    dot: 'bg-warning',
    avatar: 'bg-warning-soft text-warning',
    swatch: 'bg-warning!',
  },
  success: {
    badge: 'success',
    dot: 'bg-success',
    avatar: 'bg-success-soft text-success',
    swatch: 'bg-success!',
  },
  destructive: {
    badge: 'destructive',
    dot: 'bg-destructive',
    avatar: 'bg-danger-soft text-destructive',
    swatch: 'bg-destructive!',
  },
};
