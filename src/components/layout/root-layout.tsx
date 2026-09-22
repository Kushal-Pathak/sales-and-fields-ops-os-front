import { Link, Outlet } from 'react-router';
import { ThemeToggle } from '@/components/common/theme-toggle';
import { env } from '@/lib/env';

/** App shell shared by every page. Replace or extend as the product needs. */
export function RootLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4">
          <Link to="/" className="font-semibold">
            {env.appName}
          </Link>
          <ThemeToggle />
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
