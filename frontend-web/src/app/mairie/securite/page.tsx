'use client';

import React, { useState } from 'react';
import Button from '@/components/ui/Button';
import Input, { Textarea } from '@/components/ui/Input';
import { Loader } from '@/components/ui/Loader';
import { Alert, Badge, PageHeader, StatusDot } from '@/components/ui/Misc';
import Sheet from '@/components/ui/Sheet';
import { shortenHash } from '@/lib/formatters';
import {
  useGetAdminDashboardQuery,
  useToggleCircuitBreakerMutation,
  useWithdrawTreasuryMutation,
} from '@/store/api/adminApi';
import { getErrorMessage } from '@/store/api/baseApi';
import { useGetLotteryStatusQuery, useRefundRoundMutation, useTriggerDrawMutation } from '@/store/api/lotteryApi';
import { useAppTheme } from '@/theme/ThemeProvider';

type Feedback = { tone: 'success' | 'error'; text: string } | null;
const CONFIRM_WORD = 'PAUSE';

export default function SecurityAdminPage() {
  const { t } = useAppTheme();
  const { data, isLoading } = useGetAdminDashboardQuery();
  const { data: statusRes } = useGetLotteryStatusQuery();
  const [toggleBreaker, { isLoading: toggling }] = useToggleCircuitBreakerMutation();
  const [withdraw, { isLoading: withdrawing }] = useWithdrawTreasuryMutation();
  const [triggerDraw, { isLoading: drawing }] = useTriggerDrawMutation();
  const [refundRound, { isLoading: refunding }] = useRefundRoundMutation();

  const network = data?.data?.network;
  const isPaused = Boolean(network?.isPaused);
  const revenue = data?.data?.kpis.municipalityRevenueEth ?? 0;
  const round = statusRes?.data?.round;

  const [breakerOpen, setBreakerOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [confirmWord, setConfirmWord] = useState('');
  const [breakerFb, setBreakerFb] = useState<Feedback>(null);

  const [wallet, setWallet] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [withdrawConfirm, setWithdrawConfirm] = useState(false);
  const [treasuryFb, setTreasuryFb] = useState<Feedback>(null);
  const [treasuryErrors, setTreasuryErrors] = useState<{ wallet?: string; amount?: string }>({});

  const [drawAction, setDrawAction] = useState<'draw' | 'refund' | null>(null);
  const [drawFb, setDrawFb] = useState<Feedback>(null);

  const submitBreaker = async () => {
    try {
      const res = await toggleBreaker({
        paused: !isPaused,
        ...(reason.trim().length >= 5 ? { reason: reason.trim() } : {}),
      }).unwrap();
      setBreakerFb({
        tone: 'success',
        text: res.data.paused
          ? t(`Smart Contract mis en pause (tx ${shortenHash(res.data.txHash)}).`, `Smart Contract paused (tx ${shortenHash(res.data.txHash)}).`)
          : t(`Participations rouvertes (tx ${shortenHash(res.data.txHash)}).`, `Entries reopened (tx ${shortenHash(res.data.txHash)}).`),
      });
    } catch (err) {
      setBreakerFb({ tone: 'error', text: getErrorMessage(err, t('Action refusée.', 'Action refused.')) });
    } finally {
      setBreakerOpen(false);
      setConfirmWord('');
      setReason('');
    }
  };

  const validateTreasury = () => {
    const errors: { wallet?: string; amount?: string } = {};
    if (!/^0x[a-fA-F0-9]{40}$/.test(wallet.trim())) {
      errors.wallet = t('Adresse multisig invalide (0x + 40 caractères hexadécimaux).', 'Invalid multisig address (0x + 40 hex chars).');
    }
    const value = Number(amount.replace(',', '.'));
    if (!Number.isFinite(value) || value <= 0) {
      errors.amount = t('Montant strictement positif requis.', 'Amount must be greater than zero.');
    } else if (value > revenue) {
      errors.amount = t(
        `Le montant dépasse la part Mairie disponible (${revenue.toFixed(4)} ETH).`,
        `Amount exceeds the available city share (${revenue.toFixed(4)} ETH).`
      );
    }
    setTreasuryErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const submitWithdraw = async () => {
    setWithdrawConfirm(false);
    try {
      const res = await withdraw({
        multisigWallet: wallet.trim(),
        amountEth: Number(amount.replace(',', '.')),
        ...(note.trim() ? { note: note.trim() } : {}),
      }).unwrap();
      setTreasuryFb({
        tone: 'success',
        text: t(
          `Retrait de ${res.data.amountEth} ETH initié vers ${shortenHash(res.data.multisigWallet, 4)} (tx ${shortenHash(res.data.transactionHash)}).`,
          `Withdrawal of ${res.data.amountEth} ETH sent to ${shortenHash(res.data.multisigWallet, 4)} (tx ${shortenHash(res.data.transactionHash)}).`
        ),
      });
      setAmount('');
      setNote('');
    } catch (err) {
      setTreasuryFb({ tone: 'error', text: getErrorMessage(err, t('Retrait refusé.', 'Withdrawal refused.')) });
    }
  };

  const submitDrawAction = async () => {
    const action = drawAction;
    setDrawAction(null);
    try {
      if (action === 'draw') {
        const res = await triggerDraw({ roundId: round?.id }).unwrap();
        setDrawFb({
          tone: 'success',
          text: t(
            `Tirage #${res.data.round.contractRoundId} effectué. Gagnant : ${shortenHash(res.data.round.winnerWallet, 4)} — preuve VRF ${shortenHash(res.data.vrfProof.vrfProofHash)}.`,
            `Draw #${res.data.round.contractRoundId} completed. Winner: ${shortenHash(res.data.round.winnerWallet, 4)} — VRF proof ${shortenHash(res.data.vrfProof.vrfProofHash)}.`
          ),
        });
      } else if (action === 'refund') {
        const res = await refundRound({ roundId: round?.id }).unwrap();
        setDrawFb({
          tone: 'success',
          text: t(
            `Tirage annulé : ${res.data.refundedAmountEth} ETH remboursés automatiquement.`,
            `Draw cancelled: ${res.data.refundedAmountEth} ETH refunded automatically.`
          ),
        });
      }
    } catch (err) {
      setDrawFb({ tone: 'error', text: getErrorMessage(err, t('Opération impossible.', 'Operation failed.')) });
    }
  };

  if (isLoading) return <Loader skeletonRows={3} />;

  return (
    <div>
      <PageHeader
        title={t('Sécurité & trésorerie', 'Security & treasury')}
        subtitle={t(
          'Actions sensibles sur le Smart Contract. Chaque opération est confirmée puis inscrite au journal d’audit.',
          'Sensitive Smart Contract actions. Each one is confirmed then written to the audit log.'
        )}
      />

      <div className="grid gap-5 lg:grid-cols-2">
        {}
        <section
          className={`flex flex-col gap-3 rounded-lg border bg-surface p-5 ${isPaused ? 'border-error' : 'border-line'}`}
          aria-labelledby="breaker-title"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-caption font-semibold text-error">{t("Interrupteur d'urgence", 'Emergency switch')}</p>
              <h2 id="breaker-title" className="text-subtitle font-bold">Circuit Breaker</h2>
            </div>
            <Badge tone={isPaused ? 'danger' : 'primary'}>
              <StatusDot tone={isPaused ? 'error' : 'success'} className="mr-1.5" />
              {isPaused ? t('Contrat en pause', 'Contract paused') : t('Contrat actif', 'Contract live')}
            </Badge>
          </div>
          <p className="text-caption text-fg-secondary">
            {t(
              "En cas de piratage ou d'incident, la pause bloque immédiatement tout nouvel achat de ticket. Les fonds restent protégés et remboursables.",
              'In case of attack or incident, pausing immediately blocks any new ticket purchase. Funds remain protected and refundable.'
            )}
          </p>
          <p className="break-all font-mono text-caption text-fg-muted">
            {t('Contrat : ', 'Contract: ')}
            {network?.contractAddress || '—'}
          </p>
          {breakerFb ? <Alert tone={breakerFb.tone}>{breakerFb.text}</Alert> : null}
          <Button variant={isPaused ? 'primary' : 'danger'} onClick={() => setBreakerOpen(true)} loading={toggling}>
            {isPaused ? t('Réactiver les participations', 'Resume entries') : t('Mettre le Smart Contract en pause', 'Pause the Smart Contract')}
          </Button>
        </section>

        {}
        <section className="card flex flex-col gap-3 p-5" aria-labelledby="draw-title">
          <div>
            <p className="text-caption font-semibold text-secondary">Chainlink VRF</p>
            <h2 id="draw-title" className="text-subtitle font-bold">
              {t('Tirage en cours', 'Current draw')} {round ? `#${round.contractRoundId}` : ''}
            </h2>
          </div>
          <p className="text-caption text-fg-secondary">
            {round
              ? t(
                  `Statut : ${round.status} · cagnotte ${round.prizePool.toFixed(2)} ETH fictifs · ${statusRes?.data?.progression.ticketsSold ?? 0} tickets.`,
                  `Status: ${round.status} · prize pool ${round.prizePool.toFixed(2)} test ETH · ${statusRes?.data?.progression.ticketsSold ?? 0} tickets.`
                )
              : t('Aucun tirage ouvert.', 'No open draw.')}
          </p>
          {drawFb ? <Alert tone={drawFb.tone}>{drawFb.text}</Alert> : null}
          <div className="grid gap-2.5 sm:grid-cols-2">
            <Button onClick={() => setDrawAction('draw')} loading={drawing} disabled={!round || round.status !== 'OPEN'}>
              {t('Lancer le tirage VRF', 'Run VRF draw')}
            </Button>
            <Button
              variant="outline"
              onClick={() => setDrawAction('refund')}
              loading={refunding}
              disabled={!round || round.status === 'COMPLETED' || round.status === 'CANCELLED'}
            >
              {t('Annuler et rembourser', 'Cancel and refund')}
            </Button>
          </div>
        </section>

        {}
        <section className="card flex flex-col gap-1 p-5 lg:col-span-2" aria-labelledby="treasury-title">
          <p className="text-caption font-semibold text-secondary">{t('Trésorerie', 'Treasury')}</p>
          <h2 id="treasury-title" className="text-subtitle font-bold">
            {t('Retrait vers le portefeuille multi-signatures', 'Withdraw to multisig wallet')}
          </h2>
          <p className="mb-3 text-caption text-fg-secondary">
            {t(
              `Part Mairie disponible : ${revenue.toFixed(4)} ETH fictifs. Le retrait exige les signatures du multisig municipal.`,
              `Available city share: ${revenue.toFixed(4)} test ETH. Withdrawal requires the municipal multisig signatures.`
            )}
          </p>
          {treasuryFb ? <Alert tone={treasuryFb.tone} className="mb-3">{treasuryFb.text}</Alert> : null}
          <form
            className="grid gap-x-4 md:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              setTreasuryFb(null);
              if (validateTreasury()) setWithdrawConfirm(true);
            }}
            noValidate
          >
            <Input
              label={t('Adresse multisig', 'Multisig address')}
              value={wallet}
              onChange={(e) => setWallet(e.target.value)}
              placeholder="0x…"
              autoComplete="off"
              spellCheck={false}
              errorText={treasuryErrors.wallet}
              className="font-mono"
            />
            <Input
              label={t('Montant (ETH fictifs)', 'Amount (test ETH)')}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
              placeholder="0.10"
              errorText={treasuryErrors.amount}
            />
            <div className="md:col-span-2">
              <Textarea
                label={t('Note comptable (optionnel)', 'Accounting note (optional)')}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                maxLength={200}
              />
            </div>
            <div className="md:col-span-2 md:max-w-xs">
              <Button type="submit" variant="secondary" loading={withdrawing}>
                {t('Préparer le retrait', 'Prepare withdrawal')}
              </Button>
            </div>
          </form>
        </section>
      </div>

      {}
      <Sheet
        open={breakerOpen}
        tone={isPaused ? 'default' : 'danger'}
        eyebrow={t('Action de sécurité', 'Security action')}
        title={isPaused ? t('Rouvrir les participations ?', 'Reopen entries?') : t('Mettre le contrat en pause ?', 'Pause the contract?')}
        onClose={() => setBreakerOpen(false)}
      >
        <div className="flex flex-col gap-3 pb-2">
          <p className="text-body text-fg-secondary">
            {isPaused
              ? t('Les habitants pourront à nouveau acheter des tickets.', 'Residents will be able to buy tickets again.')
              : t(
                  'Tous les achats seront bloqués jusqu’à réactivation. Les habitants verront un message de suspension.',
                  'All purchases will be blocked until resumed. Residents will see a suspension notice.'
                )}
          </p>
          <Textarea
            label={t('Motif (journal d’audit)', 'Reason (audit log)')}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            maxLength={200}
            hint={t('5 caractères minimum, sinon motif par défaut.', 'At least 5 characters, otherwise a default reason is used.')}
          />
          {!isPaused ? (
            <Input
              label={t(`Tapez ${CONFIRM_WORD} pour confirmer`, `Type ${CONFIRM_WORD} to confirm`)}
              value={confirmWord}
              onChange={(e) => setConfirmWord(e.target.value)}
              autoComplete="off"
            />
          ) : null}
          <Button
            variant={isPaused ? 'primary' : 'danger'}
            onClick={submitBreaker}
            loading={toggling}
            disabled={!isPaused && confirmWord.trim().toUpperCase() !== CONFIRM_WORD}
          >
            {isPaused ? t('Réactiver', 'Resume') : t('Confirmer la pause', 'Confirm pause')}
          </Button>
          <Button variant="outline" onClick={() => setBreakerOpen(false)}>
            {t('Annuler', 'Cancel')}
          </Button>
        </div>
      </Sheet>

      <Sheet
        open={withdrawConfirm}
        tone="danger"
        title={t('Confirmer le retrait', 'Confirm withdrawal')}
        onClose={() => setWithdrawConfirm(false)}
      >
        <div className="flex flex-col gap-3 pb-2">
          <dl className="flex flex-col gap-1.5 rounded-md bg-surface-elevated p-3 text-small">
            <div className="flex justify-between gap-3">
              <dt className="text-fg-secondary">{t('Montant', 'Amount')}</dt>
              <dd className="font-semibold tabular">{amount} ETH</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-fg-secondary">{t('Destinataire', 'Recipient')}</dt>
              <dd className="font-mono">{shortenHash(wallet, 6)}</dd>
            </div>
          </dl>
          <Button variant="danger" onClick={submitWithdraw} loading={withdrawing}>
            {t('Signer et envoyer', 'Sign and send')}
          </Button>
          <Button variant="outline" onClick={() => setWithdrawConfirm(false)}>
            {t('Annuler', 'Cancel')}
          </Button>
        </div>
      </Sheet>

      <Sheet
        open={Boolean(drawAction)}
        tone={drawAction === 'refund' ? 'danger' : 'default'}
        title={
          drawAction === 'draw'
            ? t('Lancer le tirage maintenant ?', 'Run the draw now?')
            : t('Annuler le tirage et rembourser ?', 'Cancel the draw and refund?')
        }
        onClose={() => setDrawAction(null)}
      >
        <div className="flex flex-col gap-3 pb-2">
          <p className="text-body text-fg-secondary">
            {drawAction === 'draw'
              ? t(
                  'Chainlink VRF désignera un gagnant parmi les tickets. Le résultat est définitif et diffusé en direct.',
                  'Chainlink VRF will pick a winner among tickets. The result is final and broadcast live.'
                )
              : t(
                  'Toutes les participations de ce tirage seront remboursées automatiquement. Action irréversible.',
                  'All entries for this draw will be refunded automatically. Irreversible.'
                )}
          </p>
          <Button variant={drawAction === 'refund' ? 'danger' : 'primary'} onClick={submitDrawAction}>
            {t('Confirmer', 'Confirm')}
          </Button>
          <Button variant="outline" onClick={() => setDrawAction(null)}>
            {t('Annuler', 'Cancel')}
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
