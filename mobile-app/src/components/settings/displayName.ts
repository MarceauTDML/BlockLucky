import { getInitials } from '../profile/ageStatus';

interface NamedUser {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
}

export const fullName = (user?: NamedUser | null): string =>
  [user?.firstName, user?.lastName]
    .map((part) => (part ?? '').trim())
    .filter(Boolean)
    .join(' ');

export const nameInitials = (user?: NamedUser | null): string => {
  const first = (user?.firstName ?? '').trim();
  const last = (user?.lastName ?? '').trim();
  if (first || last) return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase() || 'EB';
  return getInitials(user?.email);
};
