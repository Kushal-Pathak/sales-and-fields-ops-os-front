import { useState } from 'react';
import { UserPlusIcon } from 'lucide-react';
import { PageBody, PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { PermissionNote, useCan } from '@/features/auth';
import {
  MemberDrawer,
  MemberFormDialog,
  MembersTable,
  TeamToolbar,
  useTeam,
} from '@/features/team';
import { useDrawerParam } from '@/hooks/use-drawer-param';
import { TeamNav } from './team-nav';

/** `/team`: members with their role, status and workload; the member drawer via `?member=`. */
export function TeamPage() {
  const team = useTeam();
  const drawer = useDrawerParam('member');
  const canManage = useCan('team.manage');
  const [inviting, setInviting] = useState(false);
  const active = team.rows?.filter((row) => row.user.active).length;

  return (
    <>
      <PageHeader
        title="Team"
        count={active !== undefined ? `${active} active` : undefined}
        actions={
          <Button size="sm" disabled={!canManage} onClick={() => setInviting(true)}>
            <UserPlusIcon /> Invite member
          </Button>
        }
      >
        <div className="flex w-full flex-wrap items-center gap-3">
          <TeamNav />
          <TeamToolbar filters={team.filters} isActive={team.isActive} onChange={team.update} />
          <PermissionNote permission="team.manage" className="ml-auto" />
        </div>
      </PageHeader>
      <PageBody className="flex flex-col">
        <MembersTable
          rows={team.visible}
          isPending={team.isPending}
          error={team.error}
          onOpen={drawer.open}
          onRetry={() => void team.refetch()}
        />
      </PageBody>
      <MemberDrawer userId={drawer.id} rows={team.rows} onClose={drawer.close} />
      <MemberFormDialog open={inviting} onOpenChange={setInviting} onSaved={drawer.open} />
    </>
  );
}
