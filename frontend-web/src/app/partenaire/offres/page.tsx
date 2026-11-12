'use client';

import React, { useState } from 'react';
import { PartnerSwitcher, usePartnerSelection } from '@/components/partner/PartnerSelection';
import Button, { LinkButton } from '@/components/ui/Button';
import Icon from '@/components/ui/Icon';
import Input from '@/components/ui/Input';
import { Loader } from '@/components/ui/Loader';
import { Alert, Badge, PageHeader } from '@/components/ui/Misc';
import { getErrorMessage } from '@/store/api/baseApi';
import { useCreateOfferMutation, useCreatePartnerMutation } from '@/store/api/partnersApi';
import { useAppTheme } from '@/theme/ThemeProvider';

export default function PartnerOffersPage() {
  const { t } = useAppTheme();
  const { selected, selectedId, setSelectedId, partners, isLoading } = usePartnerSelection();
  const [createOffer, { isLoading: creating }] = useCreateOfferMutation();
  const [createPartner, { isLoading: creatingPartner }] = useCreatePartnerMutation();

  const [title, setTitle] = useState('');
  const [cost, setCost] = useState('100');
  const [stock, setStock] = useState('100');
  const [expiresAt, setExpiresAt] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [businessName, setBusinessName] = useState('');

  const minDate = new Date().toISOString().slice(0, 10);

  const validate = () => {
    const e: Record<string, string> = {};
    if (title.trim().length < 3) e.title = t('3 caractères minimum.', 'At least 3 characters.');
    const c = Number(cost);
    if (!Number.isInteger(c) || c < 10) e.cost = t('Nombre entier ≥ 10 points.', 'Whole number ≥ 10 points.');
    const s = Number(stock);
    if (!Number.isInteger(s) || s < 1 || s > 100000) e.stock = t('Entre 1 et 100 000.', 'Between 1 and 100,000.');
    if (expiresAt && expiresAt < minDate) e.expiresAt = t('La date doit être future.', 'Date must be in the future.');
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    if (!selectedId || !validate()) return;
    try {
      const res = await createOffer({
        partnerId: selectedId,
        title: title.trim(),
        costInPoints: Number(cost),
        totalStock: Number(stock),
        ...(expiresAt ? { expiresAt: new Date(`${expiresAt}T23:59:59`).toISOString() } : {}),
      }).unwrap();
      setFeedback({
        tone: 'success',
        text: t(
          `Offre « ${res.data.offer.title} » publiée. Ajoutez maintenant vos codes promo uniques.`,
          `Offer “${res.data.offer.title}” published. Now add your unique promo codes.`
        ),
      });
      setTitle('');
    } catch (err) {
      setFeedback({ tone: 'error', text: getErrorMessage(err, t('Création impossible.', 'Creation failed.')) });
    }
  };

  const handleCreateBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    if (businessName.trim().length < 2) return;
    try {
      const res = await createPartner({ name: businessName.trim() }).unwrap();
      setSelectedId(res.data.partner.id);
      setBusinessName('');
    } catch (err) {
      setFeedback({ tone: 'error', text: getErrorMessage(err, t('Création impossible.', 'Creation failed.')) });
    }
  };

  if (isLoading) return <Loader skeletonRows={3} />;

  return (
    <div>
      <PageHeader
        eyebrow={selected?.name}
        title={t('Mes offres', 'My offers')}
        subtitle={t(
          'Créez un lot échangeable contre des EtherPoints dans la boutique citoyenne.',
          'Create a perk residents can redeem with EtherPoints in the citizen shop.'
        )}
        actions={<PartnerSwitcher />}
      />

      {feedback ? (
        <Alert tone={feedback.tone} className="mb-4">
          {feedback.text}
          {feedback.tone === 'success' ? (
            <div className="mt-2 max-w-56">
              <LinkButton href="/partenaire/codes" size="sm">
                {t('Ajouter des codes', 'Add codes')}
              </LinkButton>
            </div>
          ) : null}
        </Alert>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
        {partners.length === 0 ? (
          <form className="card p-5 md:p-6" onSubmit={handleCreateBusiness}>
            <span aria-hidden className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-peach text-terracotta">
              <Icon name="bag" size={20} />
            </span>
            <h2 className="mb-1 text-heading font-bold">{t('Créer mon établissement', 'Create my business')}</h2>
            <p className="mb-3 text-caption text-fg-secondary">
              {t('La Mairie peut suspendre une fiche à tout moment.', 'City Hall can suspend a profile at any time.')}
            </p>
            <Input
              label={t('Nom du commerce', 'Business name')}
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="La Boulangerie du Port"
            />
            <Button type="submit" loading={creatingPartner}>
              {t('Créer', 'Create')}
            </Button>
          </form>
        ) : (
          <form className="card p-5 md:p-6" onSubmit={handleCreate} noValidate>
            <div className="mb-4 flex items-center gap-3">
              <span aria-hidden className="flex h-10 w-10 items-center justify-center rounded-full bg-sun-chip text-on-sun dark:text-sun">
                <Icon name="gift" size={20} />
              </span>
              <h2 className="text-heading font-bold">{t('Nouvelle offre', 'New offer')}</h2>
            </div>
            <Input
              label={t("Titre de l'offre", 'Offer title')}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('-15 % sur les viennoiseries', '15% off pastries')}
              maxLength={120}
              errorText={errors.title}
            />
            <div className="grid gap-x-3 sm:grid-cols-2">
              <Input
                label={t('Coût en EtherPoints', 'Cost in EtherPoints')}
                type="number"
                min={10}
                step={10}
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                errorText={errors.cost}
              />
              <Input
                label={t('Nombre de codes (stock)', 'Number of codes (stock)')}
                type="number"
                min={1}
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                errorText={errors.stock}
                hint={t('Les codes uploadés s’ajoutent à ce stock.', 'Uploaded codes are added to this stock.')}
              />
            </div>
            <Input
              label={t("Date d'expiration (optionnel)", 'Expiry date (optional)')}
              type="date"
              min={minDate}
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              errorText={errors.expiresAt}
            />
            <Button type="submit" loading={creating} disabled={!selectedId}>
              {t("Publier l'offre", 'Publish offer')}
            </Button>
          </form>
        )}

        <section className="card p-5 md:p-6" aria-labelledby="current-offers">
          <h2 id="current-offers" className="mb-4 text-heading font-bold">
            {t('Offres publiées', 'Published offers')}
          </h2>
          {!selected || selected.rewards.length === 0 ? (
            <p className="rounded-[16px] bg-surface-elevated px-4 py-5 text-center text-caption text-fg-muted">
              {t('Aucune offre pour le moment.', 'No offer yet.')}
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {selected.rewards.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 rounded-[16px] bg-surface-elevated px-3.5 py-3">
                  <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface text-violet">
                    <Icon name="giftTicket" size={20} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body font-semibold">{r.title}</p>
                    <p className="text-caption text-fg-muted tabular">
                      {t(`${r.remainingStock}/${r.totalStock} en stock`, `${r.remainingStock}/${r.totalStock} in stock`)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {!r.isActive ? <Badge tone="danger">{t('Inactive', 'Inactive')}</Badge> : null}
                    <Badge tone="secondary">{r.costInPoints} pts</Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
