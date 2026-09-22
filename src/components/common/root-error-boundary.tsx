import { isRouteErrorResponse, useRouteError } from 'react-router';
import { Button } from '@/components/ui/button';

function describe(error: unknown): { title: string; detail: string } {
  if (isRouteErrorResponse(error)) {
    return { title: `${error.status} ${error.statusText}`, detail: String(error.data ?? '') };
  }
  if (error instanceof Error) {
    return { title: 'Something went wrong', detail: error.message };
  }
  return { title: 'Something went wrong', detail: 'An unexpected error occurred.' };
}

/** Catches render/loader errors from any route. Wired in `src/app/router.tsx`. */
export function RootErrorBoundary() {
  const error = useRouteError();
  const { title, detail } = describe(error);

  if (import.meta.env.DEV) console.error(error);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-2xl font-semibold">{title}</h1>
      {detail && <p className="text-muted-foreground">{detail}</p>}
      <Button onClick={() => window.location.reload()}>Reload</Button>
    </main>
  );
}
