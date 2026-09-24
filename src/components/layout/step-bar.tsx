import type { ReactNode } from 'react';
import { CheckIcon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface StepBarProps {
  steps: readonly string[];
  /** Zero-based index of the active step. */
  current: number;
}

/** The 40px wizard step strip: done ✓, active brand circle, upcoming muted number. */
export function StepBar({ steps, current }: StepBarProps) {
  return (
    <ol
      aria-label="Steps"
      className="no-scrollbar flex h-10 flex-none items-center gap-1 overflow-x-auto border-b px-4"
    >
      {steps.map((label, index) => {
        const state = index < current ? 'done' : index === current ? 'active' : 'upcoming';
        return (
          <li
            key={label}
            aria-current={state === 'active' ? 'step' : undefined}
            className="flex shrink-0 items-center gap-1"
          >
            <span
              className={cn(
                'flex size-[17px] items-center justify-center rounded-full text-2xs font-bold',
                state === 'done' && 'bg-primary text-primary-foreground',
                state === 'active' && 'bg-brand text-brand-foreground',
                state === 'upcoming' && 'bg-muted text-foreground-faint',
              )}
            >
              {state === 'done' ? <CheckIcon className="size-2.5" /> : index + 1}
            </span>
            <span
              className={cn(
                'text-xs whitespace-nowrap',
                state === 'active' && 'font-semibold',
                state === 'done' && 'text-muted-foreground',
                state === 'upcoming' && 'text-foreground-faint',
              )}
            >
              {label}
            </span>
            {index < steps.length - 1 && (
              <ChevronRightIcon className="mx-1 size-3 text-border-strong" aria-hidden />
            )}
          </li>
        );
      })}
    </ol>
  );
}

interface WizardFrameProps {
  steps: readonly string[];
  current: number;
  /** Width of the centred content for this step, e.g. `max-w-[480px]`. */
  contentClassName?: string | undefined;
  children: ReactNode;
  /** Hide the bottom bar (result screens carry their own actions). */
  showNav?: boolean;
  backDisabled?: boolean;
  continueDisabled?: boolean;
  continueLabel?: string;
  onBack: () => void;
  onContinue: () => void;
}

/**
 * Full-height wizard chrome from the design system: step bar, a scrolling centred
 * content band, and the Back · "Step n of N" · Continue bottom bar.
 */
export function WizardFrame({
  steps,
  current,
  contentClassName,
  children,
  showNav = true,
  backDisabled = false,
  continueDisabled = false,
  continueLabel = 'Continue',
  onBack,
  onContinue,
}: WizardFrameProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <StepBar steps={steps} current={current} />
      <div className="flex min-h-0 flex-1 justify-center overflow-y-auto px-6 pt-8 pb-6">
        <div className={cn('w-full max-w-[560px]', contentClassName)}>{children}</div>
      </div>
      {showNav && (
        <div className="flex h-11 flex-none items-center gap-2 border-t px-4">
          <Button variant="outline" size="sm" onClick={onBack} disabled={backDisabled}>
            <ChevronLeftIcon /> Back
          </Button>
          <span className="mx-auto text-xs text-foreground-faint">
            Step {current + 1} of {steps.length}
          </span>
          <Button size="sm" onClick={onContinue} disabled={continueDisabled}>
            {continueLabel} <ChevronRightIcon />
          </Button>
        </div>
      )}
    </div>
  );
}
