import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/api';
import { getQueryError } from './query-state';
import { NotFoundError, shouldRetryQuery } from './errors';

describe('query failure policy', () => {
  it('prioritizes access failures over transient errors from other dependencies', () => {
    const access = new ApiError(403, {});
    expect(getQueryError([{ error: new Error('offline') }, { error: access }])).toBe(access);
  });

  it('retries transient reads once, without retrying permission, validation or missing-record failures', () => {
    expect(shouldRetryQuery(0, new ApiError(503, {}))).toBe(true);
    expect(shouldRetryQuery(1, new ApiError(503, {}))).toBe(false);
    expect(shouldRetryQuery(0, new ApiError(403, {}))).toBe(false);
    expect(shouldRetryQuery(0, new ApiError(422, {}))).toBe(false);
    expect(shouldRetryQuery(0, new NotFoundError('tasks', 'missing'))).toBe(false);
    expect(shouldRetryQuery(0, new DOMException('aborted', 'AbortError'))).toBe(false);
  });
});
