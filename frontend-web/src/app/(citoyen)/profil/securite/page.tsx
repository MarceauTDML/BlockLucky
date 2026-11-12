'use client';

import React, { useState } from 'react';
import BackButton from '@/components/ui/BackButton';
import Button, { LinkButton } from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';
import { Alert, PageHeader } from '@/components/ui/Misc';
import { ChoicePills } from '@/components/ui/SegmentedTabs';
import Sheet from '@/components/ui/Sheet';
import useAuth from '@/hooks/useAuth';
import { useAppDispatch } from '@/store';
import { useSetResponsibleLimitMutation } from '@/store/api/authApi';
import { getErrorMessage } from '@/store/api/baseApi';
import { updateUserProfile } from '@/store/slices/authSlice';
import storage, { KEYS } from '@/lib/storage';
import { useAppTheme } from '@/theme/ThemeProvider';

const LIMIT_PRESETS = [5, 10, 25, 50, 100] as const;
type Limit = (typeof LIMIT_PRESETS)[number];

export default function SecurityPage() {
  const { t } = useAppTheme();
  const dispatch = useAppDispatch();
  const { user, disable2FA, isDisabling2FA, signOutEverywhere } = useAuth();
  const [setResponsibleLimit, { isLoading: isSavingLimit }] = useSetResponsibleLimitMutation();

  const current = user?.responsibleGaming?.maxTicketsPerRound ?? 25;
  const [selectedLimit, setSelectedLimit] = useState<Limit>(
    (LIMIT_PRESETS as readonly number[]).includes(current) ? (current as Limit) : 25
  );
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [confirmDisable, setConfirmDisable] = useState(false);
  const [rbacChecked, setRbacChecked] = useState(false);

  const persistUser = (patch: Parameters<typeof updateUserProfile>[0]) => {
    dispatch(updateUserProfile(patch));
    if (user) storage.setJson(KEYS.user, { ...user, ...patch });
  };

  const handleSaveLimit = async () => {
    setFeedback(null);
    try {
      await setResponsibleLimit({ maxTicketsPerRound: selectedLimit }).unwrap();
      persistUser({ responsibleGaming: { maxTicketsPerRound: selectedLimit } });
      setFeedback({
        tone: 'success',
        text: t(
          `Limite enregistrée : maximum ${selectedLimit} tickets par tirage.`,
          `Limit saved: maximum ${selectedLimit} tickets per draw.`
        ),
      });
    } catch {
      setFeedback({
        tone: 'error',
        text: t('Impossible de mettre à jour votre limite pour le moment.', 'Unable to update your limit at the moment.'),
      });
    }
  };

  const handleDisable2FA = async () => {
    setConfirmDisable(false);
    try {
      await disable2FA({}).unwrap();
      persistUser({ isTwoFactorEnabled: false, twoFactorMethod: null });
      setFeedback({
        tone: 'success',
        text: t('La double authentification 2FA a été désactivée.', 'Two-factor authentication has been disabled.'),
      });
    } catch (err) {
      setFeedback({
        tone: 'error',
        text: getErrorMessage(err, t('Impossible de désactiver la 2FA.', 'Unable to disable 2FA.')),
      });
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <BackButton href="/profil" />
      <PageHeader title={t('Sécurité & Jeu responsable', 'Security & Responsible Play')} />

      <div className="flex flex-col gap-3.5">
        {feedback ? <Alert tone={feedback.tone}>{feedback.text}</Alert> : null}

        <section className="card flex flex-col gap-3 p-5">
          <div className="flex items-center gap-3">
            <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sun-soft text-on-sun">
              <Icon name="clock" size={20} />
            </span>
            <h2 className="text-subtitle font-bold">{t('Plafond de participation', 'Participation Cap')}</h2>
          </div>
          <p className="text-caption text-fg-secondary">
            {t(
              'Définissez votre limite personnelle de tickets par tirage. Elle s’applique immédiatement sur le web et le mobile.',
              'Set your personal maximum number of tickets per draw. It applies immediately on web and mobile.'
            )}
          </p>
          <ChoicePills
            options={LIMIT_PRESETS}
            value={selectedLimit}
            onChange={setSelectedLimit}
            ariaLabel={t('Plafond de tickets', 'Ticket cap')}
          />
          <Button onClick={handleSaveLimit} loading={isSavingLimit}>
            {t(`Enregistrer (${selectedLimit} tickets max)`, `Save Limit (${selectedLimit} tickets max)`)}
          </Button>
          <p className="rounded-[16px] bg-surface-elevated px-4 py-3 text-caption text-fg-secondary">
            {t(
              'Besoin d’aide ? Joueurs Info Service : 09 74 75 13 13 (appel non surtaxé).',
              'Need help? Joueurs Info Service (France): 09 74 75 13 13.'
            )}
          </p>
        </section>

        <section className="card flex flex-col gap-3 p-5">
          <div className="flex items-center gap-3">
            <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-mint text-green">
              <Icon name="shield" size={20} />
            </span>
            <h2 className="text-subtitle font-bold">{t('Double authentification (2FA)', 'Two-Factor Authentication (2FA)')}</h2>
          </div>
          <p
            className={
              user?.isTwoFactorEnabled
                ? 'self-start rounded-full bg-mint px-3 py-1 text-caption font-semibold text-green'
                : 'self-start rounded-full bg-peach px-3 py-1 text-caption font-semibold text-terracotta'
            }
          >
            {t('Statut : ', 'Status: ')}
            {user?.isTwoFactorEnabled
              ? t(`Activée (${user.twoFactorMethod || 'APP'})`, `Enabled (${user.twoFactorMethod || 'APP'})`)
              : t('Désactivée', 'Disabled')}
          </p>
          <LinkButton href="/profil/securite/2fa" variant="secondary">
            {t('Configurer la 2FA', 'Configure 2FA')}
          </LinkButton>
          {user?.isTwoFactorEnabled ? (
            <Button variant="danger" onClick={() => setConfirmDisable(true)} loading={isDisabling2FA}>
              {t('Désactiver la 2FA', 'Disable 2FA')}
            </Button>
          ) : null}
        </section>

        <section className="card flex flex-col gap-3 p-5">
          <div className="flex items-center gap-3">
            <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-lavender text-violet">
              <Icon name="logout" size={20} />
            </span>
            <h2 className="text-subtitle font-bold">{t('Sessions actives', 'Active sessions')}</h2>
          </div>
          <p className="text-caption text-fg-secondary">
            {t(
              'Un appareil perdu ou partagé ? Déconnectez immédiatement toutes les sessions ouvertes sur votre compte, y compris celle-ci.',
              'Lost or shared device? Immediately sign out every session opened on your account, including this one.'
            )}
          </p>
          <Button variant="outline" onClick={() => signOutEverywhere()}>
            {t('Déconnecter tous mes appareils', 'Sign out of all devices')}
          </Button>
        </section>

        <section className="card flex flex-col gap-3 p-5">
          <div className="flex items-center gap-3">
            <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-peach text-terracotta">
              <Icon name="lock" size={20} />
            </span>
            <h2 className="text-subtitle font-bold">{t("Droits d'administration (RBAC)", 'Admin Permissions (RBAC)')}</h2>
          </div>
          <p className="text-caption text-fg-secondary">
            {t(
              `Rôle actuel : ${user?.role || 'USER'}. L'administration du Smart Contract est réservée aux services municipaux d'EtherBay.`,
              `Current role: ${user?.role || 'USER'}. Smart Contract administration is restricted to EtherBay municipal staff.`
            )}
          </p>
          {user?.role === 'ADMIN' ? (
            <LinkButton href="/mairie" variant="outline">
              {t('Ouvrir le Dashboard Mairie', 'Open City Hall Dashboard')}
            </LinkButton>
          ) : (
            <Button variant="outline" onClick={() => setRbacChecked(true)}>
              {t("Vérifier les permissions d'administration", 'Verify Admin Permissions')}
            </Button>
          )}
          {rbacChecked && user?.role !== 'ADMIN' ? (
            <div className="flex flex-col gap-1 rounded-[16px] bg-peach p-3.5" role="alert">
              <p className="text-caption font-semibold text-error">{t('Accès restreint (403)', 'Restricted Access (403)')}</p>
              <p className="text-caption text-fg-secondary">
                {t(
                  `Votre compte (${user?.role || 'USER'}) ne dispose pas des droits d'administration.`,
                  `Your account (${user?.role || 'USER'}) does not have administrator privileges.`
                )}
              </p>
            </div>
          ) : null}
        </section>
      </div>

      <Sheet
        open={confirmDisable}
        tone="danger"
        title={t('Désactiver la 2FA ?', 'Disable 2FA?')}
        onClose={() => setConfirmDisable(false)}
      >
        <div className="flex flex-col gap-3 pb-2">
          <p className="text-body text-fg-secondary">
            {t(
              'Votre compte ne sera plus protégé par un second facteur lors de la connexion.',
              'Your account will no longer be protected by a second factor at sign-in.'
            )}
          </p>
          <Button variant="danger" onClick={handleDisable2FA}>
            {t('Oui, désactiver', 'Yes, disable')}
          </Button>
          <Button variant="outline" onClick={() => setConfirmDisable(false)}>
            {t('Annuler', 'Cancel')}
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
