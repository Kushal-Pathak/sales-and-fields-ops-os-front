import { ClockIcon } from 'lucide-react';
import { PageBody, PageHeader } from '@/components/layout/page-header';
import { useRouteHandle } from '@/hooks/use-route-handle';

/** Placeholder for routes whose feature has not been built yet. Title comes from the route `handle`. */
export function ComingSoonPage() {
  const title = useRouteHandle()?.title ?? 'Coming soon';

  return (
    <>
      <PageHeader title={title} />
      <PageBody className="flex items-center justify-center p-6">
        <div className="flex max-w-xs flex-col items-center text-center">
          <span className="flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <ClockIcon className="size-4" />
          </span>
          <h2 className="mt-3 text-base font-semibold">{title} is on the roadmap</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            This section will be built in an upcoming step.
          </p>
        </div>
      </PageBody>
    </>
  );
}
