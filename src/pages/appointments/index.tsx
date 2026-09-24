import { useState } from 'react';
import { PlusIcon } from 'lucide-react';
import { PageBody, PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import {
  AppointmentDrawer,
  AppointmentFormDialog,
  AppointmentsTable,
  AppointmentsToolbar,
  useAppointmentsList,
} from '@/features/appointments';
import { useDrawerParam } from '@/hooks/use-drawer-param';

/** `/appointments`: the table with URL-driven views and filters, and the appointment drawer. */
export function AppointmentsPage() {
  const list = useAppointmentsList();
  const drawer = useDrawerParam('appointment');
  const [scheduling, setScheduling] = useState(false);

  return (
    <>
      <PageHeader
        title="Appointments"
        count={list.rows && `${list.rows.length} appointment${list.rows.length === 1 ? '' : 's'}`}
        actions={
          <Button size="sm" onClick={() => setScheduling(true)}>
            <PlusIcon /> Schedule appointment
          </Button>
        }
      >
        <AppointmentsToolbar
          filters={list.filters}
          counts={list.counts}
          isActive={list.isActive}
          onChange={list.update}
          onClear={list.clear}
        />
      </PageHeader>
      <PageBody className="flex flex-col">
        <AppointmentsTable
          rows={list.visible}
          isPending={list.isPending}
          error={list.error}
          isFiltered={list.isActive || list.filters.view !== 'all'}
          onOpen={drawer.open}
          onCreate={() => setScheduling(true)}
          onClearFilters={() => list.update({ view: 'all', q: '', assigneeId: null, type: null })}
          onRetry={() => void list.refetch()}
        />
      </PageBody>
      <AppointmentDrawer appointmentId={drawer.id} onClose={drawer.close} />
      <AppointmentFormDialog open={scheduling} onOpenChange={setScheduling} onSaved={drawer.open} />
    </>
  );
}
