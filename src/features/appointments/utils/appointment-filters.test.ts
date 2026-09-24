import { describe, expect, it } from 'vitest';
import {
  DEFAULT_APPOINTMENT_FILTERS,
  hasActiveAppointmentFilters,
  parseAppointmentFilters,
  serializeAppointmentFilters,
} from './appointment-filters';

describe('appointment filters', () => {
  it('parses defaults from an empty query string', () => {
    expect(parseAppointmentFilters(new URLSearchParams())).toEqual(DEFAULT_APPOINTMENT_FILTERS);
  });

  it('parses every param and ignores unknown values', () => {
    const filters = parseAppointmentFilters(
      new URLSearchParams('view=today&q=%20boston%20&assignee=usr-2&type=on_site&sort=-created'),
    );
    expect(filters).toEqual({
      view: 'today',
      q: 'boston',
      assigneeId: 'usr-2',
      type: 'on_site',
      sort: { key: 'created', direction: 'desc' },
    });
    const junk = parseAppointmentFilters(new URLSearchParams('view=nope&type=walk&sort=-x'));
    expect(junk.view).toBe('upcoming');
    expect(junk.type).toBeNull();
    expect(junk.sort).toEqual(DEFAULT_APPOINTMENT_FILTERS.sort);
  });

  it('round-trips through serialize, omitting defaults and keeping other params', () => {
    const filters = parseAppointmentFilters(
      new URLSearchParams('view=completed&assignee=usr-1&type=meeting'),
    );
    const params = serializeAppointmentFilters(filters, new URLSearchParams('appointment=apt-2'));
    expect(params.get('appointment')).toBe('apt-2');
    expect(params.get('view')).toBe('completed');
    expect(parseAppointmentFilters(params)).toEqual(filters);
    const cleared = serializeAppointmentFilters(DEFAULT_APPOINTMENT_FILTERS, params);
    expect([...cleared.keys()]).toEqual(['appointment']);
  });

  it('reports active filters for search, assignee and type only', () => {
    expect(hasActiveAppointmentFilters({ ...DEFAULT_APPOINTMENT_FILTERS, view: 'all' })).toBe(
      false,
    );
    expect(hasActiveAppointmentFilters({ ...DEFAULT_APPOINTMENT_FILTERS, q: 'x' })).toBe(true);
    expect(hasActiveAppointmentFilters({ ...DEFAULT_APPOINTMENT_FILTERS, type: 'meeting' })).toBe(
      true,
    );
  });
});
