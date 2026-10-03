import { api } from '@/lib/api';
import type { CollectionOptions } from './collection';
import { isDemoData, type Db } from './index';

export interface DeactivateInput {
  id: string;
  /** Required when the member has open work, including work in closed modules. */
  reassignToId: string | null;
}

/** The API authorizes and performs reassignment and deactivation in one transaction. */
export async function deactivateMember(
  database: Db,
  { id, reassignToId }: DeactivateInput,
  actorId: string | null,
  options?: CollectionOptions,
): Promise<void> {
  if (!isDemoData) {
    await api.post<void>(`/users/${encodeURIComponent(id)}/deactivate`, {
      ...options,
      body: { reassignToId },
    });
    return;
  }
  const [leads, tasks, stages] = await Promise.all([
    database.leads.list(),
    database.tasks.list(),
    database.stages.list(),
  ]);
  const openStages = new Set(
    stages.filter((stage) => stage.kind === 'open').map((stage) => stage.id),
  );
  const openLeads = leads.filter((lead) => lead.ownerId === id && openStages.has(lead.stageId));
  const openTasks = tasks.filter(
    (task) =>
      task.assigneeId === id && (task.status === 'pending' || task.status === 'in_progress'),
  );
  if ((openLeads.length > 0 || openTasks.length > 0) && !reassignToId)
    throw new Error('Choose who takes over first.');
  if (reassignToId) {
    if (reassignToId === id) throw new Error('Choose a different active member.');
    const [from, to] = await Promise.all([
      database.users.get(id),
      database.users.get(reassignToId),
    ]);
    if (!to.active) throw new Error('Choose a different active member.');
    const now = new Date().toISOString();
    for (const lead of openLeads) {
      await database.leads.update(lead.id, { ownerId: to.id, lastActivityAt: now });
      await database.activities.create({
        entityType: 'lead',
        entityId: lead.id,
        kind: 'reassigned',
        message: `Reassigned from ${from.name} to ${to.name}`,
        actorId,
      });
    }
    for (const task of openTasks) await database.tasks.update(task.id, { assigneeId: to.id });
  }
  await database.users.update(id, { active: false });
}
