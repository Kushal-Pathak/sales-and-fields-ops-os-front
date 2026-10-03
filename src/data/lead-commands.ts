import { isDemoData, type Db } from './index';

/** The API owns the cascade, including records the caller cannot read individually. */
export async function deleteLead(database: Db, leadId: string): Promise<void> {
  if (isDemoData) {
    const [tasks, quotes, appointments, activities] = await Promise.all([
      database.tasks.list(),
      database.quotes.list(),
      database.appointments.list(),
      database.activities.list(),
    ]);
    await Promise.all([
      ...tasks.filter((row) => row.leadId === leadId).map((row) => database.tasks.remove(row.id)),
      ...quotes.filter((row) => row.leadId === leadId).map((row) => database.quotes.remove(row.id)),
      ...appointments
        .filter((row) => row.leadId === leadId)
        .map((row) => database.appointments.remove(row.id)),
      ...activities
        .filter((row) => row.entityType === 'lead' && row.entityId === leadId)
        .map((row) => database.activities.remove(row.id)),
    ]);
  }
  await database.leads.remove(leadId);
}
