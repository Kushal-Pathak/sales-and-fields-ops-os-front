import { isAccessError } from './errors';

/** Access failures must block cached content even if another dependency also failed transiently. */
export function getQueryError(queries: readonly { error: unknown }[]): unknown {
  return (
    queries.find((query) => isAccessError(query.error))?.error ??
    queries.find((query) => query.error)?.error ??
    null
  );
}
