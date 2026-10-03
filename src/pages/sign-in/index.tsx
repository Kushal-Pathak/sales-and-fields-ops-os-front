import { useEffect } from 'react';
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router';
import { ThemeToggle } from '@/components/common/theme-toggle';
import { Card } from '@/components/ui/card';
import { SignInForm } from '@/features/auth';
import { useAuth } from '@/hooks/use-auth';
import { env } from '@/lib/env';

/** `/sign-in`: outside the shell. Lands back where the guard sent the user from. */
export function SignInPage() {
  const { status } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const switching = searchParams.get('switch') === '1';
  const from = (location.state as { from?: string } | null)?.from;
  // `/` forwards to the first page the member can open.
  const destination = from && from !== '/sign-in' ? from : '/';

  useEffect(() => {
    document.title = `Sign in · ${env.appName}`;
  }, []);

  if (status === 'signed_in' && !switching) return <Navigate to={destination} replace />;

  return (
    <div className="flex min-h-screen flex-col bg-muted">
      <div className="flex justify-end p-3">
        <ThemeToggle />
      </div>
      <main className="flex flex-1 items-start justify-center px-4 pb-12">
        <Card className="w-full max-w-sm gap-5 p-6 shadow-card">
          <div className="flex flex-col items-start gap-3">
            <span className="flex size-9 items-center justify-center rounded-lg bg-brand text-base font-bold text-brand-foreground">
              {env.appName.charAt(0)}
            </span>
            <div>
              <h1 className="text-xl font-bold">
                {switching ? 'Switch user' : `Sign in to ${env.appName}`}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {switching
                  ? 'Pick another member to continue as.'
                  : 'Manage leads, quotes, appointments and conversations in one place.'}
              </p>
            </div>
          </div>
          <SignInForm
            onSignedIn={() => navigate(switching ? '/' : destination, { replace: true })}
          />
        </Card>
      </main>
    </div>
  );
}
