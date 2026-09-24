export interface TemplateContext {
  /** The contact's full name; `{{name}}` becomes the first name. */
  name?: string | undefined;
  company?: string | undefined;
  owner?: string | undefined;
}

/**
 * Replaces `{{name}}`, `{{company}}` and `{{owner}}`. Unknown values disappear, and
 * the punctuation around them is tidied so "Hi , thanks" reads "Hi, thanks".
 */
export function fillTemplate(body: string, context: TemplateContext): string {
  const values: Record<string, string> = {
    name: context.name?.trim().split(/\s+/)[0] ?? '',
    company: context.company?.trim() ?? '',
    owner: context.owner?.trim() ?? '',
  };
  return body
    .replace(/\{\{\s*(\w+)\s*\}\}/g, (_match, key: string) => values[key] ?? '')
    .replace(/ +([,.!?])/g, '$1')
    .replace(/ {2,}/g, ' ')
    .replace(/ +$/gm, '')
    .trim();
}
