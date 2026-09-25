import { useState } from 'react';
import { PlusIcon, UploadIcon } from 'lucide-react';
import { Link } from 'react-router';
import { PageBody, PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { PermissionNote, useCan } from '@/features/auth';
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
  const canEdit = useCan('leads.edit');
  const [creating, setCreating] = useState(false);

  return (
    <>
      <PageHeader
        title="Leads"
        count={list.rows && `${list.rows.length} lead${list.rows.length === 1 ? '' : 's'}`}
        actions={
          <>
            <LeadViewSwitch />
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              disabled={!canEdit}
              render={<Link to="/leads/import" />}
            >
              <UploadIcon /> Import
            </Button>
            <Button size="sm" disabled={!canEdit} onClick={() => setCreating(true)}>
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
        <PermissionNote permission="leads.edit" className="ml-auto shrink-0" />
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
