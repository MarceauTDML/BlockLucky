'use client';

import React, { useState } from 'react';
import AdminQueryError from '@/components/admin/AdminQueryError';
import Button from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';
import { Textarea } from '@/components/ui/Input';
import { Loader } from '@/components/ui/Loader';
import { Alert, Badge, EmptyState, PageHeader } from '@/components/ui/Misc';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import Sheet from '@/components/ui/Sheet';
import { formatDateShort } from '@/lib/date';
import { shortenWallet } from '@/lib/formatters';
import {
  useDecideIdentityVerificationMutation,
  useGetIdentityVerificationQuery,
  useGetIdentityVerificationsQuery,
} from '@/store/api/adminApi';
import { getErrorMessage } from '@/store/api/baseApi';
import { useAppTheme } from '@/theme/ThemeProvider';
import { IdentityVerificationStatus, IdentityVerificationSummary } from '@/types/admin.types';

const PAGE_SIZE = 20;

const STATUS_LABELS: Record<IdentityVerificationStatus, [string, string, 'warning' | 'primary' | 'danger']> = {
  PENDING: ['En attente', 'Pending', 'warning'],
  VERIFIED: ['Vérifiée', 'Verified', 'primary'],
  REJECTED: ['Refusée', 'Rejected', 'danger'],
};

export default function IdentityVerificationsPage() {
  const { t } = useAppTheme();
  const [status, setStatus] = useState<IdentityVerificationStatus>('PENDING');
  const [page, setPage] = useState(1);
  const [target, setTarget] = useState<IdentityVerificationSummary | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState('');
  const [noteError, setNoteError] = useState<string | undefined>(undefined);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  const { data, isLoading, isError, error, isFetching, refetch } = useGetIdentityVerificationsQuery({
    status,
    page,
    limit: PAGE_SIZE,
  });
  const detailQuery = useGetIdentityVerificationQuery(target?.id ?? '', { skip: !target });
  const [decide, { isLoading: deciding }] = useDecideIdentityVerificationMutation();

  const verifications = data?.data?.verifications ?? [];
  const totalPages = data?.meta?.totalPages ?? 1;
  const detail = detailQuery.data?.data?.verification;

  const closeSheet = () => {
    setTarget(null);
    setRejecting(false);
    setNote('');
    setNoteError(undefined);
  };

  const changeStatus = (next: IdentityVerificationStatus) => {
    setStatus(next);
    setPage(1);
  };

  const submitDecision = async (approved: boolean) => {
    if (!target) return;
    const trimmed = note.trim();
    if (!approved && trimmed.length < 3) {
      setNoteError(t('Indiquez le motif du refus (3 caractères au moins).', 'Give the reason for the rejection (at least 3 characters).'));
      return;
    }
    const email = target.email ?? t('ce citoyen', 'this citizen');
    try {
      await decide({ id: target.id, approved, ...(approved ? {} : { note: trimmed }) }).unwrap();
      setFeedback({
        tone: 'success',
        text: approved
          ? t(`Âge de ${email} vérifié. Les images ont été effacées.`, `${email} is now age-verified. The images were erased.`)
          : t(`Pièce de ${email} refusée. Le citoyen a été prévenu par email.`, `${email}'s document was rejected. The citizen was notified by email.`),
      });
    } catch (err) {
      setFeedback({ tone: 'error', text: getErrorMessage(err, t('Décision impossible.', 'Decision failed.')) });
    } finally {
      closeSheet();
    }
  };

  return (
    <div>
      <PageHeader
        title={t("Vérification d'âge", 'Age verification')}
        subtitle={t(
          "Contrôlez les pièces d'identité envoyées par les citoyens. Les images sont effacées dès la décision et chaque consultation est tracée.",
          'Review the identity documents sent by citizens. Images are erased as soon as a decision is made and every view is logged.'
        )}
        actions={
          <Button size="sm" variant="outline" fullWidth={false} onClick={() => refetch()} loading={isFetching}>
            {t('Actualiser', 'Refresh')}
          </Button>
        }
      />

      {feedback ? (
        <Alert tone={feedback.tone} className="mb-4">
          {feedback.text}
        </Alert>
      ) : null}

      <SegmentedTabs<IdentityVerificationStatus>
        ariaLabel={t('Statut des demandes', 'Request status')}
        value={status}
        onChange={changeStatus}
        className="mb-4 md:max-w-md"
        options={(Object.keys(STATUS_LABELS) as IdentityVerificationStatus[]).map((key) => ({
          value: key,
          label: t(STATUS_LABELS[key][0], STATUS_LABELS[key][1]),
        }))}
      />

      {isLoading ? (
        <Loader skeletonRows={4} />
      ) : isError ? (
        <AdminQueryError error={error} fallback={t('Liste des demandes indisponible.', 'Request list unavailable.')} />
      ) : verifications.length === 0 ? (
        <EmptyState
          title={status === 'PENDING' ? t('Aucune demande en attente', 'No pending request') : t('Aucune demande', 'No request')}
          description={t(
            "Les pièces d'identité envoyées depuis l'application mobile apparaîtront ici.",
            'Identity documents sent from the mobile app will appear here.'
          )}
        />
      ) : (
        <>
          <ul className="grid gap-3 md:grid-cols-2">
            {verifications.map((v) => {
              const label = STATUS_LABELS[v.status];
              return (
                <li key={v.id} className="card flex flex-col gap-4 p-[18px]">
                  <div className="flex items-start gap-3">
                    <span
                      aria-hidden
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-lavender text-violet"
                    >
                      <Icon name="idCard" size={20} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate text-body font-bold">{v.email ?? t('Compte sans email', 'Account without email')}</h2>
                      <p className="text-caption text-fg-muted">
                        {t('Envoyée le', 'Sent on')} {formatDateShort(v.submittedAt)}
                      </p>
                    </div>
                    <Badge tone={label[2]}>{t(label[0], label[1])}</Badge>
                  </div>
                  <Button
                    size="sm"
                    variant={v.status === 'PENDING' ? 'primary' : 'outline'}
                    onClick={() => {
                      setFeedback(null);
                      setTarget(v);
                    }}
                  >
                    {v.status === 'PENDING' ? t('Examiner', 'Review') : t('Voir la décision', 'View decision')}
                  </Button>
                </li>
              );
            })}
          </ul>
          {totalPages > 1 ? (
            <div className="mt-4 flex items-center justify-center gap-3">
              <Button size="sm" variant="outline" fullWidth={false} disabled={page <= 1} onClick={() => setPage(page - 1)}>
                {t('Précédent', 'Previous')}
              </Button>
              <span className="text-caption text-fg-secondary tabular">
                {page} / {totalPages}
              </span>
              <Button
                size="sm"
                variant="outline"
                fullWidth={false}
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                {t('Suivant', 'Next')}
              </Button>
            </div>
          ) : null}
        </>
      )}

      <Sheet
        open={Boolean(target)}
        size="lg"
        tone={rejecting ? 'danger' : 'default'}
        eyebrow={t("Pièce d'identité", 'Identity document')}
        title={target?.email ?? t('Demande de vérification', 'Verification request')}
        onClose={closeSheet}
      >
        <div className="flex flex-col gap-3 pb-2">
          {detailQuery.isFetching && !detail ? (
            <Loader skeletonRows={3} />
          ) : detailQuery.isError || !detail ? (
            <AdminQueryError error={detailQuery.error} fallback={t('Demande indisponible.', 'Request unavailable.')} />
          ) : (
            <>
              <dl className="grid grid-cols-2 gap-2">
                {[
                  [t('Envoyée le', 'Sent on'), formatDateShort(detail.submittedAt)],
                  [t('Compte créé le', 'Account created'), formatDateShort(detail.accountCreatedAt)],
                  [t('Portefeuille', 'Wallet'), shortenWallet(detail.walletAddress, 4)],
                  [t('Décision', 'Decision'), detail.reviewedAt ? formatDateShort(detail.reviewedAt) : '—'],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-[16px] bg-surface-elevated px-3.5 py-3">
                    <dt className="text-caption font-medium text-fg-muted">{label}</dt>
                    <dd className="text-body font-bold tabular">{value}</dd>
                  </div>
                ))}
              </dl>

              {detail.front && detail.back ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    [t('Recto', 'Front'), detail.front],
                    [t('Verso', 'Back'), detail.back],
                  ].map(([label, src]) => (
                    <figure key={label} className="flex flex-col gap-1.5">
                      <figcaption className="text-caption font-medium text-fg-secondary">{label}</figcaption>
                      <img
                        src={src}
                        alt={t(`${label} de la pièce d'identité`, `${label} of the identity document`)}
                        className="max-h-80 w-full rounded-[16px] bg-surface-elevated object-contain"
                      />
                    </figure>
                  ))}
                </div>
              ) : (
                <Alert tone="info">
                  {detail.status === 'PENDING'
                    ? t('Images indisponibles.', 'Images unavailable.')
                    : t(
                        'Décision prise : les images ont été effacées, seule la décision est conservée.',
                        'Decision made: images were erased, only the decision is kept.'
                      )}
                </Alert>
              )}

              {detail.status === 'REJECTED' && detail.note ? (
                <Alert tone="warning">
                  {t('Motif du refus :', 'Rejection reason:')} {detail.note}
                </Alert>
              ) : null}

              {detail.status === 'PENDING' ? (
                rejecting ? (
                  <>
                    <Textarea
                      label={t('Motif du refus (envoyé au citoyen)', 'Rejection reason (sent to the citizen)')}
                      value={note}
                      maxLength={500}
                      errorText={noteError}
                      onChange={(e) => {
                        setNote(e.target.value);
                        setNoteError(undefined);
                      }}
                    />
                    <Button variant="danger" onClick={() => submitDecision(false)} loading={deciding}>
                      {t('Confirmer le refus', 'Confirm rejection')}
                    </Button>
                    <Button variant="outline" onClick={() => setRejecting(false)} disabled={deciding}>
                      {t('Retour', 'Back')}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button onClick={() => submitDecision(true)} loading={deciding}>
                      {t("Approuver : l'âge est vérifié", 'Approve: age verified')}
                    </Button>
                    <Button variant="outline" onClick={() => setRejecting(true)} disabled={deciding}>
                      {t('Refuser avec un motif', 'Reject with a reason')}
                    </Button>
                  </>
                )
              ) : null}
            </>
          )}
        </div>
      </Sheet>
    </div>
  );
}
