import { buildSeed } from '@/data/seed';
import type { SessionAdapter } from '@/data/session';

const seed = buildSeed();

/** A session adapter that restores the given seeded member (or nobody) without storage. */
export function stubSession(userId: string | null): SessionAdapter {
  let current = seed.users.find((row) => row.id === userId) ?? null;
  return {
    kind: 'demo',
    restore: async () => current,
    signIn: async (input) => {
      if (input.kind !== 'demo') throw new Error('demo only');
      const user = seed.users.find((row) => row.id === input.userId);
      if (!user) throw new Error('unknown user');
      current = user;
      return user;
    },
    signOut: async () => {
      current = null;
    },
  };
}
