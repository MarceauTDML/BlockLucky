'use client';

import React, { useState } from 'react';
import { usePartnerSelection } from '@/components/partner/PartnerSelection';
import Button from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';
import Input from '@/components/ui/Input';
import { Alert, PageHeader } from '@/components/ui/Misc';
import { formatDateShort } from '@/lib/date';
import { getErrorMessage } from '@/store/api/baseApi';
import { useRedeemCodeMutation } from '@/store/api/marketplaceApi';
import { useAppTheme } from '@/theme/ThemeProvider';
import { RedeemCodeResponse } from '@/types/partner.types';

export default function PartnerRedeemPage() {
  const { t } = useAppTheme();
  const { selected } = usePartnerSelection();
  const [redeem, { isLoading }] = useRedeemCodeMutation();
  const [code, setCode] = useState('');
  const [result, setResult] = useState<RedeemCodeResponse | null>(null);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<RedeemCodeResponse[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResult(null);
    const value = code.trim();
    if (value.length < 4) {
      setError(t('Code trop court.', 'Code too short.'));
      return;
    }
    try {
      const res = await redeem({ uniqueCode: value }).unwrap();
      setResult(res.data);
      setHistory((h) => [res.data, ...h].slice(0, 10));
      setCode('');
    } catch (err) {
      setError(getErrorMessage(err, t('Code invalide ou déjà utilisé.', 'Invalid or already used code.')));
    }
  };

  const foreignPartner = result && selected && result.partnerName !== selected.name;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        eyebrow={selected?.name}
        title={t('Validation en caisse', 'In-store redemption')}
        subtitle={t(
          'Saisissez ou scannez le code présenté par le client pour le marquer comme utilisé.',
          'Enter or scan the code shown by the customer to mark it as used.'
        )}
      />

      <div className="grid gap-5 md:grid-cols-[1.2fr_1fr]">
        <form className="card p-5 md:p-6" onSubmit={handleSubmit} noValidate>
          <div className="mb-4 flex items-center gap-3">
            <span aria-hidden className="flex h-10 w-10 items-center justify-center rounded-full bg-sun-chip text-on-sun dark:text-sun">
              <Icon name="giftTicket" size={20} />
            </span>
            <p className="text-subtitle font-bold">{t('Code promo', 'Promo code')}</p>
          </div>
          <Input
            label={t('Code promo', 'Promo code')}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            placeholder="BOULANGE-4F2A91C3"
            className="font-mono text-subtitle tracking-wider"
            errorText={error}
          />
          <Button type="submit" loading={isLoading}>
            {t('Valider le code', 'Redeem code')}
          </Button>

          {result ? (
            <div className="mt-4 flex items-start gap-3 rounded-[20px] bg-mint p-4" role="status">
              <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface text-green">
                <Icon name="check" size={20} />
              </span>
              <div className="min-w-0">
                <p className="text-caption font-semibold text-green">{t('Code valide — avantage accordé', 'Valid code — perk granted')}</p>
                <p className="mt-1 text-subtitle font-bold">{result.rewardTitle}</p>
                <p className="font-mono text-caption text-fg-secondary">{result.uniqueCode}</p>
                {foreignPartner ? (
                  <p className="mt-2 rounded-[12px] bg-peach px-3 py-2 text-caption font-medium text-terracotta">
                  {t(
                    `Attention : ce code appartient à « ${result.partnerName} ».`,
                    `Warning: this code belongs to “${result.partnerName}”.`
                  )}
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}
        </form>

        <section className="card p-5 md:p-6" aria-labelledby="session-title">
          <h2 id="session-title" className="mb-3 text-subtitle font-bold">
            {t('Validés pendant cette session', 'Redeemed this session')}
          </h2>
          {history.length === 0 ? (
            <p className="rounded-[16px] bg-surface-elevated px-4 py-5 text-center text-caption text-fg-muted">
              {t('Aucun code validé.', 'No code redeemed.')}
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {history.map((h) => (
                <li key={h.uniqueCode} className="flex items-center gap-3 rounded-[16px] bg-surface-elevated px-3.5 py-3">
                  <span aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-mint text-green">
                    <Icon name="check" size={16} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-mono text-caption font-semibold">{h.uniqueCode}</p>
                    <p className="text-caption text-fg-muted">
                      {h.rewardTitle} · {formatDateShort(h.usedAt)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <Alert tone="info" className="mt-4">
            {t(
              'Chaque code ne peut être utilisé qu’une seule fois. En cas de litige, contactez la Mairie.',
              'Each code can only be used once. In case of dispute, contact City Hall.'
            )}
          </Alert>
        </section>
      </div>
    </div>
  );
}
