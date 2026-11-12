import { LegalDocId } from '@/content/legal';

export const LEGAL_PATHS: Record<LegalDocId, string> = {
  cgu: '/cgu',
  reglement: '/reglement',
  mentions: '/mentions-legales',
  confidentialite: '/confidentialite',
  traceurs: '/traceurs',
  transparence: '/transparence',
};

export const LEGAL_SHORT_LABELS: Record<LegalDocId, { fr: string; en: string }> = {
  cgu: { fr: "Conditions d'utilisation", en: 'Terms of use' },
  reglement: { fr: 'Règlement', en: 'Rules' },
  mentions: { fr: 'Mentions légales', en: 'Legal notice' },
  confidentialite: { fr: 'Confidentialité', en: 'Privacy' },
  traceurs: { fr: 'Traceurs', en: 'Trackers' },
  transparence: { fr: 'Transparence', en: 'Transparency' },
};
