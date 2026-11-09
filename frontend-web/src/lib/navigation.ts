export const safeInternalPath = (next: string | null | undefined): string | null => {
  if (!next) return null;
  if (!next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return null;
  if (/^\/(connexion|invite)(\/|$|\?)/.test(next)) return null;
  return next;
};
