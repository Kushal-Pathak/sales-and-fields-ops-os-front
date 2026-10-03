import { ApiError } from '@/lib/api';

/** Thrown by `Collection.get` / `update` / `remove` when the id does not exist. */
export class NotFoundError extends Error {
  readonly collection: string;
  readonly id: string;

  constructor(collection: string, id: string) {
    super(`${collection} "${id}" was not found`);
    this.name = 'NotFoundError';
    this.collection = collection;
    this.id = id;
  }
}

export class SessionChangedError extends Error {
  constructor() {
    super('The session changed. This operation was stopped.');
    this.name = 'SessionChangedError';
  }
}

export class AccessRevokedError extends Error {
  constructor() {
    super('Access to this module changed. This operation was stopped.');
    this.name = 'AccessRevokedError';
  }
}

/** The write committed at least once before a later step failed. Never retry automatically. */
export class PartialWriteError extends Error {
  constructor(cause: unknown) {
    super(
      'Some changes were saved, but the operation did not finish. Review the refreshed record before trying again.',
      { cause },
    );
    this.name = 'PartialWriteError';
  }
}

export function isAccessError(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 401 || error.status === 403);
}

export function isAbortError(error: unknown): boolean {
  return (
    typeof error === 'object' && error !== null && 'name' in error && error.name === 'AbortError'
  );
}

export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  if (
    error instanceof NotFoundError ||
    error instanceof SessionChangedError ||
    error instanceof AccessRevokedError
  )
    return false;
  if (isAbortError(error)) return false;
  if (
    error instanceof ApiError &&
    error.status < 500 &&
    error.status !== 408 &&
    error.status !== 429
  )
    return false;
  return failureCount < 1;
}
