export type AgeVerificationState = 'NONE' | 'PENDING' | 'VERIFIED' | 'REJECTED';

const STATES: AgeVerificationState[] = ['NONE', 'PENDING', 'VERIFIED', 'REJECTED'];

export const readAgeStatus = (source: unknown): AgeVerificationState => {
  if (!source || typeof source !== 'object') return 'NONE';
  const value = (source as { ageVerificationStatus?: unknown }).ageVerificationStatus;
  return STATES.includes(value as AgeVerificationState) ? (value as AgeVerificationState) : 'NONE';
};

export const getInitials = (email?: string | null): string => {
  if (!email) return 'EB';
  const local = email.split('@')[0] ?? '';
  const parts = local.split(/[._\-+]+/).filter(Boolean);
  const letters = parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}` : local.slice(0, 2);
  return letters.toUpperCase() || 'EB';
};
