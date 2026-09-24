/** The fields an imported row can fill, with the header spellings we recognise. */

export const IMPORT_FIELD_KEYS = [
  'name',
  'phone',
  'email',
  'company',
  'address',
  'title',
  'value',
  'source',
  'priority',
  'stage',
  'owner',
  'notes',
] as const;
export type ImportFieldKey = (typeof IMPORT_FIELD_KEYS)[number];

export interface ImportField {
  key: ImportFieldKey;
  label: string;
  target: 'contact' | 'lead';
  required?: boolean;
  hint?: string;
  aliases: string[];
}

export const IMPORT_FIELDS: ImportField[] = [
  {
    key: 'name',
    label: 'Contact name',
    target: 'contact',
    required: true,
    aliases: [
      'name',
      'full name',
      'contact',
      'contact name',
      'customer',
      'customer name',
      'person',
    ],
  },
  {
    key: 'phone',
    label: 'Phone',
    target: 'contact',
    aliases: ['phone', 'phone number', 'mobile', 'mobile number', 'tel', 'telephone', 'cell'],
  },
  {
    key: 'email',
    label: 'Email',
    target: 'contact',
    aliases: ['email', 'e-mail', 'email address', 'mail'],
  },
  {
    key: 'company',
    label: 'Company',
    target: 'contact',
    aliases: ['company', 'organisation', 'organization', 'business', 'account', 'firm'],
  },
  {
    key: 'address',
    label: 'Address',
    target: 'contact',
    aliases: ['address', 'location', 'city', 'area', 'region', 'street'],
  },
  {
    key: 'title',
    label: 'Lead title',
    target: 'lead',
    hint: 'What they want. Falls back to the company or contact name.',
    aliases: [
      'title',
      'lead',
      'lead title',
      'requirement',
      'subject',
      'enquiry',
      'inquiry',
      'deal',
      'opportunity',
      'interest',
    ],
  },
  {
    key: 'value',
    label: 'Value',
    target: 'lead',
    hint: 'A number in the workspace currency.',
    aliases: ['value', 'budget', 'amount', 'deal value', 'estimated value', 'price'],
  },
  {
    key: 'source',
    label: 'Source',
    target: 'lead',
    hint: 'Must be one of the workspace sources; otherwise the default applies.',
    aliases: ['source', 'lead source', 'channel', 'origin', 'campaign'],
  },
  {
    key: 'priority',
    label: 'Priority',
    target: 'lead',
    hint: 'high, medium or low.',
    aliases: ['priority', 'urgency', 'temperature'],
  },
  {
    key: 'stage',
    label: 'Stage',
    target: 'lead',
    hint: 'Matched to a stage name; otherwise the default applies.',
    aliases: ['stage', 'status', 'pipeline stage', 'step'],
  },
  {
    key: 'owner',
    label: 'Owner',
    target: 'lead',
    hint: "Matched to a team member's name or email; otherwise the default applies.",
    aliases: ['owner', 'assigned to', 'assignee', 'sales rep', 'rep', 'agent', 'account manager'],
  },
  {
    key: 'notes',
    label: 'Notes',
    target: 'lead',
    aliases: ['notes', 'note', 'comments', 'comment', 'remarks', 'description', 'details'],
  },
];

export const IMPORT_FIELD_BY_KEY: Record<ImportFieldKey, ImportField> = Object.fromEntries(
  IMPORT_FIELDS.map((field) => [field.key, field]),
) as Record<ImportFieldKey, ImportField>;
