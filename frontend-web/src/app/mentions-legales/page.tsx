'use client';

import React from 'react';
import LegalPage from '@/components/layout/LegalPage';
import { useAppTheme } from '@/theme/ThemeProvider';

export default function MentionsLegalesPage() {
  const { t } = useAppTheme();
  return (
    <LegalPage
      eyebrow={t('Cadre réglementaire', 'Regulatory notice')}
      title={t('Conditions de participation', 'Terms of participation')}
      updated={t('Version de travail du pilote — novembre 2026', 'Pilot working version — November 2026')}
      sections={[
        {
          heading: t('Organisateur', 'Organiser'),
          body: t(
            "La Ville d'EtherBay organise ce pilote pédagogique en partenariat avec Epitech Digital School.",
            'The City of EtherBay runs this educational pilot in partnership with Epitech Digital School.'
          ),
        },
        {
          heading: t('Éligibilité', 'Eligibility'),
          body: t(
            "La participation est strictement réservée aux personnes majeures. Une confirmation de majorité est demandée avant toute création de compte.",
            'Participation is strictly limited to adults. Age confirmation is required before any account is created.'
          ),
        },
        {
          heading: t('Nature des unités', 'Nature of units'),
          body: t(
            "Les tickets, la cagnotte et les gains sont exprimés en ethers fictifs (réseau de test). Ils n'ont aucune valeur monétaire et ne peuvent être convertis en argent.",
            'Tickets, prize pool and winnings are expressed in test ethers (test network). They have no monetary value and cannot be converted into money.'
          ),
        },
        {
          heading: t('Jeu responsable', 'Responsible play'),
          body: t(
            "Chaque participant peut fixer un plafond de tickets par tirage depuis Profil → Sécurité. En cas de difficulté liée aux jeux, le service Joueurs Info Service répond au 09 74 75 13 13 (appel non surtaxé).",
            'Each participant can set a ticket cap per draw from Profile → Security. If gambling becomes a problem, French helpline Joueurs Info Service answers on 09 74 75 13 13.'
          ),
        },
        {
          heading: t('Avantages partenaires', 'Partner perks'),
          body: t(
            'Les EtherPoints sont échangeables contre des offres proposées par les commerces partenaires, dans la limite des stocks disponibles. Les conditions de chaque offre sont fixées par le commerçant.',
            'EtherPoints can be exchanged for offers from partner shops, while stocks last. Each offer’s conditions are set by the merchant.'
          ),
        },
      ]}
    />
  );
}
