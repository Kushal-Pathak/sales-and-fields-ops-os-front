import type { BaseEntity } from './base';
import type { CustomValues } from './field';

/** A person or organisation. One contact can have many leads over time. */
export interface Contact extends BaseEntity {
  name: string;
  phone?: string;
  email?: string;
  company?: string;
  address?: string;
  /** Values of the workspace's custom contact fields. */
  custom?: CustomValues;
}
