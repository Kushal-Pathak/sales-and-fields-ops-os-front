import { useNow } from '@/hooks/use-now';
import { PageBody, PageHeader } from '@/components/layout/page-header';
import { Dashboard } from '@/features/dashboard';
import { useWorkspace } from '@/features/workspace';
import { formatDate } from '@/lib/format';

/** `/dashboard`: today's numbers and what needs attention across the workspace. */
export function DashboardPage() {
  const now = useNow();
  const locale = useWorkspace().data?.locale;
  return (
    <>
      <PageHeader title="Dashboard" count={formatDate(now.toISOString(), 'weekday', locale)} />
      <PageBody className="p-4">
        <Dashboard />
      </PageBody>
    </>
  );
}
