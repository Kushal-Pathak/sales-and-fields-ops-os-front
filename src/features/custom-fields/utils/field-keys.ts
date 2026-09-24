/** `Decision timeline (approx.)` → `decisionTimelineApprox`: a stable camelCase key. */
export function slugKey(label: string): string {
  const words = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);
  if (words.length === 0) return '';
  return words
    .map((word, index) => (index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)))
    .join('');
}

/** Appends a number until the key is not among `taken`. */
export function uniqueKey(base: string, taken: Iterable<string>): string {
  const used = new Set(taken);
  if (!used.has(base)) return base;
  let n = 2;
  while (used.has(`${base}${n}`)) n += 1;
  return `${base}${n}`;
}

export function isValidKey(key: string): boolean {
  return /^[a-z][a-zA-Z0-9]*$/.test(key);
}
