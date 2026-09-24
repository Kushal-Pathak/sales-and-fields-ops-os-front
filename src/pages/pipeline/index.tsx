import { useState } from 'react';
import { PlusIcon, Settings2Icon } from 'lucide-react';
import { Link } from 'react-router';
import { PageBody, PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import {
  LeadDrawer,
  LeadFormDialog,
  LeadsToolbar,
  PipelineBoard,
  useLeadsList,
} from '@/features/leads';
import { useDrawerParam } from '@/hooks/use-drawer-param';
import { LeadViewSwitch } from '../leads/view-switch';

/** `/leads/pipeline`: the same leads as the table, as a kanban by stage. */
export function PipelinePage() {
  const list = useLeadsList();
  const drawer = useDrawerParam('lead');
  const [creating, setCreating] = useState<{ stageId?: string } | null>(null);

  return (
    <>
      <PageHeader
        title="Pipeline"
        count={list.rows && `${list.rows.length} lead${list.rows.length === 1 ? '' : 's'}`}
        actions={
          <>
            <LeadViewSwitch />
            <Button variant="outline" size="sm" render={<Link to="/settings/pipeline" />}>
              <Settings2Icon /> Stages
            </Button>
            <Button size="sm" onClick={() => setCreating({})}>
              <PlusIcon /> Add lead
            </Button>
          </>
        }
      >
        <LeadsToolbar
          filters={list.filters}
          counts={list.counts}
          isActive={list.isActive}
          onChange={list.update}
          onClear={list.clear}
        />
      </PageHeader>
      <PageBody className="flex flex-col">
        <PipelineBoard
          rows={list.visible}
          isPending={list.isPending}
          error={list.error}
          onOpen={drawer.open}
          onCreate={(stageId) => setCreating(stageId ? { stageId } : {})}
          onRetry={() => void list.refetch()}
        />
      </PageBody>
      <LeadDrawer leadId={drawer.id} onClose={drawer.close} />
      <LeadFormDialog
        open={creating !== null}
        onOpenChange={(open) => !open && setCreating(null)}
        defaultStageId={creating?.stageId}
        onSaved={drawer.open}
      />
    </>
  );
}
