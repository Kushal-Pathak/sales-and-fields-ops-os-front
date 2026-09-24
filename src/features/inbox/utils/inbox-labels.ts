import {
  MailIcon,
  MessageCircleIcon,
  MessageSquareIcon,
  SmartphoneIcon,
  type LucideIcon,
} from 'lucide-react';
import type { Channel, StatusColor } from '@/types/domain';

export const CHANNELS: Channel[] = ['whatsapp', 'sms', 'email', 'chat'];

export const CHANNEL_LABEL: Record<Channel, string> = {
  whatsapp: 'WhatsApp',
  sms: 'SMS',
  email: 'Email',
  chat: 'Web chat',
};

export const CHANNEL_ICON: Record<Channel, LucideIcon> = {
  whatsapp: MessageCircleIcon,
  sms: SmartphoneIcon,
  email: MailIcon,
  chat: MessageSquareIcon,
};

export const CHANNEL_COLOR: Record<Channel, StatusColor> = {
  whatsapp: 'success',
  sms: 'info',
  email: 'highlight',
  chat: 'neutral',
};

export function isWhatsApp(channel: Channel): boolean {
  return channel === 'whatsapp';
}
