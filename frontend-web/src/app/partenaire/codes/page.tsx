'use client';

import React, { useMemo, useRef, useState } from 'react';
import { PartnerSwitcher, usePartnerSelection } from '@/components/partner/PartnerSelection';
import Button from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';
import { Select, Textarea } from '@/components/ui/Input';
import { Alert, EmptyState, PageHeader } from '@/components/ui/Misc';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { parseCodes } from '@/lib/codes';
import { getErrorMessage } from '@/store/api/baseApi';
import { useUploadCodesMutation } from '@/store/api/partnersApi';
import { useAppTheme } from '@/theme/ThemeProvider';

type Source = 'MANUAL' | 'CSV';
const MAX_FILE_BYTES = 1024 * 1024;

export default function PartnerCodesPage() {
  const { t } = useAppTheme();
  const { selected } = usePartnerSelection();
  const [uploadCodes, { isLoading }] = useUploadCodesMutation();
  const fileRef = useRef<HTMLInputElement>(null);

  const [rewardId, setRewardId] = useState('');
  const [source, setSource] = useState<Source>('CSV');
  const [manual, setManual] = useState('');
  const [csvText, setCsvText] = useState('');
  const [fileName, setFileName] = useState('');
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  const offers = selected?.rewards ?? [];
  const currentRewardId = rewardId || offers[0]?.id || '';
  const parsed = useMemo(() => parseCodes(source === 'CSV' ? csvText : manual), [source, csvText, manual]);

  const onFile = async (file?: File) => {
    setFeedback(null);
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      setFeedback({ tone: 'error', text: t('Fichier trop volumineux (1 Mo max).', 'File too large (1 MB max).') });
      return;
    }
    if (!/\.(csv|txt)$/i.test(file.name)) {
      setFeedback({ tone: 'error', text: t('Format attendu : .csv ou .txt', 'Expected format: .csv or .txt') });
      return;
    }
    setFileName(file.name);
    setCsvText(await file.text());
  };

  const handleUpload = async () => {
    setFeedback(null);
    if (!currentRewardId || parsed.valid.length === 0) return;
    try {
      const res = await uploadCodes({ rewardId: currentRewardId, codes: parsed.valid }).unwrap();
      setFeedback({
        tone: 'success',
        text: t(
          `${res.data.injectedCount} code(s) injecté(s). Stock : ${res.data.remainingStock}/${res.data.totalStock}.`,
          `${res.data.injectedCount} code(s) added. Stock: ${res.data.remainingStock}/${res.data.totalStock}.`
        ),
      });
      setManual('');
      setCsvText('');
      setFileName('');
      if (fileRef.current) fileRef.current.value = '';
    } catch (err) {
      setFeedback({ tone: 'error', text: getErrorMessage(err, t('Import impossible.', 'Import failed.')) });
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow={selected?.name}
        title={t('Codes promo', 'Promo codes')}
        subtitle={t(
          'Injectez vos codes uniques : chaque habitant qui débloque l’offre en reçoit un.',
          'Upload your unique codes: each resident unlocking the offer receives one.'
        )}
        actions={<PartnerSwitcher />}
      />

      {offers.length === 0 ? (
        <EmptyState
          title={t('Aucune offre', 'No offer')}
          description={t('Créez d’abord une offre pour y associer des codes.', 'Create an offer first to attach codes.')}
        />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
          <section className="card p-5 md:p-6">
            <Select label={t('Offre concernée', 'Target offer')} value={currentRewardId} onChange={(e) => setRewardId(e.target.value)}>
              {offers.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.title} ({o.remainingStock}/{o.totalStock})
                </option>
              ))}
            </Select>

            <SegmentedTabs<Source>
              ariaLabel={t('Source des codes', 'Code source')}
              value={source}
              onChange={setSource}
              className="mb-4"
              options={[
                { value: 'CSV', label: t('Fichier CSV', 'CSV file') },
                { value: 'MANUAL', label: t('Saisie manuelle', 'Manual entry') },
              ]}
            />

            {source === 'CSV' ? (
              <div className="mb-3">
                <label
                  htmlFor="csv-file"
                  className="flex cursor-pointer flex-col items-center gap-1.5 rounded-[20px] border-2 border-dashed border-line bg-surface-elevated px-4 py-8 text-center transition-colors hover:border-sun hover:bg-sun-chip"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    void onFile(e.dataTransfer.files?.[0]);
                  }}
                >
                  <span aria-hidden className="mb-1 flex h-12 w-12 items-center justify-center rounded-full bg-sun text-on-sun">
                    <Icon name="document" size={22} />
                  </span>
                  <span className="text-body font-semibold">
                    {fileName || t('Déposez un fichier CSV ou cliquez', 'Drop a CSV file or click')}
                  </span>
                  <span className="text-caption text-fg-muted">
                    {t('Un code par ligne (en-tête « code » accepté) · 1 Mo max', 'One code per line (“code” header allowed) · 1 MB max')}
                  </span>
                </label>
                <input
                  ref={fileRef}
                  id="csv-file"
                  type="file"
                  accept=".csv,.txt,text/csv,text/plain"
                  className="sr-only"
                  onChange={(e) => void onFile(e.target.files?.[0])}
                />
              </div>
            ) : (
              <Textarea
                label={t('Codes (un par ligne, ou séparés par virgule)', 'Codes (one per line, or comma-separated)')}
                value={manual}
                onChange={(e) => setManual(e.target.value)}
                rows={8}
                className="font-mono"
                placeholder={'BOULANGE-0001\nBOULANGE-0002'}
              />
            )}

            <Button onClick={handleUpload} loading={isLoading} disabled={parsed.valid.length === 0}>
              {t(`Injecter ${parsed.valid.length} code(s)`, `Upload ${parsed.valid.length} code(s)`)}
            </Button>
            {feedback ? (
              <Alert tone={feedback.tone} className="mt-3">
                {feedback.text}
              </Alert>
            ) : null}
          </section>

          <aside className="card p-5 md:p-6" aria-labelledby="preview-title">
            <h2 id="preview-title" className="mb-3 text-subtitle font-bold">
              {t('Contrôle avant envoi', 'Pre-upload check')}
            </h2>
            <dl className="mb-3 grid grid-cols-3 gap-2 text-center">
              {[
                [t('Valides', 'Valid'), parsed.valid.length],
                [t('Doublons', 'Duplicates'), parsed.duplicates],
                [t('Rejetés', 'Rejected'), parsed.invalid.length],
              ].map(([label, value], index) => (
                <div
                  key={String(label)}
                  className={`flex flex-col-reverse rounded-[16px] px-2 py-3 ${['bg-mint', 'bg-sun-chip', 'bg-peach'][index]}`}
                >
                  <dt className="text-caption font-medium text-fg-secondary">{label}</dt>
                  <dd className="text-heading font-bold tabular">{value}</dd>
                </div>
              ))}
            </dl>
            {parsed.valid.length > 0 ? (
              <ul className="max-h-60 overflow-auto rounded-[16px] bg-surface-elevated p-1.5 font-mono text-caption">
                {parsed.valid.slice(0, 50).map((code) => (
                  <li key={code} className="rounded-[10px] px-3 py-1.5 hover:bg-surface">
                    {code}
                  </li>
                ))}
                {parsed.valid.length > 50 ? (
                  <li className="px-3 py-1.5 text-fg-muted">+ {parsed.valid.length - 50}…</li>
                ) : null}
              </ul>
            ) : (
              <p className="rounded-[16px] bg-surface-elevated px-4 py-5 text-center text-caption text-fg-muted">
                {t('Aucun code détecté.', 'No code detected.')}
              </p>
            )}
            {parsed.invalid.length > 0 ? (
              <p className="mt-3 rounded-[12px] bg-peach px-3 py-2 text-caption font-medium text-terracotta">
                {t('Rejetés (3 à 64 caractères alphanumériques, - ou _) : ', 'Rejected (3–64 alphanumeric, - or _): ')}
                {parsed.invalid.slice(0, 5).join(', ')}
                {parsed.invalid.length > 5 ? '…' : ''}
              </p>
            ) : null}
          </aside>
        </div>
      )}
    </div>
  );
}
