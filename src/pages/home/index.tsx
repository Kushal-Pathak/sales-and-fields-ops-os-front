import { env } from '@/lib/env';

/** Landing page. Feature content will be composed here as the product grows. */
export function HomePage() {
  return (
    <section className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold">{env.appName}</h1>
        <p className="mt-2 text-muted-foreground">Manage leads, contacts and deals in one place.</p>
      </div>
    </section>
  );
}
