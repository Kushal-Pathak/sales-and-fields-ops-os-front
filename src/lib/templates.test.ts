import { describe, expect, it } from 'vitest';
import { fillTemplate } from './templates';

describe('quick replies', () => {
  it('fills placeholders with the first name, company and owner', () => {
    expect(
      fillTemplate('Hi {{name}}, the quote for {{ company }} is ready. — {{owner}}', {
        name: 'Ada Lovelace',
        company: 'Analytical Engines',
        owner: 'Jordan Blake',
      }),
    ).toBe('Hi Ada, the quote for Analytical Engines is ready. — Jordan Blake');
  });

  it('drops missing values and tidies the punctuation around them', () => {
    expect(fillTemplate('Hi {{name}}, thanks for {{company}} .', {})).toBe('Hi, thanks for.');
    expect(fillTemplate('{{unknown}} works', { name: 'x' })).toBe('works');
  });
});
