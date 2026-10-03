import { useState } from 'react';
import {
  MenuIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  SearchIcon,
  SparklesIcon,
} from 'lucide-react';
import { InitialsAvatar } from '@/components/common/initials-avatar';
import { ThemeToggle } from '@/components/common/theme-toggle';
import { Button } from '@/components/ui/button';
import { Kbd } from '@/components/ui/kbd';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/hooks/use-auth';
import { useCommandPalette } from '@/hooks/use-command-palette';
import { useRouteHandle } from '@/hooks/use-route-handle';
import { env } from '@/lib/env';
import { Sidebar } from './sidebar';

interface TopBarProps {
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
}

/** 42px bar above the page: navigation toggle, breadcrumb from the route `handle`, user tools. */
export function TopBar({ sidebarCollapsed, onToggleSidebar }: TopBarProps) {
  const handle = useRouteHandle();
  const { openPalette } = useCommandPalette();
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const sidebarLabel = sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar';
  const SidebarIcon = sidebarCollapsed ? PanelLeftOpenIcon : PanelLeftCloseIcon;

  return (
    <header className="flex h-[42px] flex-none items-center gap-1.5 border-b border-border-faint px-4 text-sm">
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              className="-ml-1.5 hidden text-muted-foreground lg:inline-flex"
              aria-label={sidebarLabel}
              aria-expanded={!sidebarCollapsed}
              aria-controls="desktop-navigation"
              aria-keyshortcuts="Meta+b Control+b"
              onClick={onToggleSidebar}
            />
          }
        >
          <SidebarIcon />
        </TooltipTrigger>
        <TooltipContent side="bottom" align="start">
          {sidebarLabel}
          <Kbd>⌘B / Ctrl B</Kbd>
        </TooltipContent>
      </Tooltip>
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
            <span aria-hidden="true" className="text-foreground-faint">
              /
            </span>
          </>
        )}
        <span className="truncate font-semibold">{handle?.title ?? env.appName}</span>
      </nav>

      <div className="ml-auto flex items-center gap-1">
        <Button
          variant="ghost"
          className="hidden h-7 gap-1.5 rounded-lg bg-surface-2 px-3 text-sm text-muted-foreground hover:bg-accent sm:inline-flex"
          onClick={() => openPalette()}
        >
          <SparklesIcon className="size-3.5" /> Ask AI
          <Kbd>⌘K</Kbd>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="sm:hidden"
          aria-label="Search or ask"
          onClick={() => openPalette()}
        >
          <SearchIcon />
        </Button>
        <ThemeToggle />
        {user && <InitialsAvatar size="sm" name={user.name} color={user.color} title={user.name} />}
      </div>
    </header>
  );
}
