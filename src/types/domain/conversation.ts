import type { BaseEntity } from './base';

export type Channel = 'whatsapp' | 'sms' | 'email' | 'chat';

/** A message thread with a contact on one channel. */
export interface Conversation extends BaseEntity {
  contactId: string;
  leadId?: string;
  channel: Channel;
  lastMessageAt: string;
  unreadCount: number;
}

export interface Message extends BaseEntity {
  conversationId: string;
  direction: 'inbound' | 'outbound';
  body: string;
  sentAt: string;
}
