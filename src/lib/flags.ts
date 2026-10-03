/**
 * Feature flags: every flag the app reads is declared here, once, with the value it
 * takes when the backend says nothing about it. Read a flag with `useFlag(key)` from
 * `@/features/auth`; an undeclared key does not compile.
 *
 * - `release` flags hide unfinished work and are temporary: they carry a `removeBy`
 *   date, and a test fails once it passes so the flag gets deleted with its old path.
 * - `ops` flags are permanent kill switches for something that depends on a service.
 *
 * Flags decide what is shown. They are not permissions and not workspace settings:
 * who may do something is a `Permission`, what a workspace uses is a module.
 */
export type FlagDefinition = {
  /** What turning it off hides or stops, in one sentence. */
  description: string;
  /** Who to ask about it. */
  owner: string;
  /** The value used when the backend omits the flag. Keep it the safe one. */
  default: boolean;
} & (
  | { kind: 'release'; /** `YYYY-MM-DD`; delete the flag by then. */ removeBy: string }
  | { kind: 'ops' }
);

export const FLAGS = {
  'assistant.ask': {
    kind: 'ops',
    description: 'Free-form questions in the command palette go to the backend assistant.',
    owner: 'platform',
    default: true,
  },
} as const satisfies Record<string, FlagDefinition>;

export type FlagKey = keyof typeof FLAGS;

export const FLAG_KEYS = Object.keys(FLAGS) as FlagKey[];

export function isFlagKey(value: string): value is FlagKey {
  return Object.hasOwn(FLAGS, value);
}

/** Every flag at its declared default. */
export function flagDefaults(): Record<FlagKey, boolean> {
  const defaults = {} as Record<FlagKey, boolean>;
  for (const key of FLAG_KEYS) defaults[key] = FLAGS[key].default;
  return defaults;
}

/** Release flags whose `removeBy` date has passed (or is not a date), oldest first. */
export function expiredFlags(
  definitions: Record<string, FlagDefinition>,
  today: Date = new Date(),
): string[] {
  const day = today.toISOString().slice(0, 10);
  return Object.entries(definitions)
    .flatMap(([key, definition]) =>
      definition.kind === 'release' &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(definition.removeBy) || definition.removeBy < day)
        ? [{ key, removeBy: definition.removeBy }]
        : [],
    )
    .sort((a, b) => a.removeBy.localeCompare(b.removeBy))
    .map((flag) => flag.key);
}
