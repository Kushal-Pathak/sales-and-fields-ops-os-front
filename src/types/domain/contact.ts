import type { BaseEntity } from './base';

/** A person or organisation. One contact can have many leads over time. */
export interface Contact extends BaseEntity {
  name: string;
  phone?: string;
  email?: string;
  company?: string;
  address?: string;
}
