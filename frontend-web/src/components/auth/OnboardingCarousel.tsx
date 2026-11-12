'use client';

import React, { useState } from 'react';
import Button from '@/components/ui/Button';
import Icon, { IconName } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import { useGetOnboardingQuery } from '@/store/api/authApi';
import { useAppTheme } from '@/theme/ThemeProvider';

export const OnboardingCarousel: React.FC<{ onDone?: () => void; className?: string }> = ({ onDone, className }) => {
  const { t, language } = useAppTheme();
  const { data } = useGetOnboardingQuery();
  const rawSlides = data?.data?.slides;
  const [index, setIndex] = useState(0);

  const fallback = [
    {
      step: 1,
      title: t("Loterie citoyenne d'EtherBay", 'EtherBay Community Lottery'),
      description: t(
        "Participez au tirage municipal de fin d'année. Chaque participation est vérifiable et transparente sur la blockchain.",
        'Take part in the year-end city draw. Every entry is verifiable and transparent on the blockchain.'
      ),
    },
    {
      step: 2,
      title: t('Participation en un clic', 'One-click Entry'),
      description: t(
        "Votre portefeuille BlockLucky intégré signe chaque achat. Les frais réseau sont prélevés sur la dotation de bienvenue en ethers fictifs offerte par la ville. En cas d'annulation, le remboursement est automatique.",
        'Your integrated BlockLucky wallet signs every purchase. Network fees are taken from the test-ether welcome grant offered by the city. If the draw is cancelled, a full refund is automatic.'
      ),
    },
    {
      step: 3,
      title: t('EtherPoints et économie locale', 'EtherPoints & Local Rewards'),
      description: t(
        "Cumulez des points à chaque participation et échangez-les contre des réductions chez les commerçants d'EtherBay.",
        'Earn points with every entry and redeem them for discounts at local EtherBay merchants.'
      ),
    },
    {
      step: 4,
      title: t('Tirage en direct certifié', 'Certified Live Draw'),
      description: t(
        "Rejoignez la salle d'attente 10 minutes avant l'échéance et recevez votre badge commémoratif POAP.",
        'Join the waiting room 10 minutes before the draw and collect your commemorative POAP badge.'
      ),
    },
  ];

  const visuals: { icon: IconName; tone: string; halo: string }[] = [
    { icon: 'ticket', tone: 'bg-sun text-on-sun', halo: 'bg-sun-soft' },
    { icon: 'gift', tone: 'bg-mint text-green', halo: 'bg-surface' },
    { icon: 'star', tone: 'bg-lavender text-violet', halo: 'bg-surface' },
    { icon: 'wheel', tone: 'bg-peach text-terracotta', halo: 'bg-surface' },
  ];

  const slides = language === 'FR' && Array.isArray(rawSlides) && rawSlides.length > 0 ? rawSlides : fallback;
  const current = slides[Math.min(index, slides.length - 1)];
  const isLast = index >= slides.length - 1;
  const visual = visuals[Math.min(index, slides.length - 1) % visuals.length];

  return (
    <section className={cn('flex flex-col gap-[18px]', className)} aria-roledescription="carousel" aria-label="Onboarding">
      <div aria-live="polite">
        <div className={cn('mb-7 flex h-[220px] items-center justify-center rounded-[32px]', visual.tone)}>
          <span aria-hidden className={cn('flex h-[132px] w-[132px] items-center justify-center rounded-full', visual.halo)}>
            <Icon name={visual.icon} size={72} />
          </span>
        </div>
        <span className="mb-3.5 inline-flex rounded-full bg-surface px-3 py-1 text-caption font-semibold text-fg-secondary shadow-[var(--card-shadow)]">
          {t(`Étape ${current.step} / ${slides.length}`, `Step ${current.step} / ${slides.length}`)}
        </span>
        <h2 className="mb-2.5 text-[28px] leading-[34px] font-bold tracking-[-0.6px]">{current.title}</h2>
        <p className="text-body text-fg-secondary">{current.description}</p>
      </div>

      <div className="flex justify-center gap-1.5" role="tablist" aria-label={t('Étapes', 'Steps')}>
        {slides.map((s, idx) => (
          <button
            key={s.step}
            type="button"
            role="tab"
            aria-selected={idx === index}
            aria-label={t(`Aller à l'étape ${idx + 1}`, `Go to step ${idx + 1}`)}
            onClick={() => setIndex(idx)}
            className={cn('h-2 rounded-full transition-all', idx === index ? 'w-6 bg-primary' : 'w-2 bg-line')}
          />
        ))}
      </div>

      <div className="flex gap-2.5">
        {index > 0 ? (
          <Button variant="outline" onClick={() => setIndex((i) => i - 1)} className="flex-1">
            {t('Précédent', 'Previous')}
          </Button>
        ) : null}
        <Button
          className="flex-1"
          onClick={() => (isLast ? onDone?.() : setIndex((i) => i + 1))}
          disabled={isLast && !onDone}
        >
          {isLast ? t('Accéder à la connexion', 'Proceed to Sign In') : t('Suivant', 'Next')}
          {isLast ? null : <Icon name="arrowRight" size={18} />}
        </Button>
      </div>
    </section>
  );
};

export default OnboardingCarousel;
