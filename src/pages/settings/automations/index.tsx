import { useState } from 'react';
import { PlusIcon } from 'lucide-react';
import { PageBody, PageHeader } from '@/components/layout/page-header';
import { SettingsNav } from '@/components/layout/settings-nav';
import { Button } from '@/components/ui/button';
import { PermissionNote, useCan } from '@/features/auth';
import {
  AutomationDrawer,
  AutomationsTable,
  DeleteAutomationDialog,
  NEW_AUTOMATION_ID,
  useAutomations,
} from '@/features/automations';
import { useDrawerParam } from '@/hooks/use-drawer-param';

/** `/settings/automations`: the rules table with the rule drawer via `?automation=`. */
export function AutomationsSettingsPage() {
  const automations = useAutomations();
  const drawer = useDrawerParam('automation');
  const canManage = useCan('settings.manage');
  const [deleting, setDeleting] = useState<string | null>(null);

  return (
    <>
      <PageHeader
        title="Automations"
        count={
          automations.rows &&
          `${automations.rows.filter((row) => row.automation.active).length} active`
        }
        actions={
          <Button size="sm" disabled={!canManage} onClick={() => drawer.open(NEW_AUTOMATION_ID)}>
            <PlusIcon /> New automation
          </Button>
        }
      >
        <SettingsNav />
        <PermissionNote permission="settings.manage" className="ml-auto" />
      </PageHeader>
      <PageBody className="flex flex-col gap-4 p-4">
        <p className="max-w-2xl text-sm text-muted-foreground">
          Rules run when a lead is created, moves to a stage, has a quote change status or an
          appointment completed. Each run is logged on the lead's timeline.
        </p>
        <AutomationsTable
          rows={automations.rows}
          isPending={automations.isPending}
          error={automations.error}
          onOpen={drawer.open}
          onCreate={() => drawer.open(NEW_AUTOMATION_ID)}
          onRetry={() => void automations.refetch()}
        />
        <AutomationDrawer automationId={drawer.id} onClose={drawer.close} onDelete={setDeleting} />
        <DeleteAutomationDialog
          automationId={deleting}
          onOpenChange={(open) => !open && setDeleting(null)}
          onDeleted={() => {
            setDeleting(null);
            drawer.close();
          }}
        />
      </PageBody>
    </>
  );
}
