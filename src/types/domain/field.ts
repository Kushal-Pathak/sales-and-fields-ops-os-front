import type { BaseEntity } from './base';

/** Which records a custom field belongs to. */
export type FieldEntity = 'lead' | 'contact' | 'appointment';

export type FieldType = 'text' | 'textarea' | 'number' | 'select' | 'date' | 'checkbox';

export type FieldValue = string | number | boolean;

/** Custom values on a record, keyed by `FieldDefinition.key`. */
export type CustomValues = Record<string, FieldValue>;

/** A workspace-defined field. Values live on the records (`Lead.custom`, …), definitions here. */
export interface FieldDefinition extends BaseEntity {
  entity: FieldEntity;
  /** Stable identifier used as the key in `CustomValues`; unique per entity. */
  key: string;
  label: string;
  type: FieldType;
  /** Choices for `select` fields. */
  options?: string[];
  required?: boolean;
  hint?: string;
  /** Display position within the entity, ascending. */
  order: number;
}
