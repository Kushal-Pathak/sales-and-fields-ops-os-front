import { useState } from 'react';
import {
  ArrowRightIcon,
  MailIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PhoneIcon,
  SearchXIcon,
  TrashIcon,
} from 'lucide-react';
import { EmptyState, ErrorState } from '@/components/common/empty-state';
import { InitialsAvatar } from '@/components/common/initials-avatar';
import { StatusBadge } from '@/components/common/status-badge';
import {
  DrawerBody,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerPanel,
  DrawerTitle,
} from '@/components/layout/drawer-panel';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { STATUS_COLOR_CLASSES } from '@/components/common/status-color';
import { cn } from '@/lib/utils';
import { useLead } from '../hooks/use-lead';
import { useUpdateLead } from '../hooks/use-lead-mutations';
import { nextOpenStage, type LeadRow } from '../utils/lead-view-model';
import { PRIORITY_COLOR, PRIORITY_LABEL } from '../utils/priority';
import { DeleteLeadDialog } from './delete-lead-dialog';
import { LeadActivityTab } from './lead-activity-tab';
import { LeadFormDialog } from './lead-form-dialog';
import { LeadOverviewTab } from './lead-overview-tab';
import { LeadAppointmentsTab, LeadQuotesTab, LeadTasksTab } from './lead-related-tab';

interface LeadDrawerProps {
  /** The lead in the URL, or `null` when closed. */
  leadId: string | null;
  onClose: () => void;
}

const TABS = [
  { value: 'overview', label: 'Overview' },
  { value: 'activity', label: 'Activity' },
  { value: 'tasks', label: 'Tasks' },
  { value: 'quotes', label: 'Quotes' },
  { value: 'appointments', label: 'Appointments' },
] as const;

/** The 464px lead detail panel. Opened by `?lead=<id>`; everything inside reads that id. */
export function LeadDrawer({ leadId, onClose }: LeadDrawerProps) {
  return (
    <DrawerPanel open={leadId !== null} onOpenChange={(open) => !open && onClose()}>
      {leadId !== null && <LeadDrawerContent key={leadId} leadId={leadId} onClose={onClose} />}
    </DrawerPanel>
  );
}

function LeadDrawerContent({ leadId, onClose }: { leadId: string; onClose: () => void }) {
  const { row, stages, isPending, notFound, error, refetch } = useLead(leadId);

  if (notFound) {
    return (
      <>
        <DrawerHeader>
          <DrawerTitle>Lead not found</DrawerTitle>
          <DrawerDescription>The link may be stale.</DrawerDescription>
        </DrawerHeader>
        <EmptyState
          icon={SearchXIcon}
          title="This lead no longer exists"
          hint="It may have been deleted, or the link may be from another workspace."
          action={
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
          }
        />
      </>
    );
  }

  if (error) {
    return (
      <>
        <DrawerHeader>
          <DrawerTitle>Lead</DrawerTitle>
          <DrawerDescription>Something went wrong.</DrawerDescription>
        </DrawerHeader>
        <ErrorState error={error} onRetry={() => void refetch()} />
      </>
    );
  }

  if (isPending || !row) return <DrawerSkeleton />;

  return <LeadDetails row={row} stages={stages} onClose={onClose} />;
}

interface LeadDetailsProps {
  row: LeadRow;
  stages: LeadRow['stage'] extends infer S ? NonNullable<S>[] : never;
  onClose: () => void;
}

function LeadDetails({ row, stages, onClose }: LeadDetailsProps) {
  const { lead, contact, stage } = row;
  const updateLead = useUpdateLead();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const pipelineStages = stages.filter((item) => item.pipelineId === lead.pipelineId);
  const openStages = pipelineStages.filter((item) => item.kind === 'open');
  const closedStages = pipelineStages.filter((item) => item.kind !== 'open');
  const next = nextOpenStage(stage, stages);

  const moveTo = (stageId: string | null) => {
    if (stageId && stageId !== lead.stageId) updateLead.mutate({ id: lead.id, patch: { stageId } });
  };

  return (
    <Tabs defaultValue="overview" className="flex h-full min-h-0 flex-col gap-0">
      <DrawerHeader className="gap-3">
        <div className="flex items-start gap-3">
          <InitialsAvatar size="lg" name={contact?.name ?? '?'} className="mt-0.5" />
          <div className="min-w-0 flex-1">
            <DrawerTitle className="truncate">{contact?.name ?? 'Unknown contact'}</DrawerTitle>
            <DrawerDescription className="truncate">
              {lead.title}
              {contact?.company && ` · ${contact.company}`}
            </DrawerDescription>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <Select value={lead.stageId} onValueChange={moveTo}>
                <SelectTrigger
                  size="sm"
                  aria-label="Change stage"
                  className={cn(
                    'h-5 gap-1 rounded-md border-transparent px-2 text-xs font-semibold',
                    stage && `${STATUS_COLOR_CLASSES[stage.color].avatar}`,
                  )}
                >
                  <span aria-hidden className="size-1.5 rounded-full bg-current" />
                  {stage?.name ?? 'No stage'}
                </SelectTrigger>
                <SelectContent align="start">
                  {openStages.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                  {closedStages.length > 0 && <SelectSeparator />}
                  {closedStages.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <StatusBadge color={PRIORITY_COLOR[lead.priority]}>
                {PRIORITY_LABEL[lead.priority]} priority
              </StatusBadge>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            disabled={!contact?.phone}
            nativeButton={!contact?.phone}
            render={contact?.phone ? <a href={`tel:${contact.phone}`} /> : undefined}
          >
            <PhoneIcon /> Call
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!contact?.email}
            nativeButton={!contact?.email}
            render={contact?.email ? <a href={`mailto:${contact.email}`} /> : undefined}
          >
            <MailIcon /> Email
          </Button>
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <PencilIcon /> Edit
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="outline" size="icon-sm" aria-label="More actions" />}
            >
              <MoreHorizontalIcon />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem variant="destructive" onClick={() => setDeleting(true)}>
                <TrashIcon /> Delete lead
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <TabsList
          variant="line"
          className="no-scrollbar -mb-4 h-auto w-full justify-start gap-0 overflow-x-auto p-0"
        >
          {TABS.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="h-8 flex-none px-3 after:bottom-0 data-active:text-foreground"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </DrawerHeader>

      <DrawerBody className="flex flex-col">
        <TabsContent value="overview">
          <LeadOverviewTab row={row} />
        </TabsContent>
        <TabsContent value="activity">
          <LeadActivityTab leadId={lead.id} />
        </TabsContent>
        <TabsContent value="tasks">
          <LeadTasksTab leadId={lead.id} />
        </TabsContent>
        <TabsContent value="quotes">
          <LeadQuotesTab leadId={lead.id} />
        </TabsContent>
        <TabsContent value="appointments">
          <LeadAppointmentsTab leadId={lead.id} />
        </TabsContent>
      </DrawerBody>

      <DrawerFooter className="justify-end">
        <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
          Edit
        </Button>
        <Button
          size="sm"
          disabled={!next || updateLead.isPending}
          onClick={() => next && moveTo(next.id)}
        >
          {next ? `Move to ${next.name}` : 'Closed'} <ArrowRightIcon />
        </Button>
      </DrawerFooter>

      <LeadFormDialog open={editing} onOpenChange={setEditing} lead={lead} />
      <DeleteLeadDialog open={deleting} onOpenChange={setDeleting} row={row} onDeleted={onClose} />
    </Tabs>
  );
}

function DrawerSkeleton() {
  return (
    <>
      <DrawerHeader className="gap-3">
        <div className="flex items-start gap-3">
          <Skeleton className="size-10 rounded-full" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3.5 w-56" />
            <Skeleton className="h-5 w-32" />
          </div>
        </div>
        <div className="flex gap-1.5">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-7 w-16" />
          ))}
        </div>
      </DrawerHeader>
      <DrawerBody className="grid grid-cols-2 gap-x-4 gap-y-3">
        {Array.from({ length: 8 }, (_, index) => (
          <div key={index} className="flex flex-col gap-1.5">
            <Skeleton className="h-2.5 w-14" />
            <Skeleton className="h-4 w-28" />
          </div>
        ))}
      </DrawerBody>
    </>
  );
}
