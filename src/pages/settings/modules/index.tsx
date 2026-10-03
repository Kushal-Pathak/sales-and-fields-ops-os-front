import { PageBody, PageHeader } from '@/components/layout/page-header';
import { SettingsNav } from '@/components/layout/settings-nav';
import { PermissionNote } from '@/features/auth';
import { ModuleList } from '@/features/module-settings';

/** `/settings/modules`: which modules the workspace uses. */
export function ModulesSettingsPage() {
  return (
    <>
      <PageHeader title="Modules">
        <SettingsNav />
        <PermissionNote permission="modules.manage" className="ml-auto" />
      </PageHeader>
      <PageBody className="p-4">
        <ModuleList />
      </PageBody>
    </>
  );
}
