import { beforeEach, describe, expect, it } from 'vitest';
import { db, resetDemoData } from './index';
import { deleteLead } from './lead-commands';
import { deactivateMember } from './member-commands';
import { setModuleEnabled } from './module-settings';
import { runWriteOperation } from './write-operation';

beforeEach(() => resetDemoData());

describe('demo commands', () => {
  it('keeps lead deletion cleanup even when its related modules are closed', async () => {
    const quotes = await db.quotes.list();
    const lead = await db.leads.get(quotes[0]!.leadId);
    const tasks = await db.tasks.list();
    await Promise.all([
      setModuleEnabled({ id: 'tasks', enabled: false }),
      setModuleEnabled({ id: 'quotes', enabled: false }),
      setModuleEnabled({ id: 'appointments', enabled: false }),
    ]);
    await runWriteOperation(new AbortController().signal, (database) =>
      deleteLead(database, lead.id),
    );
    expect((await db.leads.list()).some((row) => row.id === lead.id)).toBe(false);
    expect(await db.tasks.list()).toEqual(tasks.filter((task) => task.leadId !== lead.id));
    expect(await db.quotes.list()).toEqual(quotes.filter((quote) => quote.leadId !== lead.id));
    expect((await db.appointments.list()).some((row) => row.leadId === lead.id)).toBe(false);
    expect(
      (await db.activities.list()).some(
        (row) => row.entityType === 'lead' && row.entityId === lead.id,
      ),
    ).toBe(false);
    expect(await db.contacts.get(lead.contactId)).toBeDefined();
  });

  it('reassigns hidden tasks and open leads before deactivating a member', async () => {
    const tasks = (await db.tasks.list()).filter(
      (task) => task.assigneeId === 'usr-3' && task.status !== 'completed',
    );
    const openStages = new Set(
      (await db.stages.list()).filter((stage) => stage.kind === 'open').map((stage) => stage.id),
    );
    const leads = (await db.leads.list()).filter(
      (lead) => lead.ownerId === 'usr-3' && openStages.has(lead.stageId),
    );
    expect(tasks.length).toBeGreaterThan(0);
    expect(leads.length).toBeGreaterThan(0);
    await setModuleEnabled({ id: 'tasks', enabled: false });
    await runWriteOperation(new AbortController().signal, (database) =>
      deactivateMember(database, { id: 'usr-3', reassignToId: 'usr-1' }, 'usr-1'),
    );
    expect((await db.users.get('usr-3')).active).toBe(false);
    for (const task of tasks) expect((await db.tasks.get(task.id)).assigneeId).toBe('usr-1');
    for (const lead of leads) {
      expect((await db.leads.get(lead.id)).ownerId).toBe('usr-1');
      expect(
        (await db.activities.list()).some(
          (row) => row.entityId === lead.id && row.kind === 'reassigned',
        ),
      ).toBe(true);
    }
  });

  it('requires a replacement for hidden open work and keeps the member active', async () => {
    await setModuleEnabled({ id: 'tasks', enabled: false });
    await expect(
      deactivateMember(db, { id: 'usr-3', reassignToId: null }, 'usr-1'),
    ).rejects.toThrow('Choose who takes over first.');
    expect((await db.users.get('usr-3')).active).toBe(true);
  });

  it('refuses to reassign work to the member being deactivated or an inactive member', async () => {
    for (const reassignToId of ['usr-3', 'usr-6']) {
      await expect(deactivateMember(db, { id: 'usr-3', reassignToId }, 'usr-1')).rejects.toThrow(
        'Choose a different active member.',
      );
      expect((await db.users.get('usr-3')).active).toBe(true);
    }
  });

  it('keeps workspace-controlled modules from being toggled', async () => {
    const before = await db.workspace.list();
    await expect(setModuleEnabled({ id: 'leads', enabled: false })).rejects.toThrow(
      'This module cannot be switched.',
    );
    expect(await db.workspace.list()).toEqual(before);
  });
});
