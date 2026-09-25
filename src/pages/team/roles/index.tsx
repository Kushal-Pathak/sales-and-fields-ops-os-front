import { PlusIcon } from 'lucide-react';
import { PageBody, PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { PermissionNote, useCan } from '@/features/auth';
import { NEW_ROLE_ID, RoleDrawer, RolesTable } from '@/features/team';
import { useDrawerParam } from '@/hooks/use-drawer-param';
import { TeamNav } from '../team-nav';

/** `/team/roles`: what each role may do; edit or add roles in the drawer via `?role=`. */
export function RolesPage() {
  const drawer = useDrawerParam('role');
  const canManage = useCan('team.manage');
  return (
    <>
      <PageHeader
        title="Roles"
        actions={
          <Button size="sm" disabled={!canManage} onClick={() => drawer.open(NEW_ROLE_ID)}>
            <PlusIcon /> Add role
          </Button>
        }
      >
        <TeamNav />
        <PermissionNote permission="team.manage" className="ml-auto" />
      </PageHeader>
      <PageBody className="p-4">
        <RolesTable onOpen={drawer.open} onCreate={() => drawer.open(NEW_ROLE_ID)} />
      </PageBody>
      <RoleDrawer roleId={drawer.id} onClose={drawer.close} />
    </>
  );
}
