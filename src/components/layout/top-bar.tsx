import { useState } from 'react';
import { MenuIcon } from 'lucide-react';
import { ThemeToggle } from '@/components/common/theme-toggle';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useRouteHandle } from '@/hooks/use-route-handle';
import { env } from '@/lib/env';
import { Sidebar } from './sidebar';

/** 42px bar above the page: mobile menu, breadcrumb from the route `handle`, user tools. */
export function TopBar() {
  const handle = useRouteHandle();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="flex h-[42px] flex-none items-center gap-1.5 border-b border-border-faint px-4 text-sm">
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              className="-ml-1.5 lg:hidden"
              aria-label="Open navigation"
            />
          }
        >
          <MenuIcon />
        </SheetTrigger>
        <SheetContent
          side="left"
          className="w-[236px] p-0 sm:max-w-[236px]"
          showCloseButton={false}
        >
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <Sidebar className="h-full border-r-0" onNavigate={() => setMenuOpen(false)} />
        </SheetContent>
      </Sheet>

      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5">
        {handle?.group && (
          <>
            <span className="text-foreground-faint">{handle.group}</span>
            <span className="text-border-strong">/</span>
          </>
        )}
        <span className="truncate font-semibold">{handle?.title ?? env.appName}</span>
      </nav>

      <div className="ml-auto flex items-center gap-1">
        <ThemeToggle />
        <Avatar size="sm">
          <AvatarFallback className="bg-warning-soft text-2xs font-bold text-warning">
            Y
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
