import { Skeleton } from '@/components/ui/skeleton';

/** Full-screen placeholder while the session or the user's access is being resolved. */
export function ShellSkeleton() {
  return (
    <div
      className="flex h-screen items-center justify-center"
      aria-busy="true"
      aria-label="Loading"
    >
      <div className="flex w-64 flex-col gap-3">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  );
}
