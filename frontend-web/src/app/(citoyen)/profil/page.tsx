'use client';

import Link from 'next/link';
import React, { useState } from 'react';
import WalletCard from '@/components/lottery/WalletCard';
import Button from '@/components/ui/Button';
import Icon, { IconName } from '@/components/ui/Icon';
import { cn } from '@/lib/cn';
import { shortenWallet } from '@/lib/formatters';
import useAgeVerification from '@/hooks/useAgeVerification';
import useAuth from '@/hooks/useAuth';
import usePoints from '@/hooks/usePoints';
import { useAppDispatch } from '@/store';
import {
  useCompleteQuestMutation,
  useGetQuestsQuery,
  useGetReferralsQuery,
  useUpdatePreferencesMutation,
} from '@/store/api/authApi';
import { updateUserPoints } from '@/store/slices/authSlice';
import { showPointsPopup } from '@/store/slices/uiSlice';
import { useAppTheme } from '@/theme/ThemeProvider';

const ROLE_LABELS: Record<string, [string, string]> = {
  USER: ['Compte citoyen', 'Citizen Account'],
  PARTNER: ['Compte partenaire', 'Partner Account'],
  ADMIN: ['Compte Mairie', 'City Hall Account'],
};

const rowClasses =
  'flex w-full items-center gap-3.5 px-4 py-3.5 text-left transition-colors hover:bg-surface-elevated';

const RowBadge: React.FC<{ icon: IconName; tone: string }> = ({ icon, tone }) => (
  <span aria-hidden className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full', tone)}>
    <Icon name={icon} size={20} />
  </span>
);

export default function ProfilePage() {
  const { mode, language, toggleTheme, setLanguage, t } = useAppTheme();
  const { user, signOut } = useAuth();
  const { status: ageStatus } = useAgeVerification();
  const { pointsBalance } = usePoints();
  const dispatch = useAppDispatch();

  const { data: referralRes } = useGetReferralsQuery();
  const { data: questsRes, isLoading: questsLoading } = useGetQuestsQuery();
  const [completeQuest, { isLoading: completing }] = useCompleteQuestMutation();
  const [updatePreferences] = useUpdatePreferencesMutation();
  const [copied, setCopied] = useState(false);

  const referralInfo = referralRes?.data;
  const quests = Array.isArray(questsRes?.data?.quests) ? questsRes.data.quests : [];
  const referralLink =
    referralInfo?.referralLink ||
    (typeof window !== 'undefined' ? `${window.location.origin}/invite/${user?.referralCode || ''}` : '');
  const roleLabel = ROLE_LABELS[user?.role || 'USER'] || ROLE_LABELS.USER;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };

  const handleCompleteQuest = async (questId: string) => {
    try {
      const res = await completeQuest({ questId }).unwrap();
      dispatch(updateUserPoints(res.data.newPointsBalance));
      dispatch(
        showPointsPopup({
          amount: res.data.pointsAwarded,
          reason: t(`Mission accomplie : ${res.data.quest.title}`, `Quest completed: ${res.data.quest.title}`),
        })
      );
    } catch {
    }
  };

  const handleTheme = () => {
    const next = mode === 'DARK' ? 'LIGHT' : 'DARK';
    toggleTheme();
    void updatePreferences({ theme: next });
  };

  const handleLanguage = () => {
    const next = language === 'FR' ? 'EN' : 'FR';
    setLanguage(next);
    void updatePreferences({ language: next });
  };

  const shareLinks = [
    { label: 'WhatsApp', href: referralInfo?.quickShareLinks.whatsapp },
    { label: 'X / Twitter', href: referralInfo?.quickShareLinks.twitter },
    { label: 'SMS', href: referralInfo?.quickShareLinks.sms },
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr] lg:items-start lg:gap-5">
      <div className="flex flex-col gap-4">
        <section className="card flex flex-col gap-3 p-5">
          <div className="flex items-center gap-3.5">
            <span aria-hidden className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-sun text-on-sun">
              <Icon name="tabProfile" size={28} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="mb-1 inline-flex rounded-full bg-sun-chip px-2.5 py-0.5 text-caption font-semibold text-on-sun dark:text-sun">
                {t(`${roleLabel[0]} (${user?.role || 'USER'})`, `${roleLabel[1]} (${user?.role || 'USER'})`)}
              </p>
              <h1 className="truncate font-mono text-title font-bold">{shortenWallet(user?.walletAddress, 6)}</h1>
              <p className="truncate text-caption text-fg-secondary">
                {user?.email || t('Portefeuille Web3', 'Web3 Wallet')} • {pointsBalance} pts
              </p>
            </div>
          </div>
          {user?.stats ? (
            <dl className="grid grid-cols-3 gap-2 text-center">
              {[
                [t('Tickets', 'Tickets'), user.stats.ticketsCount, 'bg-sun-soft text-on-sun'],
                [t('Codes', 'Codes'), user.stats.claimedRewardsCount, 'bg-lavender text-fg'],
                [t('Filleuls', 'Referrals'), user.stats.referralsCount, 'bg-mint text-fg'],
              ].map(([label, value, tone]) => (
                <div key={String(label)} className={cn('flex flex-col-reverse rounded-[18px] px-2 py-3', String(tone))}>
                  <dt className="text-caption font-medium opacity-80">{label}</dt>
                  <dd className="text-heading font-bold tabular">{value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </section>

        <section className="card overflow-hidden p-0">
          <button type="button" onClick={handleTheme} className={rowClasses}>
            <RowBadge icon="moon" tone="bg-lavender text-violet" />
            <span className="flex-1 text-body font-semibold">
              {t(`Apparence : ${mode === 'DARK' ? 'Sombre' : 'Claire'}`, `Theme: ${mode === 'DARK' ? 'Dark' : 'Light'}`)}
            </span>
            <Icon name="chevronRight" size={18} className="text-fg-muted" />
          </button>
          <button type="button" onClick={handleLanguage} className={cn(rowClasses, 'border-t border-line')}>
            <RowBadge icon="globe" tone="bg-mint text-green" />
            <span className="flex-1 text-body font-semibold">{t(`Langue : ${language}`, `Language: ${language}`)}</span>
            <Icon name="chevronRight" size={18} className="text-fg-muted" />
          </button>
        </section>

        <WalletCard />

        <nav className="card overflow-hidden p-0" aria-label={t('Paramètres du compte', 'Account settings')}>
          <Link href="/profil/securite" className={rowClasses}>
            <RowBadge icon="shield" tone="bg-sun-soft text-on-sun" />
            <span className="flex-1 text-body font-semibold">
              {t('Sécurité 2FA & Jeu responsable', '2FA Security & Responsible Play')}
            </span>
            <Icon name="chevronRight" size={18} className="text-fg-muted" />
          </Link>
          <Link href="/profil/identite" className={cn(rowClasses, 'border-t border-line')}>
            <RowBadge icon="idCard" tone="bg-lavender text-violet" />
            <span className="flex-1 text-body font-semibold">
              {ageStatus === 'VERIFIED'
                ? t("Vérification d'identité : âge vérifié", 'Identity verification: age verified')
                : t("Vérification d'identité", 'Identity verification')}
            </span>
            <Icon name="chevronRight" size={18} className="text-fg-muted" />
          </Link>
          <Link href="/profil/rgpd" className={cn(rowClasses, 'border-t border-line')}>
            <RowBadge icon="lock" tone="bg-mint text-green" />
            <span className="flex-1 text-body font-semibold">{t('Données personnelles (RGPD)', 'Personal Data (GDPR)')}</span>
            <Icon name="chevronRight" size={18} className="text-fg-muted" />
          </Link>
          <Link href="/profil/aide" className={cn(rowClasses, 'border-t border-line')}>
            <RowBadge icon="help" tone="bg-peach text-terracotta" />
            <span className="flex-1 text-body font-semibold">
              {t('Charte de transparence & Aide', 'Transparency Charter & Help')}
            </span>
            <Icon name="chevronRight" size={18} className="text-fg-muted" />
          </Link>
          <button type="button" onClick={signOut} className={cn(rowClasses, 'border-t border-line text-error')}>
            <RowBadge icon="logout" tone="bg-peach text-error" />
            <span className="flex-1 text-body font-semibold">{t('Se déconnecter', 'Sign Out')}</span>
          </button>
        </nav>
      </div>

      <div className="flex flex-col gap-4">
        <section className="flex flex-col gap-3 rounded-[24px] bg-sun-soft p-5 text-on-sun">
          <div className="flex items-start gap-3">
            <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sun text-on-sun">
              <Icon name="gift" size={20} />
            </span>
            <div>
              <h2 className="text-subtitle font-bold text-on-sun">
                {t('Parrainage (+100 pts par invitation)', 'Referrals (+100 pts per friend)')}
              </h2>
              <p className="text-caption font-medium text-on-sun-muted">
                {t(
                  `${referralInfo?.referralsCount ?? 0} filleul(s) inscrit(s)`,
                  `${referralInfo?.referralsCount ?? 0} referral(s) joined`
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-[14px] bg-white px-3.5 py-2.5">
            <Icon name="share" size={16} className="text-[#657084]" />
            <span className="min-w-0 flex-1 truncate font-mono text-caption text-[#1d2637]">{referralLink}</span>
          </div>
          <Button variant="secondary" onClick={handleCopy}>
            <Icon name={copied ? 'check' : 'copy'} size={18} />
            {copied
              ? t('Lien copié dans le presse-papiers', 'Link copied to clipboard')
              : t('Copier mon lien de parrainage', 'Copy my referral link')}
          </Button>
          <div className="flex gap-2">
            {shareLinks.map((s) => (
              <a
                key={s.label}
                href={s.href || '#'}
                target="_blank"
                rel="noopener noreferrer"
                aria-disabled={!s.href}
                className={cn(
                  'flex-1 rounded-full bg-white py-2.5 text-center text-caption font-semibold text-[#1d2637] hover:bg-sun-chip',
                  !s.href && 'pointer-events-none opacity-50'
                )}
              >
                {s.label}
              </a>
            ))}
          </div>
          {referralInfo?.referrals?.length ? (
            <ul className="flex flex-col gap-1.5 rounded-[16px] bg-white p-3">
              {referralInfo.referrals.slice(0, 5).map((r) => (
                <li key={r.id} className="flex justify-between text-caption text-[#1d2637]">
                  <span className="font-mono font-semibold">{r.anonymizedWallet}</span>
                  <span className="text-[#657084]">{new Date(r.joinedAt).toLocaleDateString()}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        <section className="card flex flex-col gap-2.5 p-5">
          <div className="mb-1 flex items-center gap-3">
            <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-lavender text-violet">
              <Icon name="star" size={20} />
            </span>
            <h2 className="text-subtitle font-bold">{t('Missions citoyennes', 'Community Quests')}</h2>
          </div>
          {questsLoading ? (
            <p className="text-caption text-fg-muted">{t('Chargement…', 'Loading…')}</p>
          ) : (
            quests.map((q) => (
              <button
                key={q.id}
                type="button"
                disabled={q.completed || completing}
                onClick={() => handleCompleteQuest(q.id)}
                className={cn(
                  'flex items-center justify-between gap-3 rounded-[16px] p-3.5 text-left transition-colors',
                  q.completed ? 'bg-mint' : 'bg-surface-elevated hover:bg-sun-chip'
                )}
              >
                <span className="flex flex-1 items-center gap-3">
                  <span
                    aria-hidden
                    className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                      q.completed ? 'bg-surface text-green' : 'bg-surface text-fg-muted'
                    )}
                  >
                    <Icon name={q.completed ? 'check' : 'clock'} size={16} />
                  </span>
                  <span className="flex flex-1 flex-col">
                    <span className={cn('text-caption font-semibold', q.completed ? 'text-green' : 'text-fg-muted')}>
                      {q.completed ? t('Fait', 'Done') : t('À faire', 'Todo')}
                    </span>
                    <span className="text-caption font-medium">{q.title}</span>
                  </span>
                </span>
                <span className="shrink-0 rounded-full bg-lavender px-2.5 py-1 text-caption font-bold text-violet">
                  +{q.rewardPoints} pts
                </span>
              </button>
            ))
          )}
        </section>
      </div>
    </div>
  );
}
