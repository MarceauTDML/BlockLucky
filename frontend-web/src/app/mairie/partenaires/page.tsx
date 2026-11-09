'use client';

import React, { useState } from 'react';
import Button from '@/components/ui/Button';
import { Loader } from '@/components/ui/Loader';
import { Alert, Badge, EmptyState, PageHeader } from '@/components/ui/Misc';
import Sheet from '@/components/ui/Sheet';
import { formatDateShort } from '@/lib/date';
import { useSetPartnerStatusMutation } from '@/store/api/adminApi';
import { getErrorMessage } from '@/store/api/baseApi';
import { useGetPartnersQuery } from '@/store/api/partnersApi';
import { useAppTheme } from '@/theme/ThemeProvider';
import { PartnerWithRewards } from '@/types/partner.types';

export default function AdminPartnersPage() {
  const { t } = useAppTheme();
  const { data, isLoading, isError } = useGetPartnersQuery();
  const [setStatus, { isLoading: saving }] = useSetPartnerStatusMutation();
  const [target, setTarget] = useState<PartnerWithRewards | null>(null);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const partners = data?.data?.partners ?? [];

  const confirmToggle = async () => {
    if (!target) return;
    const next = !target.isActive;
    try {
      await setStatus({ partnerId: target.id, isActive: next }).unwrap();
      setFeedback({
        tone: 'success',
        text: next
          ? t(`${target.name} est de nouveau visible dans la boutique.`, `${target.name} is visible in the shop again.`)
          : t(`${target.name} est suspendu : ses offres sont masquées.`, `${target.name} is suspended: its offers are hidden.`),
      });
    } catch (err) {
      setFeedback({ tone: 'error', text: getErrorMessage(err, t('Action impossible.', 'Action failed.')) });
    } finally {
      setTarget(null);
    }
  };

  return (
    <div>
      <PageHeader
        title={t('Commerces partenaires', 'Partner businesses')}
        subtitle={t(
          'Validez ou suspendez la visibilité des partenaires dans la boutique citoyenne. Chaque action est tracée.',
          'Approve or suspend partner visibility in the citizen shop. Every action is logged.'
        )}
      />
      {feedback ? (
        <Alert tone={feedback.tone} className="mb-4">
          {feedback.text}
        </Alert>
      ) : null}

      {isLoading ? (
        <Loader skeletonRows={3} />
      ) : isError ? (
        <Alert tone="error">{t('Liste des partenaires indisponible.', 'Partner list unavailable.')}</Alert>
      ) : partners.length === 0 ? (
        <EmptyState title={t('Aucun partenaire', 'No partners')} />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {partners.map((p) => {
            const claimed = p.rewards.reduce((s, r) => s + (r._count?.claimedRewards ?? 0), 0);
            const stock = p.rewards.reduce((s, r) => s + r.remainingStock, 0);
            return (
              <li key={p.id} className="card flex flex-col gap-3 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-surface-elevated text-caption font-bold text-primary">
                    {p.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-body font-bold">{p.name}</h2>
                    <p className="text-caption text-fg-muted">
                      {t('Inscrit le', 'Joined')} {formatDateShort(p.createdAt)}
                    </p>
                  </div>
                  <Badge tone={p.isActive ? 'primary' : 'danger'}>
                    {p.isActive ? t('Actif', 'Active') : t('Suspendu', 'Suspended')}
                  </Badge>
                </div>
                <dl className="grid grid-cols-3 gap-2 text-center">
                  {[
                    [t('Offres', 'Offers'), p.rewards.length],
                    [t('Réclamées', 'Claimed'), claimed],
                    [t('Stock', 'Stock'), stock],
                  ].map(([label, value]) => (
                    <div key={String(label)} className="rounded-md bg-surface-elevated py-2">
                      <dt className="text-caption text-fg-muted">{label}</dt>
                      <dd className="text-body font-bold tabular">{value}</dd>
                    </div>
                  ))}
                </dl>
                <Button
                  size="sm"
                  variant={p.isActive ? 'outline' : 'primary'}
                  onClick={() => setTarget(p)}
                >
                  {p.isActive ? t('Suspendre', 'Suspend') : t('Réactiver', 'Reactivate')}
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      <Sheet
        open={Boolean(target)}
        tone={target?.isActive ? 'danger' : 'default'}
        title={
          target?.isActive
            ? t(`Suspendre ${target?.name} ?`, `Suspend ${target?.name}?`)
            : t(`Réactiver ${target?.name} ?`, `Reactivate ${target?.name}?`)
        }
        onClose={() => setTarget(null)}
      >
        <div className="flex flex-col gap-3 pb-2">
          <p className="text-body text-fg-secondary">
            {target?.isActive
              ? t(
                  'Ses offres disparaîtront immédiatement de la boutique. Les codes déjà obtenus restent valables.',
                  'Its offers will disappear from the shop immediately. Codes already claimed remain valid.'
                )
              : t('Ses offres actives seront à nouveau proposées aux habitants.', 'Its active offers will be shown to residents again.')}
          </p>
          <Button variant={target?.isActive ? 'danger' : 'primary'} onClick={confirmToggle} loading={saving}>
            {t('Confirmer', 'Confirm')}
          </Button>
          <Button variant="outline" onClick={() => setTarget(null)}>
            {t('Annuler', 'Cancel')}
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
