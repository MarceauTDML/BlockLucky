'use client';

import React, { useState } from 'react';
import BackButton from '@/components/ui/BackButton';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Alert, PageHeader } from '@/components/ui/Misc';
import Sheet from '@/components/ui/Sheet';
import useAuth from '@/hooks/useAuth';
import { downloadTextFile } from '@/lib/download';
import {
  useConfirmGdprDeletionMutation,
  useExportGdprDataMutation,
  useRequestGdprDeletionMutation,
} from '@/store/api/authApi';
import { useAppTheme } from '@/theme/ThemeProvider';

export default function GdprPage() {
  const { t } = useAppTheme();
  const { signOut } = useAuth();
  const [exportGdpr, { isLoading: isExporting }] = useExportGdprDataMutation();
  const [requestDeletion, { isLoading: isRequesting }] = useRequestGdprDeletionMutation();
  const [confirmDeletion, { isLoading: isConfirming }] = useConfirmGdprDeletionMutation();

  const [preview, setPreview] = useState('');
  const [token, setToken] = useState('');
  const [requested, setRequested] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [status, setStatus] = useState<{ tone: 'success' | 'error' | 'info'; text: string } | null>(null);

  const handleExport = async () => {
    try {
      const res = await exportGdpr().unwrap();
      const json = JSON.stringify(res.data, null, 2);
      setPreview(json);
      downloadTextFile(`blocklucky-mes-donnees-${new Date().toISOString().slice(0, 10)}.json`, json, 'application/json');
      setStatus({
        tone: 'success',
        text: t(
          'Vos données personnelles ont été exportées au format JSON.',
          'Your personal data has been exported in JSON format.'
        ),
      });
    } catch {
      setStatus({ tone: 'error', text: t("Erreur lors de la génération de l'export RGPD.", 'Error generating GDPR data export.') });
    }
  };

  const handleRequest = async () => {
    try {
      const res = await requestDeletion().unwrap();
      setRequested(true);
      if (res.data.confirmationToken) setToken(res.data.confirmationToken);
      setStatus({ tone: 'info', text: res.data.message });
    } catch {
      setStatus({ tone: 'error', text: t('Erreur lors de la demande de suppression.', 'Error requesting account deletion.') });
    }
  };

  const handleConfirm = async () => {
    setConfirmOpen(false);
    try {
      await confirmDeletion({ token: token.trim() }).unwrap();
      signOut();
    } catch {
      setStatus({
        tone: 'error',
        text: t('Jeton de confirmation invalide ou expiré.', 'Invalid or expired confirmation token.'),
      });
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <BackButton href="/profil" />
      <PageHeader
        title={t('Données personnelles (RGPD)', 'Personal Data (GDPR)')}
        subtitle={t(
          "Vous disposez d'un droit d'accès, de portabilité et d'anonymisation complète de vos informations.",
          'You have the right to access, export, and permanently anonymize your personal data.'
        )}
      />

      <div className="flex flex-col gap-3.5">
        {status ? <Alert tone={status.tone}>{status.text}</Alert> : null}

        <section className="card flex flex-col gap-3 p-[18px]">
          <h2 className="text-subtitle font-semibold">{t('1. Export de vos données (JSON)', '1. Data Portability (JSON Export)')}</h2>
          <p className="text-caption text-fg-secondary">
            {t(
              "Récupérez l'intégralité des données associées à votre compte (profil, tickets, points et codes).",
              'Download all data associated with your account (profile, tickets, points, and codes).'
            )}
          </p>
          <Button onClick={handleExport} loading={isExporting}>
            {t('Exporter mes données', 'Export My Data')}
          </Button>
          {preview ? (
            <pre className="max-h-56 overflow-auto rounded-md bg-surface-elevated p-3 font-mono text-caption text-fg-secondary">
              {preview.slice(0, 1500)}
              {preview.length > 1500 ? '\n…' : ''}
            </pre>
          ) : null}
        </section>

        <section className="card flex flex-col gap-3 p-[18px]">
          <h2 className="text-subtitle font-semibold text-error">
            {t('2. Suppression et anonymisation', '2. Account Deletion & Anonymization')}
          </h2>
          <p className="text-caption text-fg-secondary">
            {t(
              'La suppression anonymise définitivement votre adresse de portefeuille et votre email en base de données. Un email de confirmation vous est envoyé.',
              'Deletion permanently anonymizes your wallet address and email in our database. A confirmation email is sent to you.'
            )}
          </p>
          <Button variant="danger" onClick={handleRequest} loading={isRequesting} disabled={requested}>
            {t('Demander la suppression du compte', 'Request Account Deletion')}
          </Button>

          {requested ? (
            <>
              <Input
                label={t('Jeton de confirmation', 'Confirmation Token')}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder={t("Collez le jeton reçu par email", 'Paste the token received by email')}
                autoComplete="off"
              />
              <Button variant="outline" onClick={() => setConfirmOpen(true)} disabled={token.trim().length < 10} loading={isConfirming}>
                {t("Confirmer l'anonymisation définitive", 'Confirm Permanent Anonymization')}
              </Button>
            </>
          ) : null}
        </section>
      </div>

      <Sheet
        open={confirmOpen}
        tone="danger"
        eyebrow={t('Action irréversible', 'Irreversible action')}
        title={t('Anonymiser définitivement mon compte ?', 'Permanently anonymize my account?')}
        onClose={() => setConfirmOpen(false)}
      >
        <div className="flex flex-col gap-3 pb-2">
          <p className="text-body text-fg-secondary">
            {t(
              'Votre email et votre portefeuille seront anonymisés. Vos points et codes non utilisés seront perdus. Cette action ne peut pas être annulée.',
              'Your email and wallet will be anonymized. Unused points and codes will be lost. This cannot be undone.'
            )}
          </p>
          <Button variant="danger" onClick={handleConfirm}>
            {t('Oui, anonymiser mon compte', 'Yes, anonymize my account')}
          </Button>
          <Button variant="outline" onClick={() => setConfirmOpen(false)}>
            {t('Annuler', 'Cancel')}
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
