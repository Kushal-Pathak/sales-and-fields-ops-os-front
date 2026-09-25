import { beforeEach, describe, expect, it } from 'vitest';
import { buildSeed } from './seed';
import { db, resetDemoData } from './index';
import { demoSession } from './session';

const seed = buildSeed();

describe('demo session', () => {
  beforeEach(async () => {
    resetDemoData();
    await demoSession.signOut();
  });

  it('starts signed out, remembers a chosen member and signs out', async () => {
    expect(await demoSession.restore()).toBeNull();
    const user = await demoSession.signIn({ kind: 'demo', userId: 'usr-3' });
    expect(user.name).toBe(seed.users[2]!.name);
    expect((await demoSession.restore())?.id).toBe('usr-3');
    await demoSession.signOut();
    expect(await demoSession.restore()).toBeNull();
  });

  it('refuses unknown or deactivated members and clears a stale session', async () => {
    await expect(demoSession.signIn({ kind: 'demo', userId: 'usr-6' })).rejects.toThrow(
      /deactivated/,
    );
    await expect(demoSession.signIn({ kind: 'demo', userId: 'nobody' })).rejects.toThrow(
      /no longer exists/,
    );
    await expect(
      demoSession.signIn({ kind: 'api', email: 'a@b.c', password: 'x' }),
    ).rejects.toThrow();
    await demoSession.signIn({ kind: 'demo', userId: 'usr-2' });
    await db.users.update('usr-2', { active: false });
    expect(await demoSession.restore()).toBeNull();
  });
});
