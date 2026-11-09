'use client';

import React, { useState } from 'react';
import Button, { LinkButton } from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import { shortenWallet } from '@/lib/formatters';
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

export default function ProfilePage() {
  const { mode, language, toggleTheme, setLanguage, t } = useAppTheme();
  const { user, signOut } = useAuth();
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
    <div className="grid gap-3.5 lg:grid-cols-[1fr_1.2fr] lg:items-start lg:gap-5">
      <div className="flex flex-col gap-3.5">
        <section className="card flex flex-col gap-1.5 p-[18px]">
          <p className="eyebrow-caps text-caption font-semibold text-secondary">
            {t(`${roleLabel[0]} (${user?.role || 'USER'})`, `${roleLabel[1]} (${user?.role || 'USER'})`)}
          </p>
          <h1 className="my-0.5 font-mono text-title font-bold">{shortenWallet(user?.walletAddress, 6)}</h1>
          <p className="text-caption text-fg-secondary">
            {user?.email || t('Portefeuille Web3', 'Web3 Wallet')} • {pointsBalance} pts
          </p>
          {user?.stats ? (
            <dl className="mt-2 grid grid-cols-3 gap-2 text-center">
              {[
                [t('Tickets', 'Tickets'), user.stats.ticketsCount],
                [t('Codes', 'Codes'), user.stats.claimedRewardsCount],
                [t('Filleuls', 'Referrals'), user.stats.referralsCount],
              ].map(([label, value]) => (
                <div key={String(label)} className="rounded-md bg-surface-elevated px-2 py-2.5">
                  <dt className="text-caption text-fg-muted">{label}</dt>
                  <dd className="text-subtitle font-bold tabular">{value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
          <div className="mt-2.5 flex gap-2.5">
            <button
              type="button"
              onClick={handleTheme}
              className="flex-1 rounded-md border border-line bg-surface-elevated px-3 py-2.5 text-caption font-semibold hover:border-fg-muted"
            >
              {t(`Apparence : ${mode === 'DARK' ? 'Sombre' : 'Claire'}`, `Theme: ${mode === 'DARK' ? 'Dark' : 'Light'}`)}
            </button>
            <button
              type="button"
              onClick={handleLanguage}
              className="flex-1 rounded-md border border-line bg-surface-elevated px-3 py-2.5 text-caption font-semibold hover:border-fg-muted"
            >
              {t(`Langue : ${language}`, `Language: ${language}`)}
            </button>
          </div>
        </section>

        <nav className="flex flex-col gap-2.5" aria-label={t('Paramètres du compte', 'Account settings')}>
          <LinkButton href="/profil/securite" variant="secondary">
            {t('Sécurité 2FA & Jeu responsable', '2FA Security & Responsible Play')}
          </LinkButton>
          <LinkButton href="/profil/rgpd" variant="outline">
            {t('Données personnelles (RGPD)', 'Personal Data (GDPR)')}
          </LinkButton>
          <LinkButton href="/profil/aide" variant="outline">
            {t('Charte de transparence & Aide', 'Transparency Charter & Help')}
          </LinkButton>
          <Button variant="danger" onClick={signOut}>
            {t('Se déconnecter', 'Sign Out')}
          </Button>
        </nav>
      </div>

      <div className="flex flex-col gap-3.5">
        <section className="card flex flex-col gap-2.5 p-4">
          <h2 className="text-subtitle font-semibold">
            {t('Parrainage (+100 pts par invitation)', 'Referrals (+100 pts per friend)')}
          </h2>
          <p className="text-caption text-fg-secondary">
            {t(
              `${referralInfo?.referralsCount ?? 0} filleul(s) inscrit(s)`,
              `${referralInfo?.referralsCount ?? 0} referral(s) joined`
            )}
          </p>
          <div className="flex items-center gap-2 rounded-md border border-line bg-surface-elevated px-3 py-2">
            <span className="min-w-0 flex-1 truncate font-mono text-caption text-fg-secondary">{referralLink}</span>
          </div>
          <Button onClick={handleCopy}>
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
                  'flex-1 rounded-md border border-line bg-surface-elevated py-2.5 text-center text-caption font-medium hover:border-fg-muted',
                  !s.href && 'pointer-events-none opacity-50'
                )}
              >
                {s.label}
              </a>
            ))}
          </div>
          {referralInfo?.referrals?.length ? (
            <ul className="flex flex-col gap-1 border-t border-line pt-2.5">
              {referralInfo.referrals.slice(0, 5).map((r) => (
                <li key={r.id} className="flex justify-between text-caption">
                  <span className="font-mono">{r.anonymizedWallet}</span>
                  <span className="text-fg-muted">{new Date(r.joinedAt).toLocaleDateString()}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        <section className="card flex flex-col gap-2.5 p-4">
          <h2 className="text-subtitle font-semibold">{t('Missions citoyennes', 'Community Quests')}</h2>
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
                  'flex items-center justify-between gap-3 rounded-md border bg-surface-elevated p-3 text-left transition-colors',
                  q.completed ? 'border-primary' : 'border-line hover:border-fg-muted'
                )}
              >
                <span className="flex flex-1 items-center gap-2.5">
                  <span className={cn('text-caption font-semibold', q.completed ? 'text-primary' : 'text-fg-muted')}>
                    {q.completed ? t('Fait', 'Done') : t('À faire', 'Todo')}
                  </span>
                  <span className="flex-1 text-caption font-medium">{q.title}</span>
                </span>
                <span className="text-caption font-semibold text-secondary">+{q.rewardPoints} pts</span>
              </button>
            ))
          )}
        </section>
      </div>
    </div>
  );
}
