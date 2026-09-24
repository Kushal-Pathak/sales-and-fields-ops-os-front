import type { BaseEntity } from './base';

/** The tenant. A single row with id `default` until multi-workspace support exists. */
export interface Workspace extends BaseEntity {
  name: string;
  /** ISO 4217 code, e.g. `USD`, `EUR`, `INR`. */
  currency: string;
  /** BCP 47 locale used for number and date formatting, e.g. `en-US`. */
  locale: string;
  /** IANA time zone, e.g. `America/New_York`. */
  timezone: string;
  /** Configurable list of where leads come from. */
  leadSources: string[];
  /** Default tax rate applied to new quotes, in percent. */
  taxRatePct: number;
  /** Default terms and conditions prefilled into new quotes. */
  quoteTerms?: string;
  /** Saved message templates for the inbox composer. */
  quickReplies?: QuickReply[];
}

/** A message template; `{{name}}`, `{{company}}` and `{{owner}}` are filled in when used. */
export interface QuickReply {
  id: string;
  title: string;
  body: string;
}
