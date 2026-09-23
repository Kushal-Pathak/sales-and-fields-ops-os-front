/** Every persisted entity. Dates are ISO 8601 strings; ids are opaque strings. */
export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

/** What a caller supplies to create an entity; the store assigns id and timestamps. */
export type CreateInput<T extends BaseEntity> = Omit<T, keyof BaseEntity>;

/** A partial update; the store bumps `updatedAt`. */
export type UpdateInput<T extends BaseEntity> = Partial<CreateInput<T>>;

/**
 * Colour names that map onto the design-system status tokens
 * (`bg-success-soft text-success`, …). Stored on data so no hex reaches the UI.
 */
export type StatusColor = 'neutral' | 'info' | 'highlight' | 'warning' | 'success' | 'destructive';

export type Priority = 'low' | 'medium' | 'high';
