/** Every persisted entity. Dates are ISO 8601 strings; ids are opaque strings. */
export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

/** What a caller supplies to create an entity; the store assigns id and timestamps. */
export type CreateInput<T extends BaseEntity> = Omit<T, keyof BaseEntity>;

/** A partial patch; the store bumps `updatedAt`. `undefined` clears an optional field. */
export type UpdateInput<T extends BaseEntity> = {
  [K in keyof CreateInput<T>]?: CreateInput<T>[K] | undefined;
};

/**
 * Colour names that map onto the design-system status tokens
 * (`bg-success-soft text-success`, …). Stored on data so no hex reaches the UI.
 */
export type StatusColor = 'neutral' | 'info' | 'highlight' | 'warning' | 'success' | 'destructive';

export type Priority = 'low' | 'medium' | 'high';
