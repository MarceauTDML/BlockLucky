'use client';

import React, { useState } from 'react';
import BackButton from '@/components/ui/BackButton';
import Button, { LinkButton } from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';
import { Loader } from '@/components/ui/Loader';
import { Alert, Badge, CheckboxCard, PageHeader } from '@/components/ui/Misc';
import useAgeVerification from '@/hooks/useAgeVerification';
import useAuth from '@/hooks/useAuth';
import { formatDateShort } from '@/lib/date';
import storage, { KEYS } from '@/lib/storage';
import { useAppDispatch } from '@/store';
import { useSubmitIdentityMutation } from '@/store/api/authApi';
import { getErrorMessage } from '@/store/api/baseApi';
import { updateUserProfile } from '@/store/slices/authSlice';
import { useAppTheme } from '@/theme/ThemeProvider';
import { AgeVerificationStatus } from '@/types/user.types';

const MAX_BYTES = 4 * 1024 * 1024;
const ACCEPTED = ['image/jpeg', 'image/png'];

type Side = 'front' | 'back';
type Picked = { dataUrl: string; name: string };

const readAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

const STATUS_BADGES: Record<AgeVerificationStatus, [string, string, 'neutral' | 'warning' | 'primary' | 'danger']> = {
  NONE: ['À envoyer', 'To send', 'neutral'],
  PENDING: ['En cours de vérification', 'Under review', 'warning'],
  VERIFIED: ['Âge vérifié', 'Age verified', 'primary'],
  REJECTED: ['Refusée', 'Rejected', 'danger'],
};

export default function IdentityPage() {
  const { t } = useAppTheme();
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const { identity, status: liveStatus, isLoading, isError, refetch } = useAgeVerification();
  const [submitIdentity, { isLoading: isSubmitting }] = useSubmitIdentityMutation();

  const [files, setFiles] = useState<Record<Side, Picked | null>>({ front: null, back: null });
  const [fileErrors, setFileErrors] = useState<Record<Side, string>>({ front: '', back: '' });
  const [consent, setConsent] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  const status: AgeVerificationStatus = liveStatus ?? 'NONE';
  const canSubmit = status === 'NONE' || status === 'REJECTED';
  const [badgeFr, badgeEn, badgeTone] = STATUS_BADGES[status];

  const handlePick = async (side: Side, file: File | undefined) => {
    setFeedback(null);
    setFileErrors((prev) => ({ ...prev, [side]: '' }));
    if (!file) return;
    if (!ACCEPTED.includes(file.type)) {
      setFileErrors((prev) => ({ ...prev, [side]: t('Format accepté : JPEG ou PNG.', 'Accepted format: JPEG or PNG.') }));
      return;
    }
    if (file.size > MAX_BYTES) {
      setFileErrors((prev) => ({ ...prev, [side]: t('Image trop volumineuse : 4 Mo au plus.', 'Image too large: 4 MB maximum.') }));
      return;
    }
    try {
      const dataUrl = await readAsDataUrl(file);
      setFiles((prev) => ({ ...prev, [side]: { dataUrl, name: file.name } }));
    } catch {
      setFileErrors((prev) => ({ ...prev, [side]: t('Lecture du fichier impossible.', 'Could not read the file.') }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!files.front || !files.back || !consent || isSubmitting) return;
    setFeedback(null);
    try {
      await submitIdentity({ front: files.front.dataUrl, back: files.back.dataUrl }).unwrap();
      dispatch(updateUserProfile({ ageVerificationStatus: 'PENDING' }));
      if (user) storage.setJson(KEYS.user, { ...user, ageVerificationStatus: 'PENDING' });
      setFiles({ front: null, back: null });
      setConsent(false);
      setFeedback({
        tone: 'success',
        text: t(
          'Pièce envoyée. La Mairie la vérifie, vous serez notifié de sa décision.',
          'Document sent. City Hall is reviewing it and you will be notified of the decision.'
        ),
      });
      refetch();
    } catch (err) {
      setFeedback({
        tone: 'error',
        text: getErrorMessage(err, t('Envoi impossible. Réessayez dans un instant.', 'Upload failed. Please try again shortly.')),
      });
    }
  };

  const sides: { key: Side; label: string; hint: string }[] = [
    { key: 'front', label: t('Recto', 'Front'), hint: t('Face avec votre photo', 'Side with your photo') },
    { key: 'back', label: t('Verso', 'Back'), hint: t('Face arrière de la pièce', 'Back of the document') },
  ];

  return (
    <div className="mx-auto max-w-3xl">
      <BackButton href="/profil" />
      <PageHeader
        title={t("Vérification d'identité", 'Identity verification')}
        subtitle={t(
          "Le jeu est réservé aux habitants majeurs. Envoyez le recto et le verso de votre pièce d'identité : la Mairie la vérifie, puis les images sont effacées.",
          'The draw is reserved for adult residents. Send the front and back of your identity document: City Hall reviews it, then the images are erased.'
        )}
      />

      {isLoading ? (
        <Loader />
      ) : (
        <div className="flex flex-col gap-3.5">
          {isError ? (
            <Alert tone="error">
              {t('Statut de vérification indisponible.', 'Verification status unavailable.')}{' '}
              <button type="button" onClick={() => refetch()} className="underline underline-offset-2">
                {t('Réessayer', 'Retry')}
              </button>
            </Alert>
          ) : null}

          <section className="card flex flex-col gap-3 p-5" aria-live="polite">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-lavender text-violet">
                  <Icon name="idCard" size={20} />
                </span>
                <h2 className="text-subtitle font-bold">{t('Statut', 'Status')}</h2>
              </div>
              <Badge tone={badgeTone}>{t(badgeFr, badgeEn)}</Badge>
            </div>
            {status === 'VERIFIED' ? (
              <p className="text-caption text-fg-secondary">
                {t('Votre âge est vérifié. Vous pouvez participer aux tirages.', 'Your age is verified. You can enter the draws.')}
              </p>
            ) : null}
            {status === 'PENDING' ? (
              <p className="text-caption text-fg-secondary">
                {identity?.submittedAt
                  ? t(
                      `Pièce envoyée le ${formatDateShort(identity.submittedAt)}. La Mairie la vérifie.`,
                      `Document sent on ${formatDateShort(identity.submittedAt)}. City Hall is reviewing it.`
                    )
                  : t('La Mairie vérifie votre pièce.', 'City Hall is reviewing your document.')}
              </p>
            ) : null}
            {status === 'REJECTED' ? (
              <p className="text-caption text-fg-secondary">
                {identity?.note
                  ? t(`Motif : ${identity.note}`, `Reason: ${identity.note}`)
                  : t('Votre pièce a été refusée.', 'Your document was rejected.')}{' '}
                {t('Vous pouvez en envoyer une nouvelle.', 'You can send a new one.')}
              </p>
            ) : null}
            {status === 'VERIFIED' ? (
              <LinkButton href="/billetterie" className="mt-1">
                {t('Acheter mon ticket', 'Buy my ticket')}
              </LinkButton>
            ) : null}
          </section>

          {canSubmit ? (
            <form className="card flex flex-col gap-4 p-5 md:p-6" onSubmit={handleSubmit} noValidate>
              <div className="flex items-start gap-3">
                <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sun-soft text-on-sun">
                  <Icon name="camera" size={20} />
                </span>
                <div>
                <h2 className="text-subtitle font-bold">{t('Votre pièce', 'Your document')}</h2>
                <p className="text-caption text-fg-secondary">
                  {t(
                    "Carte d'identité, passeport ou titre de séjour. Photo nette, JPEG ou PNG, 4 Mo au plus par face.",
                    'Identity card, passport or residence permit. Sharp photo, JPEG or PNG, 4 MB maximum per side.'
                  )}
                </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {sides.map(({ key, label, hint }) => {
                  const picked = files[key];
                  return (
                    <div key={key} className="flex flex-col gap-1.5">
                      <label
                        htmlFor={`identity-${key}`}
                        className="flex min-h-[176px] cursor-pointer flex-col items-center justify-center gap-1.5 overflow-hidden rounded-[20px] border-2 border-dashed border-line bg-surface-elevated p-4 text-center hover:border-fg-muted focus-within:border-fg"
                      >
                        {picked ? (
                          <img
                            src={picked.dataUrl}
                            alt={t(`${label} sélectionné`, `${label} selected`)}
                            className="max-h-[140px] w-auto rounded-[12px] object-contain"
                          />
                        ) : (
                          <>
                            <span aria-hidden className="mb-1 flex h-10 w-10 items-center justify-center rounded-full bg-surface text-fg-secondary">
                              <Icon name="camera" size={20} />
                            </span>
                            <span className="text-body font-semibold">{label}</span>
                            <span className="text-caption text-fg-muted">{hint}</span>
                            <span className="mt-1 rounded-full bg-sun px-3 py-1 text-caption font-semibold text-on-sun">
                              {t('Choisir une photo', 'Choose a photo')}
                            </span>
                          </>
                        )}
                        <input
                          id={`identity-${key}`}
                          type="file"
                          accept={ACCEPTED.join(',')}
                          className="sr-only"
                          onChange={(e) => {
                            void handlePick(key, e.target.files?.[0]);
                            e.target.value = '';
                          }}
                        />
                      </label>
                      {picked ? (
                        <p className="truncate text-caption text-fg-muted">
                          {label} · {picked.name}
                        </p>
                      ) : null}
                      {fileErrors[key] ? (
                        <p role="alert" className="text-caption text-error">
                          {fileErrors[key]}
                        </p>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              <CheckboxCard id="identity-consent" checked={consent} onChange={setConsent}>
                {t(
                  "J'accepte que la Mairie d'EtherBay consulte ma pièce pour vérifier mon âge. Les images sont chiffrées puis effacées dès sa décision.",
                  'I agree that EtherBay City Hall may view my document to verify my age. Images are encrypted and erased as soon as a decision is made.'
                )}
              </CheckboxCard>

              <Button type="submit" loading={isSubmitting} disabled={!files.front || !files.back || !consent}>
                {t('Envoyer à la Mairie', 'Send to City Hall')}
              </Button>
            </form>
          ) : null}

          {feedback ? <Alert tone={feedback.tone}>{feedback.text}</Alert> : null}
        </div>
      )}
    </div>
  );
}
