import type { Contact } from '@/types/domain';
import type { Clock } from './helpers';

const CONTACTS: [name: string, company: string, city: string][] = [
  ['Aisha Rahman', 'Harbor Dental Group', 'Boston, MA'],
  ['Tom Whitfield', 'Bright Path Tutoring', 'Denver, CO'],
  ['Sofia Moreno', 'Moreno & Daughters Bakery', 'Austin, TX'],
  ['Ethan Cole', 'Cole Logistics', 'Portland, OR'],
  ['Hannah Park', 'Parkside Physiotherapy', 'Seattle, WA'],
  ['Marcus Reed', 'Reed Financial Advisors', 'Chicago, IL'],
  ['Yuki Tanaka', 'Tanaka Architecture Studio', 'San Diego, CA'],
  ['Olivia Grant', 'Grant Veterinary Clinic', 'Nashville, TN'],
  ['Noah Bennett', 'Bennett Home Builders', 'Raleigh, NC'],
  ['Fatima Zahra', 'Zahra Boutique Hotels', 'Miami, FL'],
  ['Lucas Meyer', 'Meyer Craft Brewing', 'Milwaukee, WI'],
  ['Grace Okoye', 'Okoye Legal Partners', 'Atlanta, GA'],
  ['Ravi Patel', 'Patel Pharmacy', 'Edison, NJ'],
  ['Emma Larsson', 'Larsson Interior Design', 'Minneapolis, MN'],
  ['Daniel Kim', 'Kim Family Dental', 'Los Angeles, CA'],
  ['Chloe Dubois', 'Dubois Event Catering', 'New Orleans, LA'],
  ['Omar Haddad', 'Haddad Auto Group', 'Detroit, MI'],
  ['Isabella Rossi', 'Rossi Fitness Studios', 'Phoenix, AZ'],
  ['Liam Murphy', 'Murphy Roofing Co.', 'Pittsburgh, PA'],
  ['Zara Ahmed', 'Ahmed Learning Center', 'Houston, TX'],
  ['Ben Carter', 'Carter Landscaping', 'Sacramento, CA'],
  ['Nina Volkov', 'Volkov Photography', 'Brooklyn, NY'],
];

export function buildContacts(clock: Clock): Contact[] {
  return CONTACTS.map(([name, company, city], index) => {
    const slug = name.toLowerCase().replace(' ', '.');
    const domain = company
      .toLowerCase()
      .replace(/[^a-z ]/g, '')
      .split(' ')[0];
    return {
      id: `con-${index + 1}`,
      name,
      company,
      phone: `+1 555 02${String(index + 10).padStart(2, '0')}`,
      email: `${slug}@${domain}.example`,
      address: `${120 + index * 7} Main Street, ${city}`,
      ...clock.stamp(90 - index * 3, 2),
    };
  });
}
