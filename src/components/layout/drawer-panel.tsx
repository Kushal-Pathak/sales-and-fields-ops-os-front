import type { ComponentProps, ReactNode } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

interface DrawerPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  className?: string;
}

/**
 * The 464px right-hand detail panel from the design system. Compose with
 * `DrawerHeader` / `DrawerBody` / `DrawerFooter`; drive `open` with `useDrawerParam`.
 */
export function DrawerPanel({ open, onOpenChange, children, className }: DrawerPanelProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className={cn('w-[464px] gap-0 p-0 shadow-drawer sm:max-w-[464px]', className)}
      >
        {children}
      </SheetContent>
    </Sheet>
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
