import { useState } from 'react';
import { PlusIcon } from 'lucide-react';
import { PageBody, PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import {
  LeadDrawer,
  LeadFormDialog,
  LeadsTable,
  LeadsToolbar,
  useLeadsList,
} from '@/features/leads';
import { useDrawerParam } from '@/hooks/use-drawer-param';
import { LeadViewSwitch } from './view-switch';

/** `/leads`: the saved views, filters and table, with the lead drawer driven by `?lead=`. */
export function LeadsPage() {
  const list = useLeadsList();
  const drawer = useDrawerParam('lead');
  const [creating, setCreating] = useState(false);

  return (
    <>
      <PageHeader
        title="Leads"
        count={list.rows && `${list.rows.length} lead${list.rows.length === 1 ? '' : 's'}`}
        actions={
          <>
            <LeadViewSwitch />
            <Button size="sm" onClick={() => setCreating(true)}>
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
        <LeadsTable
          rows={list.visible}
          isPending={list.isPending}
          error={list.error}
          isFiltered={list.isActive || list.filters.view !== 'all'}
          onOpen={drawer.open}
          onCreate={() => setCreating(true)}
          onClearFilters={() =>
            list.update({
              view: 'all',
              q: '',
              stageId: null,
              source: null,
              ownerId: null,
              priority: null,
            })
          }
          onRetry={() => void list.refetch()}
        />
      </PageBody>
      <LeadDrawer leadId={drawer.id} onClose={drawer.close} />
      <LeadFormDialog open={creating} onOpenChange={setCreating} onSaved={drawer.open} />
    </>
  );
}
