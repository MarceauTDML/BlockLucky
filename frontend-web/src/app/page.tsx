'use client';

import Link from 'next/link';
import React, { useEffect } from 'react';
import PublicShell from '@/components/layout/PublicShell';
import CountdownTimer from '@/components/lottery/CountdownTimer';
import NetworkPill from '@/components/lottery/NetworkPill';
import { LinkButton } from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Icon, { IconName } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Loader';
import ProgressBar from '@/components/ui/ProgressBar';
import { trackEvent } from '@/lib/analytics';
import { TARGET_PARTICIPANTS } from '@/lib/config';
import { shortenWallet } from '@/lib/formatters';
import { useGetLotteryStatusQuery } from '@/store/api/lotteryApi';
import { useAppTheme } from '@/theme/ThemeProvider';

export default function LandingPage() {
  const { t } = useAppTheme();
  const { data, isLoading, isError } = useGetLotteryStatusQuery();
  const status = data?.data;
  const winner = status?.round.winnerWallet;

  useEffect(() => {
    trackEvent('landing_view');
  }, []);

  useEffect(() => {
    if (winner) trackEvent('result_view', { source: 'landing' });
  }, [winner]);

  const steps = [
    {
      key: 'Découvrir',
      icon: 'globe' as IconName,
      title: t('Découvrir', 'Discover'),
      body: t(
        "La Ville d'EtherBay organise sa loterie de fin d'année, avec Epitech Digital School.",
        'The City of EtherBay runs its year-end lottery with Epitech Digital School.'
      ),
    },
    {
      key: 'Comprendre',
      icon: 'document' as IconName,
      title: t('Comprendre', 'Understand'),
      body: t(
        'Des règles courtes, publiques, et un montant engagé exprimé en ethers fictifs.',
        'Short public rules, with an amount expressed in test ethers.'
      ),
    },
    {
      key: 'Accéder',
      icon: 'envelope' as IconName,
      title: t('Accéder', 'Access'),
      body: t(
        'Connexion par email, sans mot de passe. Votre portefeuille est créé automatiquement.',
        'Passwordless email sign-in. Your wallet is created automatically.'
      ),
    },
    {
      key: 'Participer',
      icon: 'ticket' as IconName,
      title: t('Participer', 'Take part'),
      body: t(
        'Une seule action pour valider un ticket, signée par votre portefeuille BlockLucky intégré. Les frais réseau sont prélevés sur la dotation de bienvenue en ethers fictifs.',
        'One action to confirm a ticket, signed by your integrated BlockLucky wallet. Network fees are taken from the test-ether welcome grant.'
      ),
    },
    {
      key: 'Recevoir',
      icon: 'check' as IconName,
      title: t('Recevoir', 'Receive'),
      body: t(
        'Un reçu distingue la demande en attente du ticket confirmé sur la blockchain.',
        'A receipt separates a pending request from a ticket confirmed on-chain.'
      ),
    },
    {
      key: 'Vérifier',
      icon: 'shield' as IconName,
      title: t('Vérifier', 'Verify'),
      body: t(
        'Le résultat et sa preuve Chainlink VRF sont consultables par tous.',
        'The result and its Chainlink VRF proof are public.'
      ),
    },
  ];

  const guarantees = [
    {
      title: t('Ethers fictifs', 'Test ethers'),
      icon: 'giftTicket' as IconName,
      tone: 'bg-sun-soft text-on-sun',
      badge: 'bg-sun text-on-sun',
      body: t(
        "La cagnotte et les tickets utilisent des unités de test : aucune somme d'argent réelle n'est engagée.",
        'The prize pool and tickets use test units: no real money is involved.'
      ),
    },
    {
      title: t('Tirage certifié', 'Certified draw'),
      icon: 'shield' as IconName,
      tone: 'bg-lavender',
      badge: 'bg-surface text-violet',
      body: t(
        "Le gagnant est désigné par Chainlink VRF, un oracle qui fournit une preuve mathématique d'impartialité.",
        'The winner is picked by Chainlink VRF, an oracle providing a mathematical proof of fairness.'
      ),
    },
    {
      title: t('Remboursement automatique', 'Automatic refund'),
      icon: 'check' as IconName,
      tone: 'bg-mint',
      badge: 'bg-surface text-green',
      body: t(
        'Si le tirage est annulé, le Smart Contract restitue automatiquement toutes les participations.',
        'If the draw is cancelled, the Smart Contract automatically refunds every entry.'
      ),
    },
    {
      title: t('Jeu responsable', 'Responsible play'),
      icon: 'idCard' as IconName,
      tone: 'bg-peach',
      badge: 'bg-surface text-terracotta',
      body: t(
        'Réservé aux 18 ans et plus, avec un seul ticket par habitant et par tirage.',
        'Adults only (18+), with a single ticket per resident per draw.'
      ),
    },
  ];

  const faq = [
    {
      q: t("Est-ce que je paie avec de l'argent réel ?", 'Do I pay with real money?'),
      a: t(
        "Non. Ce pilote pédagogique utilise des ethers fictifs, sans valeur monétaire. L'objectif est de découvrir le fonctionnement d'une blockchain.",
        'No. This educational pilot uses test ethers with no monetary value. The goal is to discover how a blockchain works.'
      ),
    },
    {
      q: t('Comment vérifier que le tirage est équitable ?', 'How can I check the draw is fair?'),
      a: t(
        "Chaque ticket est relié à une transaction consultable sur l'explorateur de blocs, et le tirage publie une preuve Chainlink VRF. La charte de transparence détaille chaque étape.",
        'Each ticket is linked to a transaction visible on the block explorer, and the draw publishes a Chainlink VRF proof. The transparency charter details every step.'
      ),
    },
    {
      q: t('Quelles données sont collectées ?', 'What data is collected?'),
      a: t(
        "Votre email, une adresse de portefeuille générée et votre tranche d'âge. Vous pouvez exporter ou anonymiser vos données à tout moment depuis votre profil.",
        'Your email, a generated wallet address and your age group. You can export or anonymise your data at any time from your profile.'
      ),
    },
    {
      q: t("Je ne suis pas à l'aise avec le numérique, qui peut m'aider ?", "I'm not comfortable with digital tools, who can help?"),
      a: t(
        "Des démonstrations accompagnées sont proposées dans les points d'accueil municipaux et chez les associations partenaires pendant la campagne.",
        'Guided demos are offered at city help desks and partner associations during the campaign.'
      ),
    },
  ];

  return (
    <PublicShell>
      <section>
        <div className="mx-auto grid max-w-6xl gap-8 px-4 pt-8 pb-10 md:px-6 md:pt-14 md:pb-16 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:gap-14">
          <div>
            <p className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-sun-chip px-3 py-1 text-caption font-semibold text-on-sun dark:text-sun">
              <Icon name="location" size={14} />
              {t("Ville d'EtherBay · Loterie de fin d'année", 'City of EtherBay · Year-end lottery')}
            </p>
            <h1 className="mb-4 text-hero font-bold tracking-[-0.8px] md:text-display md:tracking-[-1.2px]">
              {t('La loterie citoyenne que chacun peut vérifier.', 'The community lottery anyone can verify.')}
            </h1>
            <p className="mb-7 max-w-xl text-subtitle text-fg-secondary">
              {t(
                "Participez au tirage municipal avec des ethers fictifs, suivez votre ticket sur la blockchain et cumulez des points à échanger chez les commerçants d'EtherBay.",
                "Join the city draw with test ethers, follow your ticket on the blockchain and earn points to spend at EtherBay's local shops."
              )}
            </p>
            <div className="flex flex-col gap-2.5 sm:flex-row">
              <LinkButton href="/connexion" fullWidth={false} className="sm:min-w-52">
                {t('Participer gratuitement', 'Take part for free')}
                <Icon name="arrowRight" size={18} />
              </LinkButton>
              <LinkButton href="/transparence" variant="outline" fullWidth={false} className="sm:min-w-44">
                {t('Lire les règles', 'Read the rules')}
              </LinkButton>
            </div>
            <p className="mt-5 flex items-start gap-2 text-caption font-medium text-fg-muted">
              <Icon name="shield" size={14} className="mt-px" />
              {t(
                'Réservé aux personnes majeures · Ethers fictifs offerts par la Mairie · Remboursement automatique en cas d annulation',
                'Adults only · Test ethers granted by City Hall · Automatic refund if cancelled'
              )}
            </p>
          </div>

          {isLoading ? (
            <Card tone="sun" padding="lg" className="flex flex-col gap-3 rounded-[28px]">
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-28 w-full" />
            </Card>
          ) : isError || !status ? (
            <Card tone="peach" padding="lg" className="flex items-start gap-4 rounded-[28px]">
              <span
                aria-hidden
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-surface text-terracotta"
              >
                <Icon name="alert" size={22} />
              </span>
              <div>
                <p className="text-subtitle font-bold">{t('Tirage municipal', 'City draw')}</p>
                <p className="mt-1 text-caption text-fg-secondary">
                  {t(
                    'Les données en direct sont momentanément indisponibles. Les règles restent consultables.',
                    'Live data is temporarily unavailable. The rules remain available.'
                  )}
                </p>
              </div>
            </Card>
          ) : (
            <Card
              tone="sun"
              padding="lg"
              className="flex flex-col gap-3 rounded-[28px] shadow-[0_16px_40px_rgba(172,141,10,0.22)]"
            >
              <div className="flex items-center justify-between gap-3">
                <NetworkPill network={status.network} />
                <span
                  aria-hidden
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-sun-soft"
                >
                  <Icon name="wheel" size={34} />
                </span>
              </div>
              <CountdownTimer
                targetTime={status.round.drawTargetTime}
                initialSeconds={status.round.remainingSeconds}
                prizePoolEth={status.round.prizePool}
                roundNumber={status.round.contractRoundId}
                simulated={Boolean(status.guarantees?.simulated)}
              />
              <ProgressBar
                percentage={status.progression.percentage}
                currentValue={status.progression.distinctParticipants ?? status.progression.ticketsSold}
                targetValue={status.progression.targetParticipants ?? TARGET_PARTICIPANTS}
                title={t('Objectif : 10 000 participants', 'Goal: 10,000 participants')}
              />
            </Card>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 md:px-6 md:py-16" aria-labelledby="parcours-title">
        <div className="mb-8 max-w-2xl">
          <p className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-sun-chip px-3 py-1 text-caption font-semibold text-on-sun dark:text-sun">{t('Comment ça marche', 'How it works')}</p>
          <h2 id="parcours-title" className="text-title font-bold tracking-[-0.5px] md:text-hero">
            {t('Six étapes, de la découverte au résultat', 'Six steps, from discovery to result')}
          </h2>
        </div>
        <ol className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {steps.map((step, idx) => (
            <li key={step.key} className="card flex flex-col gap-3 p-5">
              <div className="flex items-center justify-between gap-3">
                <span
                  aria-hidden
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-sun-chip text-on-sun dark:text-sun"
                >
                  <Icon name={step.icon} size={20} />
                </span>
                <span className="rounded-full bg-surface-elevated px-3 py-1 text-caption font-semibold text-fg-secondary tabular">
                  {t(`Étape ${idx + 1} / 6`, `Step ${idx + 1} / 6`)}
                </span>
              </div>
              <h3 className="text-subtitle font-bold tracking-[-0.2px]">{step.title}</h3>
              <p className="text-body text-fg-secondary">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-6xl px-4 md:px-6" aria-labelledby="garanties-title">
        <div className="card grid gap-8 p-6 md:p-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-sun-chip px-3 py-1 text-caption font-semibold text-on-sun dark:text-sun">{t('Ce que vous engagez', 'What you commit')}</p>
            <h2 id="garanties-title" className="mb-3 text-title font-bold tracking-[-0.5px] md:text-hero">
              {t('0,01 ETH fictif par ticket. Rien de réel.', '0.01 test ETH per ticket. Nothing real.')}
            </h2>
            <p className="mb-5 text-body text-fg-secondary">
              {t(
                'Chaque ticket coûte 0,01 ether fictif et rapporte 50 EtherPoints, échangeables contre des avantages chez les commerçants partenaires. Le gagnant remporte la cagnotte fictive et un certificat commémoratif.',
                'Each ticket costs 0.01 test ether and earns 50 EtherPoints, redeemable for perks at partner shops. The winner takes the test prize pool and a commemorative certificate.'
              )}
            </p>
            <Link
              href="/transparence"
              className="inline-flex items-center gap-1.5 text-small font-semibold text-fg underline-offset-4 hover:underline"
            >
              {t('Consulter la charte de transparence complète', 'Read the full transparency charter')}
              <Icon name="chevronRight" size={16} />
            </Link>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {guarantees.map((g) => (
              <li key={g.title} className={`flex flex-col gap-2.5 rounded-[20px] p-4 ${g.tone}`}>
                <span aria-hidden className={`flex h-10 w-10 items-center justify-center rounded-full ${g.badge}`}>
                  <Icon name={g.icon} size={18} />
                </span>
                <h3 className="text-body font-bold">{g.title}</h3>
                <p className="text-small opacity-80">{g.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 md:px-6 md:py-16" aria-labelledby="resultat-title">
        <Card
          tone="ink"
          padding="lg"
          className="flex flex-col gap-5 rounded-[28px] md:flex-row md:items-center md:justify-between md:p-8"
        >
          <div className="flex items-start gap-4">
            <span
              aria-hidden
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-sun text-on-sun"
            >
              <Icon name="trophy" size={26} />
            </span>
            <div>
              <p className="mb-2 inline-flex rounded-full bg-white/10 px-3 py-1 text-caption font-semibold text-sun">
                {t('Résultat du tirage', 'Draw result')}
              </p>
              <h2 id="resultat-title" className="text-title font-bold tracking-[-0.5px]">
                {winner
                  ? t(`Gagnant : ${shortenWallet(winner, 6)}`, `Winner: ${shortenWallet(winner, 6)}`)
                  : t('Publié ici le jour du tirage', 'Published here on draw day')}
              </h2>
              <p className="mt-1 max-w-xl text-body text-white/70">
                {winner
                  ? status?.guarantees?.simulated
                    ? t(
                        'Mode démonstration : ce résultat a été tiré par le serveur, sans certification Chainlink VRF.',
                        'Demo mode: this result was drawn by the server, without Chainlink VRF certification.'
                      )
                    : t(
                        'La preuve Chainlink VRF associée permet à chacun de vérifier le résultat.',
                        'The associated Chainlink VRF proof lets anyone verify the result.'
                      )
                  : t(
                      'Le tirage public est diffusé en direct. Le portefeuille gagnant et sa preuve seront affichés ici.',
                      'The public draw is streamed live. The winning wallet and its proof will appear here.'
                    )}
              </p>
            </div>
          </div>
          <LinkButton href="/tirage" fullWidth={false} className="shrink-0 md:min-w-48">
            {t('Salle de tirage', 'Live draw room')}
            <Icon name="arrowRight" size={18} />
          </LinkButton>
        </Card>
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-16 md:px-6" aria-labelledby="faq-title">
        <h2 id="faq-title" className="mb-5 text-title font-bold tracking-[-0.5px] md:text-hero">
          {t('Questions fréquentes', 'Frequently asked questions')}
        </h2>
        <div className="flex flex-col gap-3">
          {faq.map((item) => (
            <details key={item.q} className="card group p-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-body font-bold">
                {item.q}
                <span
                  aria-hidden
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-elevated text-fg transition-transform group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="mt-3 text-body text-fg-secondary">{item.a}</p>
            </details>
          ))}
        </div>
      </section>
    </PublicShell>
  );
}
