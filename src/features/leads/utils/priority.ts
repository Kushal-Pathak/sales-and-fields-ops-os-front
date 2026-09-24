import type { Priority, StatusColor } from '@/types/domain';

export const PRIORITIES: Priority[] = ['high', 'medium', 'low'];

export const PRIORITY_LABEL: Record<Priority, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

export const PRIORITY_COLOR: Record<Priority, StatusColor> = {
  high: 'destructive',
  medium: 'warning',
  low: 'neutral',
};

/** Higher is more urgent; used for sorting. */
export const PRIORITY_RANK: Record<Priority, number> = { high: 2, medium: 1, low: 0 };
