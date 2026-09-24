import type { QuoteStatus, StatusColor } from '@/types/domain';

export const QUOTE_STATUSES: QuoteStatus[] = [
  'draft',
  'pending_approval',
  'approved',
  'rejected',
  'sent',
  'accepted',
  'declined',
];

export const QUOTE_STATUS_LABEL: Record<QuoteStatus, string> = {
  draft: 'Draft',
  pending_approval: 'Pending approval',
  approved: 'Approved',
  rejected: 'Rejected',
  sent: 'Sent',
  accepted: 'Accepted',
  declined: 'Declined',
};

export const QUOTE_STATUS_COLOR: Record<QuoteStatus, StatusColor> = {
  draft: 'neutral',
  pending_approval: 'warning',
  approved: 'success',
  rejected: 'destructive',
  sent: 'info',
  accepted: 'success',
  declined: 'destructive',
};
