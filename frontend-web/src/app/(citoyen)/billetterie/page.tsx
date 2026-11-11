'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import React, { Suspense, useState } from 'react';
import Button from '@/components/ui/Button';
import Input, { Textarea } from '@/components/ui/Input';
import { Loader } from '@/components/ui/Loader';
import { Alert, CheckboxCard, PageHeader } from '@/components/ui/Misc';
import { ChoicePills, SegmentedTabs } from '@/components/ui/SegmentedTabs';
import DemoModeBadge from '@/components/lottery/DemoModeBadge';
import WalletCard from '@/components/lottery/WalletCard';
import useAuth from '@/hooks/useAuth';
import useBlockLuckyWallet from '@/hooks/useBlockLuckyWallet';
import { GIFT_BONUS_POINTS, POINTS_PER_TICKET, TICKET_PRICE_ETH } from '@/lib/config';
import { formatDateShort } from '@/lib/date';
import { shortenHash } from '@/lib/formatters';
import { isValidEmail } from '@/lib/validators';
import { useGetLotteryStatusQuery } from '@/store/api/lotteryApi';
import { useAppTheme } from '@/theme/ThemeProvider';
import { BuyTicketResponse } from '@/types/api.types';

type Mode = 'SELF' | 'GIFT';
const QUANTITIES = [1, 2, 5, 10] as const;
type Receipt = { state: 'pending'; quantity: number } | { state: 'confirmed'; data: BuyTicketResponse } | null;

function TicketOfficeContent() {
  const { t } = useAppTheme();
  const params = useSearchParams();
  const { user } = useAuth();
  const { purchaseTicket, sendGiftTicket, isBuying, isGifting } = useBlockLuckyWallet();
  const { data: statusRes } = useGetLotteryStatusQuery();
  const round = statusRes?.data?.round;
  const isPaused = Boolean(statusRes?.data?.network?.isPaused);
  const isOpen = !round || round.status === 'OPEN';
  const simulated = Boolean(statusRes?.data?.guarantees?.simulated);
  const ticketPrice = round?.ticketPriceEth ?? TICKET_PRICE_ETH;

  const [mode, setMode] = useState<Mode>(params.get('mode') === 'cadeau' ? 'GIFT' : 'SELF');
  const [quantity, setQuantity] = useState<(typeof QUANTITIES)[number]>(1);
  const [understood, setUnderstood] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [personalMessage, setPersonalMessage] = useState(
    t("Je t'offre un ticket pour le prochain tirage d'EtherBay.", 'Here is a gift ticket for the upcoming EtherBay draw.')
  );
  const [receipt, setReceipt] = useState<Receipt>(null);
  const [feedback, setFeedback] = useState('');
  const [errorText, setErrorText] = useState('');

  const limit = user?.responsibleGaming?.maxTicketsPerRound;

  const handleBuyForSelf = async () => {
    if (isBuying || !understood) return;
    setFeedback('');
    setReceipt({ state: 'pending', quantity });
    const result = await purchaseTicket(quantity, 0);
    setReceipt(result ? { state: 'confirmed', data: result } : null);
  };

  const handleSendGift = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText('');
    setFeedback('');
    if (!isValidEmail(recipientEmail)) {
      setErrorText(t('Veuillez saisir une adresse email valide.', 'Please enter a valid email address.'));
      return;
    }
    const result = await sendGiftTicket(recipientEmail.trim(), personalMessage.slice(0, 250));
    if (result) {
      setFeedback(
        t(
          `Ticket envoyé à ${result.ticket.recipientEmail}. Vous avez reçu +${result.senderPointsAwarded} pts.`,
          `Gift ticket sent to ${result.ticket.recipientEmail}. You earned +${result.senderPointsAwarded} pts.`
        )
      );
      setRecipientEmail('');
    }
  };

  const total = String(Number((quantity * ticketPrice).toFixed(4)));

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title={t('Billetterie', 'Ticket Office')}
        subtitle={t(
          'Chaque achat est signé par votre portefeuille BlockLucky intégré. Les frais réseau sont prélevés sur votre dotation de bienvenue en ethers fictifs.',
          'Each purchase is signed by your integrated BlockLucky wallet. Network fees are taken from your test-ether welcome grant.'
        )}
        actions={<DemoModeBadge simulated={simulated} />}
      />

      <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <SegmentedTabs<Mode>
            ariaLabel={t('Type de participation', 'Entry type')}
            value={mode}
            onChange={setMode}
            options={[
              { value: 'SELF', label: t('Acheter pour moi', 'Buy for myself') },
              { value: 'GIFT', label: t('Offrir un ticket', 'Gift a ticket') },
            ]}
          />

          {!isOpen || isPaused ? (
            <Alert tone="warning" className="mb-3.5">
              {isPaused
                ? t('Participations suspendues temporairement par la Mairie.', 'Entries temporarily paused by City Hall.')
                : t('Participations fermées pour ce tirage.', 'Entries are closed for this draw.')}
            </Alert>
          ) : null}

          {mode === 'SELF' ? (
            <section className="card flex flex-col gap-3.5 p-[18px]" aria-labelledby="self-title">
              <div>
                <h2 id="self-title" className="text-subtitle font-semibold">
                  {t('Participation directe', 'Direct Entry')}
                </h2>
                <p className="text-caption text-fg-secondary">
                  {t(
                    `${ticketPrice} ETH fictif par ticket • +${POINTS_PER_TICKET} pts de fidélité par ticket`,
                    `${ticketPrice} test ETH per ticket • +${POINTS_PER_TICKET} loyalty pts per ticket`
                  )}
                </p>
              </div>

              <ChoicePills
                options={QUANTITIES}
                value={quantity}
                onChange={setQuantity}
                ariaLabel={t('Nombre de tickets', 'Number of tickets')}
                render={(n) => `${n}x`}
              />

              <div className="flex flex-col gap-1 rounded-md bg-surface-elevated p-3">
                <p className="text-caption text-fg-secondary tabular">
                  {t(
                    `Total : ${total} ETH fictif + frais réseau, prélevés sur votre portefeuille BlockLucky`,
                    `Total: ${total} test ETH + network fees, taken from your BlockLucky wallet`
                  )}
                </p>
                <p className="text-caption font-semibold text-secondary">
                  {t(
                    `Bonus : +${quantity * POINTS_PER_TICKET} pts + Certificat POAP`,
                    `Bonus: +${quantity * POINTS_PER_TICKET} pts + POAP Certificate`
                  )}
                </p>
                {limit ? (
                  <p className="text-caption text-fg-muted">
                    {t(
                      `Votre plafond personnel : ${limit} tickets par tirage.`,
                      `Your personal cap: ${limit} tickets per draw.`
                    )}{' '}
                    <Link href="/profil/securite" className="underline underline-offset-2 hover:text-fg">
                      {t('Modifier', 'Change')}
                    </Link>
                  </p>
                ) : null}
              </div>

              <CheckboxCard id="understood" checked={understood} onChange={setUnderstood}>
                {t(
                  "Je comprends que j'engage des ethers fictifs, sans valeur monétaire, dans un tirage pédagogique.",
                  'I understand I am using test ethers with no monetary value in an educational draw.'
                )}
              </CheckboxCard>

              <Button
                onClick={handleBuyForSelf}
                loading={isBuying}
                disabled={!understood || !isOpen || isPaused}
              >
                {t(
                  `Confirmer (${quantity} ticket${quantity > 1 ? 's' : ''})`,
                  `Confirm (${quantity} ticket${quantity > 1 ? 's' : ''})`
                )}
              </Button>
            </section>
          ) : (
            <form className="card flex flex-col gap-3.5 p-[18px]" onSubmit={handleSendGift} noValidate>
              <div>
                <h2 className="text-subtitle font-semibold">{t('Offrir un ticket à un proche', 'Send a Gift Ticket')}</h2>
                <p className="text-caption text-fg-secondary">
                  {t(
                    `Invitez un habitant majeur par email et recevez +${GIFT_BONUS_POINTS} pts de parrainage.`,
                    `Invite an adult resident by email and earn +${GIFT_BONUS_POINTS} referral pts.`
                  )}
                </p>
              </div>
              <div>
                <Input
                  label={t('Email du destinataire', 'Recipient email')}
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  autoComplete="off"
                  placeholder="ami@etherbay.fr"
                  errorText={errorText}
                />
                <Textarea
                  label={t('Message personnel', 'Personal message')}
                  value={personalMessage}
                  maxLength={250}
                  onChange={(e) => setPersonalMessage(e.target.value)}
                  hint={`${personalMessage.length}/250`}
                />
              </div>
              <Button type="submit" variant="secondary" loading={isGifting} disabled={!isOpen || isPaused}>
                {t(`Envoyer le ticket (+${GIFT_BONUS_POINTS} pts)`, `Send Gift Ticket (+${GIFT_BONUS_POINTS} pts)`)}
              </Button>
            </form>
          )}

          {feedback ? <Alert className="mt-4">{feedback}</Alert> : null}
        </div>

        {}
        <aside aria-live="polite" className="flex flex-col gap-3.5">
          <WalletCard />
          <section className="card p-[18px]">
            <p className="text-caption font-medium text-secondary">{t('Reçu de participation', 'Entry receipt')}</p>
            {receipt?.state === 'pending' ? (
              <div className="mt-2 flex flex-col gap-1.5">
                <p className="flex items-center gap-2 text-body font-bold">
                  <span className="h-2 w-2 rounded-full bg-warning animate-bl-shimmer" aria-hidden />
                  {t('Demande envoyée — en attente du réseau', 'Request sent — waiting for the network')}
                </p>
                <p className="text-caption text-fg-secondary">
                  {t(
                    `${receipt.quantity} ticket(s) en cours de validation. Ne fermez pas la page : un nouvel appui ne créera pas de doublon.`,
                    `${receipt.quantity} ticket(s) being validated. Keep this page open: pressing again will not create a duplicate.`
                  )}
                </p>
              </div>
            ) : receipt?.state === 'confirmed' ? (
              <div className="mt-2 flex flex-col gap-2">
                <p className="flex items-center gap-2 text-body font-bold text-primary">
                  <span className="h-2 w-2 rounded-full bg-success" aria-hidden />
                  {t(
                    `${receipt.data.tickets.length} ticket(s) confirmé(s) sur la blockchain`,
                    `${receipt.data.tickets.length} ticket(s) confirmed on-chain`
                  )}
                </p>
                <ul className="flex flex-col gap-1.5">
                  {receipt.data.tickets.map((tk) => (
                    <li key={tk.id} className="rounded-md bg-surface-elevated p-2.5 text-caption">
                      <p className="font-mono">{shortenHash(tk.transactionHash, 8)}</p>
                      <p className="text-fg-muted">
                        {t('Bloc', 'Block')} {tk.blockNumber} · {formatDateShort(tk.purchasedAt)}
                      </p>
                      {tk.etherscanUrl ? (
                        <a
                          href={tk.etherscanUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-primary underline-offset-2 hover:underline"
                        >
                          {t('Vérifier sur Etherscan →', 'Verify on Etherscan →')}
                        </a>
                      ) : null}
                    </li>
                  ))}
                </ul>
                <p className="text-caption text-secondary">
                  +{receipt.data.pointsAwarded} pts · {t('nouveau solde', 'new balance')} {receipt.data.newPointsBalance} pts
                </p>
                {receipt.data.poapBadge?.status === 'MINT_PENDING' ? (
                  <p className="text-caption text-fg-muted">
                    {t(
                      "Certificat POAP en cours d'émission sur la blockchain.",
                      'POAP certificate being minted on-chain.'
                    )}
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="mt-2 text-caption text-fg-muted">
                {t(
                  'Votre reçu apparaîtra ici après confirmation. Chaque ticket est relié à une transaction vérifiable.',
                  'Your receipt will appear here once confirmed. Each ticket is linked to a verifiable transaction.'
                )}
              </p>
            )}
          </section>

          <section className="card flex flex-col gap-1 p-4">
            <p className="text-caption font-semibold text-primary">{t('Remboursement automatique', 'Automatic refund')}</p>
            <p className="text-caption text-fg-secondary">
              {t(
                "Si le tirage est annulé, le Smart Contract rembourse automatiquement l'intégralité des participations.",
                'If the draw is cancelled, the Smart Contract automatically refunds every entry.'
              )}
            </p>
          </section>

          <Link
            href="/historique"
            className="py-2.5 text-center text-caption font-medium text-fg-secondary hover:text-fg"
          >
            {t('Consulter mes tickets et certificats POAP', 'View my tickets and POAP certificates')}
          </Link>
        </aside>
      </div>
    </div>
  );
}

export default function TicketOfficePage() {
  return (
    <Suspense fallback={<Loader />}>
      <TicketOfficeContent />
    </Suspense>
  );
}
