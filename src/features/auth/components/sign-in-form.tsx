import { useState, type FormEvent } from 'react';
import { ArrowRightIcon } from 'lucide-react';
import { InitialsAvatar } from '@/components/common/initials-avatar';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useRoles, useUsers } from '@/features/workspace';
import { useAuth } from '@/hooks/use-auth';
import { SignInError } from '@/data/session';

interface SignInFormProps {
  onSignedIn: () => void;
}

/** Demo: pick a member. API: email and password. Both call the session's `signIn`. */
export function SignInForm({ onSignedIn }: SignInFormProps) {
  const { adapterKind } = useAuth();
  return adapterKind === 'demo' ? (
    <DemoPicker onSignedIn={onSignedIn} />
  ) : (
    <CredentialsForm onSignedIn={onSignedIn} />
  );
}

function DemoPicker({ onSignedIn }: SignInFormProps) {
  const { signIn } = useAuth();
  const users = useUsers();
  const roles = useRoles().data ?? [];
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const choose = async (userId: string) => {
    setPending(userId);
    setError(null);
    try {
      await signIn({ kind: 'demo', userId });
      onSignedIn();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not sign in.');
      setPending(null);
    }
  };

  if (users.isPending) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  const members = (users.data ?? []).filter((user) => user.active);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        This is demo data, so there is no password. Choose who you are to see the workspace through
        their role.
      </p>
      <ul className="flex flex-col gap-1.5" aria-label="Members">
        {members.map((user) => {
          const role = roles.find((row) => row.id === user.roleId);
          return (
            <li key={user.id}>
              <button
                type="button"
                disabled={pending !== null}
                onClick={() => void choose(user.id)}
                aria-label={`Continue as ${user.name}`}
                className="flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:opacity-60"
              >
                <InitialsAvatar name={user.name} color={user.color} />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-semibold">{user.name}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {role?.name ?? 'Member'} · {user.email}
                  </span>
                </span>
                <ArrowRightIcon className="size-4 shrink-0 text-foreground-faint" />
              </button>
            </li>
          );
        })}
      </ul>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

function CredentialsForm({ onSignedIn }: SignInFormProps) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const next: { email?: string; password?: string } = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) next.email = 'Enter your work email.';
    if (!password) next.password = 'Enter your password.';
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    setPending(true);
    setError(null);
    try {
      await signIn({ kind: 'api', email: email.trim(), password });
      onSignedIn();
    } catch (cause) {
      setError(
        cause instanceof SignInError
          ? cause.message
          : 'Could not sign in. Check your connection and try again.',
      );
      setPending(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <FieldGroup className="gap-3">
        <Field data-invalid={errors.email ? true : undefined}>
          <FieldLabel htmlFor="sign-in-email">Email</FieldLabel>
          <Input
            id="sign-in-email"
            type="email"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={errors.email ? true : undefined}
          />
          <FieldError>{errors.email}</FieldError>
        </Field>
        <Field data-invalid={errors.password ? true : undefined}>
          <FieldLabel htmlFor="sign-in-password">Password</FieldLabel>
          <Input
            id="sign-in-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-invalid={errors.password ? true : undefined}
          />
          <FieldError>{errors.password}</FieldError>
        </Field>
      </FieldGroup>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        Sign in
      </Button>
    </form>
  );
}
