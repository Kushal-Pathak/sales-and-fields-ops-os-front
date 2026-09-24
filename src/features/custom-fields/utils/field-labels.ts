import {
  AlignLeftIcon,
  CalendarIcon,
  CheckSquareIcon,
  HashIcon,
  ListIcon,
  TypeIcon,
  type LucideIcon,
} from 'lucide-react';
import type { FieldEntity, FieldType } from '@/types/domain';

export const FIELD_ENTITIES: FieldEntity[] = ['lead', 'contact', 'appointment'];

export const ENTITY_LABEL: Record<FieldEntity, string> = {
  lead: 'Leads',
  contact: 'Contacts',
  appointment: 'Appointments',
};

export const ENTITY_HINT: Record<FieldEntity, string> = {
  lead: 'Shown on the lead drawer and asked in the lead form.',
  contact: 'Shown with the contact on the lead drawer and asked when a contact is created.',
  appointment: 'Asked when an appointment is marked completed and kept as its outcome.',
};

export const FIELD_TYPES: FieldType[] = [
  'text',
  'textarea',
  'number',
  'select',
  'date',
  'checkbox',
];

export const FIELD_TYPE_LABEL: Record<FieldType, string> = {
  text: 'Text',
  textarea: 'Long text',
  number: 'Number',
  select: 'Dropdown',
  date: 'Date',
  checkbox: 'Checkbox',
};

export const FIELD_TYPE_ICON: Record<FieldType, LucideIcon> = {
  text: TypeIcon,
  textarea: AlignLeftIcon,
  number: HashIcon,
  select: ListIcon,
  date: CalendarIcon,
  checkbox: CheckSquareIcon,
};
