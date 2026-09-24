import { STATUS_COLOR_CLASSES } from '@/components/common/status-color';
import { cn } from '@/lib/utils';
import type { Channel } from '@/types/domain';
import { CHANNEL_COLOR, CHANNEL_ICON, CHANNEL_LABEL } from '../utils/inbox-labels';

/** The small channel icon: alone (list avatars) or with its label (headers). */
export function ChannelBadge({
  channel,
  withLabel = false,
  className,
}: {
  channel: Channel;
  withLabel?: boolean;
  className?: string | undefined;
}) {
  const Icon = CHANNEL_ICON[channel];
  return (
    <span
      title={CHANNEL_LABEL[channel]}
      className={cn(
        'inline-flex items-center gap-1 text-xs',
        withLabel
          ? 'text-foreground-secondary'
          : cn(
              'size-4 justify-center rounded-full ring-2 ring-background',
              STATUS_COLOR_CLASSES[CHANNEL_COLOR[channel]].avatar,
            ),
        className,
      )}
    >
      <Icon className={withLabel ? 'size-3.5' : 'size-2.5'} aria-hidden={withLabel} />
      {withLabel ? (
        CHANNEL_LABEL[channel]
      ) : (
        <span className="sr-only">{CHANNEL_LABEL[channel]}</span>
      )}
    </span>
  );
}
