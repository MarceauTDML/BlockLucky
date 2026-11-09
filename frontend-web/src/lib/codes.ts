const CODE_PATTERN = /^[A-Za-z0-9_-]{3,64}$/;

export interface ParsedCodes {
  valid: string[];
  invalid: string[];
  duplicates: number;
}

export const parseCodes = (raw: string): ParsedCodes => {
  const tokens = raw
    .split(/[\r\n,;]+/)
    .map((s) => s.trim().replace(/^"(.*)"$/, '$1').trim())
    .filter((s) => s.length > 0 && s.toLowerCase() !== 'code');

  const seen = new Set<string>();
  const valid: string[] = [];
  const invalid: string[] = [];
  let duplicates = 0;

  for (const token of tokens) {
    if (!CODE_PATTERN.test(token)) {
      invalid.push(token);
      continue;
    }
    const key = token.toUpperCase();
    if (seen.has(key)) {
      duplicates += 1;
      continue;
    }
    seen.add(key);
    valid.push(token);
  }

  return { valid, invalid, duplicates };
};
