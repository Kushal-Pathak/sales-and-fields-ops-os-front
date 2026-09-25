import { useState } from 'react';
import { PlusIcon } from 'lucide-react';
import { EmptyState } from '@/components/common/empty-state';
import { PageBody, PageHeader } from '@/components/layout/page-header';
import { SettingsNav } from '@/components/layout/settings-nav';
import { Button } from '@/components/ui/button';
import { PermissionNote, useCan } from '@/features/auth';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DeleteStageDialog,
  NEW_STAGE_ID,
  PipelineNameForm,
  StageDrawer,
  StageList,
} from '@/features/pipeline-settings';
import { usePipelines } from '@/features/workspace';
import { useDrawerParam } from '@/hooks/use-drawer-param';
import { Columns3Icon } from 'lucide-react';

/** `/settings/pipeline`: rename the default pipeline and manage its stages. */
export function PipelineSettingsPage() {
  const pipelines = usePipelines();
  const pipeline = pipelines.data?.find((item) => item.isDefault) ?? pipelines.data?.[0];
  const drawer = useDrawerParam('stage');
  const canManage = useCan('settings.manage');
  const [deleting, setDeleting] = useState<string | null>(null);

  return (
    <>
      <PageHeader
        title="Pipeline stages"
        actions={
          <Button
            size="sm"
            onClick={() => drawer.open(NEW_STAGE_ID)}
            disabled={!pipeline || !canManage}
          >
            <PlusIcon /> Add stage
          </Button>
        }
      >
        <SettingsNav />
        <PermissionNote permission="settings.manage" className="ml-auto" />
      </PageHeader>
      <PageBody className="flex flex-col gap-5 p-4">
        {pipelines.isPending ? (
          <>
            <Skeleton className="h-8 w-72" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </>
        ) : pipeline ? (
          <>
            <PipelineNameForm key={pipeline.id} pipeline={pipeline} />
            <StageList pipelineId={pipeline.id} onEdit={drawer.open} onDelete={setDeleting} />
            <StageDrawer
              pipelineId={pipeline.id}
              stageId={drawer.id}
              onClose={drawer.close}
              onDelete={setDeleting}
            />
            <DeleteStageDialog
              stageId={deleting}
              onOpenChange={(open) => !open && setDeleting(null)}
              onDeleted={() => {
                setDeleting(null);
                drawer.close();
              }}
            />
          </>
        ) : (
          <EmptyState
            icon={Columns3Icon}
            title="No pipeline yet"
            hint="The workspace has no pipeline. Reset the demo data or create one from the API."
          />
        )}
      </PageBody>
    </>
  );
}
