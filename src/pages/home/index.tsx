import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { env } from '@/lib/env';

/** Starter page. Replace its content when you begin a real project. */
export function HomePage() {
  return (
    <section className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold">{env.appName}</h1>
        <p className="mt-2 text-muted-foreground">
          React + Vite + TypeScript template. Edit <code>src/pages/home/index.tsx</code> to get
          started.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button>Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="destructive">Destructive</Button>
        <Button variant="link" render={<Link to="/this-route-does-not-exist" />}>
          Try a missing route
        </Button>
      </div>
    </section>
  );
}
