import { useId, type ComponentProps, type CSSProperties, type ReactNode } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useDrawerWidth } from '@/hooks/use-drawer-width';
import { cn } from '@/lib/utils';

interface DrawerPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  className?: string;
}

/**
 * A resizable right-hand detail panel, initially 464px. Compose with
 * `DrawerHeader` / `DrawerBody` / `DrawerFooter`; drive `open` with `useDrawerParam`.
 */
export function DrawerPanel({ open, onOpenChange, children, className }: DrawerPanelProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        render={<ResizableDrawerSurface />}
        className={cn(
          'max-w-full gap-0 p-0 shadow-drawer data-[side=right]:w-full data-[side=right]:sm:max-w-none lg:data-[side=right]:w-(--drawer-width)',
          className,
        )}
      >
        {children}
      </SheetContent>
    </Sheet>
  );
}

/** Mounted with the popup so an interrupted drag is discarded when the drawer closes. */
function ResizableDrawerSurface({
  id,
  className,
  style,
  children,
  ...props
}: ComponentProps<'div'>) {
  const resize = useDrawerWidth();
  const fallbackId = useId();
  const panelId = id ?? fallbackId;
  const hintId = useId();
  const widthStyle: CSSProperties & { '--drawer-width': string } = {
    ...style,
    '--drawer-width': `${resize.width}px`,
  };

  return (
    <div
      {...props}
      id={panelId}
      style={widthStyle}
      className={cn(className, resize.isResizing && 'cursor-col-resize select-none')}
    >
      {children}
      <span id={hintId} className="sr-only">
        Drag the left edge or use Left and Right arrow keys to resize. Hold Shift for larger steps.
        Home sets the smallest width; End sets the largest. Double-click or press Enter to reset.
      </span>
      <div
        role="separator"
        tabIndex={0}
        aria-label="Resize detail panel"
        aria-orientation="vertical"
        aria-controls={panelId}
        aria-describedby={hintId}
        aria-valuemin={resize.min}
        aria-valuemax={resize.max}
        aria-valuenow={resize.width}
        aria-valuetext={`${resize.width} pixels wide`}
        title="Drag to resize. Double-click to reset."
        className="group absolute inset-y-0 -left-1.5 z-10 hidden w-3 cursor-col-resize touch-none outline-none lg:block"
        {...resize.handleProps}
      >
        <span
          aria-hidden="true"
          className={cn(
            'absolute inset-y-0 left-1/2 w-0.5 bg-transparent transition-colors group-hover:bg-border-strong group-focus-visible:bg-ring',
            resize.isResizing && 'bg-ring',
          )}
        />
      </div>
    </div>
  );
}

export function DrawerHeader({ className, ...props }: ComponentProps<typeof SheetHeader>) {
  return (
    <SheetHeader
      className={cn('gap-2 border-b border-border-faint p-4 pr-12', className)}
      {...props}
    />
  );
}

export function DrawerTitle({ className, ...props }: ComponentProps<typeof SheetTitle>) {
  return <SheetTitle className={cn('text-lg font-bold', className)} {...props} />;
}

export function DrawerDescription({
  className,
  ...props
}: ComponentProps<typeof SheetDescription>) {
  return <SheetDescription className={cn('text-xs', className)} {...props} />;
}

export function DrawerBody({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('flex-1 content-start overflow-y-auto p-4', className)} {...props} />;
}

export function DrawerFooter({ className, ...props }: ComponentProps<typeof SheetFooter>) {
  return (
    <SheetFooter
      className={cn('mt-0 flex-row items-center gap-1.5 border-t px-3.5 py-2.5', className)}
      {...props}
    />
  );
}
