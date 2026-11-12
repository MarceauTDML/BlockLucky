import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import DeadlineCard from '../../components/lottery/DeadlineCard';
import DialogSummary from '../../components/lottery/DialogSummary';
import DrawStatusBadge from '../../components/lottery/DrawStatusBadge';
import {
  findCurrentRoundTicket,
  formatDecimal,
  formatEth,
  formatInteger,
  formatRoundNumber,
  formatTicketPrice,
  getApiErrorMessage,
  purchaseDeadline,
  resolveParticipants,
  resolvePhase,
} from '../../components/lottery/lotteryFormat';
import useCountdown from '../../components/lottery/useCountdown';
import AppButton from '../../components/ui/AppButton';
import AppText from '../../components/ui/AppText';
import Card from '../../components/ui/Card';
import Loader from '../../components/ui/Loader';
import ProgressBar from '../../components/ui/ProgressBar';
import ResultDialog from '../../components/ui/ResultDialog';
import Screen from '../../components/ui/Screen';
import ScreenHeader from '../../components/ui/ScreenHeader';
import SectionHeader from '../../components/ui/SectionHeader';
import StepList from '../../components/ui/StepList';
import Icon from '../../components/ui/icons/Icon';
import useAppTheme from '../../hooks/useAppTheme';
import useCitizenWallet from '../../hooks/useCitizenWallet';
import { useRootNavigation } from '../../navigation/hooks';
import {
  useGetLotteryStatusQuery,
  useGetMyTransactionsQuery,
  useGetWalletQuery,
} from '../../store/api/lotteryApi';
import { BuyTicketResponse } from '../../types/api.types';

type DialogState =
  | { kind: 'none' }
  | { kind: 'success'; data: BuyTicketResponse }
  | { kind: 'failed'; title: string; message: string; canRetry: boolean }
  | { kind: 'already'; message: string }
  | { kind: 'age'; message: string };

const BuyTicketScreen: React.FC = () => {
  const { colors, t } = useAppTheme();
  const navigation = useRootNavigation();
  const { purchaseTickets, isBuying } = useCitizenWallet();
  const [dialog, setDialog] = useState<DialogState>({ kind: 'none' });
  const [retryAttempt, setRetryAttempt] = useState(0);

  const statusQuery = useGetLotteryStatusQuery();
  const walletQuery = useGetWalletQuery();
  const ticketsQuery = useGetMyTransactionsQuery();

  const status = statusQuery.data?.data;
  const round = status?.round;
  const phase = resolvePhase(round);
  const participants = resolveParticipants(status);
  const ownTicket = findCurrentRoundTicket(ticketsQuery.data?.data?.tickets, round);
  const price = round?.ticketPriceEth ?? 0;
  const balance = walletQuery.data?.data?.balanceEth ?? null;
  const balanceAfter = balance !== null ? Math.max(0, balance - price) : null;
  const sufficient = balance === null || balance >= price;
  const roundLabel = formatRoundNumber(round?.contractRoundId);
  const seconds = useCountdown(purchaseDeadline(round), round?.remainingSeconds);
  const maxPrize = participants.max * price;
  const priceLabel = t(
    `${formatTicketPrice(price)} ETH fictif`,
    `${formatTicketPrice(price)} fictional ETH`,
  );

  const confirmed = Boolean(ownTicket) || dialog.kind === 'success';
  const closed = Boolean(round) && phase !== 'OPEN';

  const goHome = () => {
    setDialog({ kind: 'none' });
    navigation.navigate('Main', { screen: 'HomeTab' });
  };

  const goTickets = () => {
    setDialog({ kind: 'none' });
    navigation.navigate('Main', { screen: 'TicketsTab' });
  };

  const handleConfirm = async () => {
    const outcome = await purchaseTickets(retryAttempt);
    switch (outcome.status) {
      case 'SUCCESS':
        setRetryAttempt(0);
        setDialog({ kind: 'success', data: outcome.data });
        ticketsQuery.refetch();
        walletQuery.refetch();
        break;
      case 'ALREADY_OWNED':
        setDialog({ kind: 'already', message: outcome.message });
        ticketsQuery.refetch();
        break;
      case 'AGE_REQUIRED':
        setDialog({ kind: 'age', message: outcome.message });
        break;
      default:
        setRetryAttempt((attempt) => Math.min(5, attempt + 1));
        setDialog({
          kind: 'failed',
          title: outcome.title,
          message: outcome.message,
          canRetry: outcome.canRetry,
        });
    }
  };

  const buttonTitle = confirmed
    ? t('Ticket déjà validé', 'Ticket already confirmed')
    : closed
      ? t('Achats clos pour ce tirage', 'Sales closed for this draw')
      : !sufficient
        ? t('Solde insuffisant', 'Insufficient balance')
        : t('Confirmer mon ticket', 'Confirm my ticket');

  const footer = (
    <View>
      <View style={styles.totalRow}>
        <AppText size={13} weight="medium" style={styles.flex}>
          {t('Total · 1 ticket', 'Total · 1 ticket')}
        </AppText>
        <AppText size={18} weight="bold">
          {price > 0 ? priceLabel : '—'}
        </AppText>
      </View>
      <AppButton
        title={buttonTitle}
        onPress={handleConfirm}
        loading={isBuying}
        disabled={!round || confirmed || closed || !sufficient}
        accessibilityHint={t(
          'Achète votre ticket avec vos ETH fictifs',
          'Buys your ticket with your fictional ETH',
        )}
      />
      <AppText size={9} color={colors.inkMuted} style={styles.terms}>
        {t(
          'En confirmant, vous acceptez le règlement du tirage.',
          'By confirming, you accept the draw rules.',
        )}
      </AppText>
    </View>
  );

  return (
    <Screen footer={footer} showSecurityFooter>
      <ScreenHeader
        title={t('Mon ticket', 'My ticket')}
        subtitle={
          round ? t(`EtherBay · Tirage ${roundLabel}`, `EtherBay · Draw ${roundLabel}`) : 'EtherBay'
        }
        onBack={() => navigation.goBack()}
      />

      {statusQuery.isLoading && !status ? (
        <Loader message={t('Chargement du grand tirage…', 'Loading the grand draw…')} />
      ) : !status ? (
        <Card tone="peach">
          <AppText size={16} weight="bold">
            {t(
              'Le grand tirage est momentanément indisponible.',
              'The grand draw is temporarily unavailable.',
            )}
          </AppText>
          <AppText size={12} color={colors.inkMuted} style={styles.errorText}>
            {getApiErrorMessage(
              statusQuery.error,
              t('Vérifiez votre connexion puis réessayez.', 'Check your connection and try again.'),
            )}
          </AppText>
          <AppButton
            title={t('Réessayer', 'Try again')}
            variant="dark"
            size="md"
            onPress={() => statusQuery.refetch()}
          />
        </Card>
      ) : (
        <Card tone="sun" radius={28} elevated>
          <DrawStatusBadge label={t('Le grand tirage', 'The grand draw')} />
          <AppText variant="overline" color={colors.onSun} style={styles.prizeLabel}>
            {t('Cagnotte actuelle · ETH fictifs', 'Current prize pool · fictional ETH')}
          </AppText>
          <AppText variant="display" color={colors.onSun} numberOfLines={1} adjustsFontSizeToFit>
            {formatEth(round?.prizePool)}
          </AppText>
          <AppText size={12} weight="medium" color={colors.onSun}>
            {t(
              'fictifs, versés dans le portefeuille du gagnant',
              'fictional, paid into the winner’s wallet',
            )}
          </AppText>
          <View style={[styles.localPrizes, { backgroundColor: colors.sunLight }]}>
            <AppText size={13} weight="bold" color={colors.onSun}>
              {t('+ Les lots des commerçants d’EtherBay', '+ Prizes from EtherBay shops')}
            </AppText>
            <AppText size={10} weight="medium" color={colors.onSun}>
              {t('Offerts par les commerces de votre ville', 'Offered by your city’s shops')}
            </AppText>
          </View>
          {maxPrize > 0 ? (
            <AppText size={11} weight="semibold" color={colors.onSun} style={styles.maxPrize}>
              {t(
                `Jusqu’à ${formatDecimal(maxPrize, maxPrize % 1 === 0 ? 0 : 2)} ETH fictifs si les ${formatInteger(participants.max)} places sont prises.`,
                `Up to ${formatDecimal(maxPrize, maxPrize % 1 === 0 ? 0 : 2)} fictional ETH if all ${formatInteger(participants.max)} spots are taken.`,
              )}
            </AppText>
          ) : null}
          {phase === 'OPEN' ? (
            <View style={styles.deadline}>
              <DeadlineCard
                label={t('Fin des achats dans', 'Purchases close in')}
                seconds={seconds}
                aside={t(
                  `ou dès ${formatInteger(participants.max)} participants`,
                  `or at ${formatInteger(participants.max)} participants`,
                )}
              />
            </View>
          ) : null}
          <View style={styles.progress}>
            <ProgressBar
              percentage={participants.percentage}
              accessibilityLabel={t(
                `${formatInteger(participants.current)} participants sur ${formatInteger(participants.max)}`,
                `${formatInteger(participants.current)} participants out of ${formatInteger(participants.max)}`,
              )}
            />
          </View>
          <View style={styles.participantsRow}>
            <AppText size={11} weight="semibold" color={colors.onSun} style={styles.flex}>
              {t(
                `${formatInteger(participants.current)} / ${formatInteger(participants.max)} participants`,
                `${formatInteger(participants.current)} / ${formatInteger(participants.max)} participants`,
              )}
            </AppText>
            <AppText size={11} weight="bold" color={colors.onSun}>
              {t(
                `${formatInteger(participants.remaining)} places`,
                `${formatInteger(participants.remaining)} spots`,
              )}
            </AppText>
          </View>
          <AppText size={10} weight="medium" color={colors.onSun} style={styles.rule}>
            {t(
              `À 0:00 ou à ${formatInteger(participants.max)} inscrits : la salle d’attente ouvre.`,
              `At midnight or at ${formatInteger(participants.max)} sign-ups: the waiting room opens.`,
            )}
          </AppText>
        </Card>
      )}

      <SectionHeader title={t('Un ticket, et plus encore.', 'A ticket, and more.')} />
      <Card tone="lavender" padding={16}>
        <StepList
          variant="badge"
          steps={[
            {
              title: t('Des points avec votre ticket', 'Points with your ticket'),
              description: t(
                'Vos EtherPoints deviennent des réductions chez les commerçants d’EtherBay.',
                'Your EtherPoints become discounts at EtherBay shops.',
              ),
            },
            {
              title: t('La même règle pour tous', 'The same rule for everyone'),
              description: t(
                'Un seul achat par personne et par grand tirage. Les lots sont offerts par les commerces locaux.',
                'One purchase per person per grand draw. Prizes are offered by local shops.',
              ),
            },
          ]}
        />
      </Card>

      <SectionHeader title={t('Un ticket par grand tirage', 'One ticket per grand draw')} />
      <Card>
        <View style={styles.recapRow}>
          <AppText size={14} weight="bold" style={styles.flex}>
            {t(`1 ticket · Tirage ${roundLabel}`, `1 ticket · Draw ${roundLabel}`)}
          </AppText>
          <AppText size={13} weight="bold">
            {price > 0 ? priceLabel : '—'}
          </AppText>
        </View>
        <View style={[styles.divider, { backgroundColor: colors.divider }]} />
        <View style={styles.balanceRow}>
          <AppText size={12} color={colors.inkMuted} style={styles.flex}>
            {t('Votre solde actuel', 'Your current balance')}
          </AppText>
          <AppText size={12} weight="semibold">
            {walletQuery.isLoading ? '…' : formatEth(balance)}
          </AppText>
        </View>
        <View style={styles.balanceRow}>
          <AppText size={12} color={colors.inkMuted} style={styles.flex}>
            {confirmed
              ? t('Après votre achat', 'After your purchase')
              : t('Après confirmation', 'After confirmation')}
          </AppText>
          <AppText size={12} weight="semibold">
            {confirmed ? formatEth(balance) : formatEth(balanceAfter)}
          </AppText>
        </View>
        {balance !== null ? (
          <View
            style={[
              styles.balanceState,
              { backgroundColor: sufficient ? colors.mint : colors.peach },
            ]}
          >
            <AppText
              size={10}
              weight="semibold"
              color={sufficient ? colors.green : colors.terracotta}
            >
              {sufficient
                ? t(
                    'Solde suffisant · ETH offerts par la Mairie',
                    'Sufficient balance · ETH granted by the City',
                  )
                : t('Solde insuffisant pour ce ticket', 'Insufficient balance for this ticket')}
            </AppText>
          </View>
        ) : null}
        <AppText size={12} weight="semibold" style={styles.fictional}>
          {t('Monnaie fictive, aucune valeur réelle.', 'Fictional currency, no real value.')}
        </AppText>
      </Card>
      <Card
        tone="sunPale"
        radius={16}
        padding={14}
        style={styles.giftLink}
        onPress={() => navigation.navigate('GiftTicket')}
        accessibilityLabel={t(
          'Offrir un ticket à un proche par e-mail',
          'Gift a ticket to a loved one by e-mail',
        )}
      >
        <View style={styles.giftRow}>
          <Icon name="giftTicket" size={21} color={colors.onSun} />
          <AppText size={12} weight="semibold" color={colors.onSun} style={styles.flex}>
            {t(
              'Vous pouvez aussi offrir un ticket à un proche par e-mail.',
              'You can also gift a ticket to a loved one by e-mail.',
            )}
          </AppText>
          <Icon name="chevronRight" size={18} color={colors.onSun} />
        </View>
      </Card>

      <SectionHeader title={t('Et après ?', 'What’s next?')} />
      <Card radius={23} padding={16}>
        <StepList
          variant="numbered"
          steps={[
            {
              title: t(
                'Un seul ticket par participant et par grand tirage.',
                'Only one ticket per participant per grand draw.',
              ),
            },
            { title: t('Retrouvez-le dans « Mes tickets ».', 'Find it in “My tickets”.') },
            {
              title: t(
                `À 0:00 ou à ${formatInteger(participants.max || 10000)} inscrits, la salle ouvre. Révélation après 10 minutes d’attente.`,
                `At midnight or at ${formatInteger(participants.max || 10000)} sign-ups, the room opens. Reveal after a 10-minute wait.`,
              ),
            },
          ]}
        />
      </Card>

      <ResultDialog
        visible={dialog.kind === 'success'}
        status="success"
        title={t('Votre ticket est validé !', 'Your ticket is confirmed!')}
        message={t(
          `Votre ticket pour le grand tirage ${roundLabel} est prêt. Retrouvez-le dans « Mes tickets ».`,
          `Your ticket for grand draw ${roundLabel} is ready. Find it in “My tickets”.`,
        )}
        note={t(
          'Vous êtes inscrit au tirage. Un seul ticket par participant et par grand tirage.',
          'You are entered in the draw. Only one ticket per participant per grand draw.',
        )}
        primaryLabel={t('Voir mon ticket', 'View my ticket')}
        onPrimary={goTickets}
        secondaryLabel={t('Retour à l’accueil', 'Back to home')}
        onSecondary={goHome}
      >
        {dialog.kind === 'success' ? (
          <DialogSummary
            title={
              dialog.data.tickets[0]?.ticketNumber
                ? t(
                    `Ticket n° ${dialog.data.tickets[0].ticketNumber} · Tirage ${roundLabel}`,
                    `Ticket no. ${dialog.data.tickets[0].ticketNumber} · Draw ${roundLabel}`,
                  )
                : t(`1 ticket · Tirage ${roundLabel}`, `1 ticket · Draw ${roundLabel}`)
            }
            detail={
              dialog.data.walletBalanceEth !== null && dialog.data.walletBalanceEth !== undefined
                ? t(
                    `Nouveau solde : ${formatEth(dialog.data.walletBalanceEth)} fictif · +${dialog.data.pointsAwarded} EtherPoints`,
                    `New balance: ${formatEth(dialog.data.walletBalanceEth)} · +${dialog.data.pointsAwarded} EtherPoints`,
                  )
                : t(
                    `+${dialog.data.pointsAwarded} EtherPoints`,
                    `+${dialog.data.pointsAwarded} EtherPoints`,
                  )
            }
          />
        ) : null}
      </ResultDialog>

      <ResultDialog
        visible={dialog.kind === 'failed'}
        status="error"
        title={dialog.kind === 'failed' ? dialog.title : ''}
        message={
          dialog.kind === 'failed'
            ? `${dialog.message} ${t('Aucun ticket créé, aucun ETH fictif débité.', 'No ticket created, no fictional ETH charged.')}`
            : undefined
        }
        note={
          dialog.kind === 'failed' && dialog.canRetry
            ? t(
                'Vous pouvez réessayer pour obtenir votre ticket. Un seul ticket par participant et par grand tirage.',
                'You can try again to get your ticket. Only one ticket per participant per grand draw.',
              )
            : undefined
        }
        primaryLabel={
          dialog.kind === 'failed' && dialog.canRetry
            ? t('Réessayer l’achat', 'Retry purchase')
            : t('Compris', 'Got it')
        }
        onPrimary={() => {
          const retry = dialog.kind === 'failed' && dialog.canRetry;
          setDialog({ kind: 'none' });
          if (retry) handleConfirm();
        }}
        secondaryLabel={t('Revenir plus tard', 'Come back later')}
        onSecondary={() => {
          setDialog({ kind: 'none' });
          navigation.goBack();
        }}
        onRequestClose={() => setDialog({ kind: 'none' })}
      >
        <DialogSummary
          tone="muted"
          title={t('Ticket non créé', 'Ticket not created')}
          detail={
            balance !== null
              ? t(
                  `Solde inchangé : ${formatEth(balance)} fictif`,
                  `Balance unchanged: ${formatEth(balance)}`,
                )
              : undefined
          }
        />
      </ResultDialog>

      <ResultDialog
        visible={dialog.kind === 'already'}
        status="info"
        title={t('Ticket déjà validé', 'Ticket already confirmed')}
        message={dialog.kind === 'already' ? dialog.message : undefined}
        note={t(
          'Un seul ticket par participant et par grand tirage.',
          'Only one ticket per participant per grand draw.',
        )}
        primaryLabel={t('Voir mon ticket', 'View my ticket')}
        onPrimary={goTickets}
        secondaryLabel={t('Fermer', 'Close')}
        onSecondary={() => setDialog({ kind: 'none' })}
      />

      <ResultDialog
        visible={dialog.kind === 'age'}
        status="info"
        title={t('Vérifiez votre âge pour jouer.', 'Verify your age to play.')}
        message={
          dialog.kind === 'age'
            ? dialog.message === 'Vérifiez votre âge pour jouer.'
              ? t(
                  'Le grand tirage est réservé aux personnes majeures. Envoyez une pièce d’identité pour débloquer l’achat.',
                  'The grand draw is for adults only. Send an ID document to unlock purchases.',
                )
              : dialog.message
            : undefined
        }
        primaryLabel={t('Vérifier mon âge', 'Verify my age')}
        onPrimary={() => {
          setDialog({ kind: 'none' });
          navigation.navigate('VerifyAge');
        }}
        secondaryLabel={t('Plus tard', 'Later')}
        onSecondary={() => setDialog({ kind: 'none' })}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  terms: {
    marginTop: 10,
  },
  errorText: {
    marginTop: 6,
    marginBottom: 14,
  },
  prizeLabel: {
    marginTop: 14,
  },
  localPrizes: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginTop: 14,
    gap: 3,
  },
  maxPrize: {
    marginTop: 12,
  },
  deadline: {
    marginTop: 12,
  },
  progress: {
    marginTop: 14,
  },
  participantsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  rule: {
    marginTop: 12,
  },
  recapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  divider: {
    height: 1,
    marginTop: 16,
    marginBottom: 14,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 9,
  },
  balanceState: {
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 7,
    marginTop: 2,
  },
  fictional: {
    marginTop: 14,
  },
  giftLink: {
    marginTop: 12,
  },
  giftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
});

export default BuyTicketScreen;
