import { useState } from 'react';
import { PlusIcon } from 'lucide-react';
import { PageBody, PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { AppointmentDrawer, AppointmentFormDialog } from '@/features/appointments';
import {
  CalendarToolbar,
  CalendarView,
  useCalendar,
  useCalendarFilters,
  type CalendarEvent,
} from '@/features/calendar';
import { TaskDrawer } from '@/features/tasks';
import { useDrawerParam } from '@/hooks/use-drawer-param';

/**
 * `/calendar`: week or month grid of appointments and due tasks. Clicking an event
 * opens the matching drawer; clicking a slot schedules an appointment at that time.
 * Either source can be closed to the user: its events, drawer and actions then go.
 */
export function CalendarPage() {
  const { filters, update, shift, today } = useCalendarFilters();
  const calendar = useCalendar(filters);
  const { sources } = calendar;
  const appointmentDrawer = useDrawerParam('appointment');
  const taskDrawer = useDrawerParam('task');
  const [slot, setSlot] = useState<Date | null>(null);
  const [scheduling, setScheduling] = useState(false);

  const openEvent = (event: CalendarEvent) => {
    if (event.kind === 'appointment') appointmentDrawer.open(event.refId);
    else taskDrawer.open(event.refId);
  };
  const schedule = (startAt: Date | null) => {
    setSlot(startAt);
    setScheduling(true);
  };

  return (
    <>
      <PageHeader
        title="Calendar"
        actions={
          sources.appointments && (
            <Button size="sm" onClick={() => schedule(null)}>
              <PlusIcon /> Schedule appointment
            </Button>
          )
        }
      >
        <CalendarToolbar
          filters={{ ...filters, showTasks: calendar.showTasks }}
          onChange={update}
          onShift={shift}
          onToday={today}
          hideTasksToggle={!sources.tasks || !sources.appointments}
        />
      </PageHeader>
      <PageBody className="flex flex-col">
        <CalendarView
          filters={filters}
          events={calendar.events}
          isPending={calendar.isPending}
          error={calendar.error}
          onRetry={() => void calendar.refetch()}
          onOpenEvent={openEvent}
          onSlotClick={sources.appointments ? schedule : undefined}
          onShowDay={(day) => update({ view: 'week', date: day })}
        />
      </PageBody>
      {sources.appointments && (
        <>
          <AppointmentDrawer
            appointmentId={appointmentDrawer.id}
            onClose={appointmentDrawer.close}
          />
          <AppointmentFormDialog
            open={scheduling}
            onOpenChange={setScheduling}
            defaultStartAt={slot?.toISOString()}
            onSaved={appointmentDrawer.open}
          />
        </>
      )}
      {sources.tasks && <TaskDrawer taskId={taskDrawer.id} onClose={taskDrawer.close} />}
    </>
  );
}
