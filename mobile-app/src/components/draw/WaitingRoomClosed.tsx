import React from 'react';
import { StyleSheet, View } from 'react-native';

import { formatLongDuration, formatRoundLabel, groupThousands } from './drawFormat';
import useAppTheme from '../../hooks/useAppTheme';
import { LotteryPhase, TicketItem } from '../../types/api.types';
import AppButton from '../ui/AppButton';
import AppText from '../ui/AppText';
import Card from '../ui/Card';
import Pill from '../ui/Pill';
import ProgressBar from '../ui/ProgressBar';
import Icon from '../ui/icons/Icon';

export interface WaitingRoomClosedProps {
  phase: LotteryPhase | null;
  contractRoundId?: number;
  ticket?: TicketItem;
  secondsToOpen: number;
  participants: number | null;
  maxParticipants: number | null;
  onHome: () => void;
  onTickets: () => void;
  onBuy: () => void;
}

export const WaitingRoomClosed: React.FC<WaitingRoomClosedProps> = ({
  phase,
  contractRoundId,
  ticket,
  secondsToOpen,
  participants,
  maxParticipants,
  onHome,
  onTickets,
  onBuy,
}) => {
  const { colors, t } = useAppTheme();
  const roundLabel = formatRoundLabel(contractRoundId);
  const isOpen = phase === 'OPEN';
  const isCancelled = phase === 'CANCELLED';
  const showLimits = isOpen && !isCancelled;
  const percentage =
    participants !== null && maxParticipants
      ? Math.min(100, (participants / maxParticipants) * 100)
      : 0;
  const placesLeft =
    participants !== null && maxParticipants ? Math.max(0, maxParticipants - participants) : null;

  const title = isCancelled
    ? t('Ce grand tirage est annulé.', 'This draw has been cancelled.')
    : isOpen || ticket
      ? t('La salle n’est pas encore ouverte.', 'The room is not open yet.')
      : t('La salle est réservée aux participants.', 'The room is reserved for participants.');

  const description = isCancelled
    ? t(
        'Les participations sont remboursées automatiquement.',
        'Entries are refunded automatically.',
      )
    : isOpen
      ? t(
          'Elle ouvre quand l’une des deux limites ci-dessous est atteinte.',
          'It opens when one of the two limits below is reached.',
        )
      : ticket
        ? t('Elle ouvrira dans quelques instants.', 'It will open in a moment.')
        : t(
            'Les achats sont clos pour ce grand tirage. Rendez-vous au prochain.',
            'Purchases are closed for this draw. See you at the next one.',
          );

  return (
    <View>
      <Card tone="sunSoft" radius={28} padding={18} style={styles.hero}>
        <View style={[styles.lockBox, { backgroundColor: colors.surface }]}>
          <Icon name="lock" size={30} color={colors.inkMuted} />
        </View>
        <AppText
          size={25}
          weight="bold"
          align="center"
          color={colors.onSun}
          accessibilityRole="header"
        >
          {title}
        </AppText>
        <AppText size={12} align="center" color={colors.onSunMuted} style={styles.heroText}>
          {description}
        </AppText>

        {showLimits ? (
          <>
            <View style={styles.limits}>
              <View style={[styles.limit, { backgroundColor: colors.surface }]}>
                <AppText variant="label" color={colors.inkMuted}>
                  {t('Temps restant', 'Time left')}
                </AppText>
                <AppText size={20} weight="bold" numberOfLines={1} adjustsFontSizeToFit>
                  {formatLongDuration(secondsToOpen, t)}
                </AppText>
                <AppText size={9} color={colors.inkMuted}>
                  {t('avant la fin des achats', 'before purchases close')}
                </AppText>
              </View>
              <AppText size={10} weight="semibold" color={colors.onSunMuted}>
                {t('ou', 'or')}
              </AppText>
              {participants !== null && maxParticipants ? (
                <View style={[styles.limit, { backgroundColor: colors.surface }]}>
                  <AppText variant="label" color={colors.inkMuted}>
                    {t('Participants', 'Participants')}
                  </AppText>
                  <AppText size={16} weight="bold" numberOfLines={1} adjustsFontSizeToFit>
                    {`${groupThousands(participants)} / ${groupThousands(maxParticipants)}`}
                  </AppText>
                  <ProgressBar
                    percentage={percentage}
                    tone="surface"
                    height={5}
                    accessibilityLabel={t('Remplissage du grand tirage', 'Draw fill level')}
                  />
                  {placesLeft !== null ? (
                    <AppText size={9} color={colors.inkMuted}>
                      {t(
                        `${groupThousands(placesLeft)} places restantes`,
                        `${groupThousands(placesLeft)} places left`,
                      )}
                    </AppText>
                  ) : null}
                </View>
              ) : null}
            </View>
            <AppText
              size={11}
              weight="semibold"
              align="center"
              color={colors.onSun}
              style={styles.rule}
            >
              {t(
                'La première limite atteinte ouvre la salle.',
                'The first limit reached opens the room.',
              )}
            </AppText>
            <AppText size={10} align="center" color={colors.onSunMuted}>
              {t(
                'La discussion sera accessible à ce moment-là.',
                'The chat will be available at that moment.',
              )}
            </AppText>
          </>
        ) : null}
      </Card>

      {ticket ? (
        <Card radius={23} style={styles.block}>
          <AppText variant="label" color={colors.inkMuted}>
            {roundLabel
              ? t(`Votre ticket · Grand tirage #${roundLabel}`, `Your ticket · Draw #${roundLabel}`)
              : t('Votre ticket', 'Your ticket')}
          </AppText>
          <View style={styles.ticketRow}>
            {ticket.ticketNumber ? (
              <AppText size={29} weight="bold" style={styles.flex}>
                {ticket.ticketNumber}
              </AppText>
            ) : (
              <View style={styles.flex} />
            )}
            <Pill
              tone="mint"
              dot
              uppercase={false}
              label={isCancelled ? t('Remboursé', 'Refunded') : t('Validé', 'Confirmed')}
            />
          </View>
          <AppText size={10} color={colors.inkMuted}>
            {isCancelled
              ? t(
                  'Le montant du ticket revient sur votre portefeuille.',
                  'The ticket amount goes back to your wallet.',
                )
              : t(
                  'Votre participation est enregistrée. Rien à refaire.',
                  'Your entry is recorded. Nothing else to do.',
                )}
          </AppText>
        </Card>
      ) : isOpen ? (
        <Card radius={23} style={styles.block}>
          <AppText variant="label" color={colors.inkMuted}>
            {roundLabel
              ? t(`Grand tirage #${roundLabel}`, `Draw #${roundLabel}`)
              : t('Grand tirage', 'Draw')}
          </AppText>
          <AppText size={17} weight="semibold" style={styles.noTicket}>
            {t('Vous n’avez pas encore votre ticket.', 'You do not have your ticket yet.')}
          </AppText>
          <AppButton
            title={t('Acheter mon ticket', 'Buy my ticket')}
            variant="dark"
            size="md"
            rightIcon="arrowRight"
            onPress={onBuy}
          />
        </Card>
      ) : null}

      {!isCancelled ? (
        <Card tone="lavender" radius={24} style={styles.block}>
          <AppText variant="subtitle" color={colors.ink}>
            {t('Et ensuite ?', 'What next?')}
          </AppText>
          {[
            t('Les achats se ferment, la salle s’ouvre.', 'Purchases close, the room opens.'),
            t('Vous pouvez discuter pendant 10 minutes.', 'You can chat for 10 minutes.'),
            t('Puis le numéro gagnant est révélé.', 'Then the winning number is revealed.'),
          ].map((step, index) => (
            <View key={step} style={styles.step}>
              <AppText size={10} weight="bold" color={colors.violet} style={styles.stepNumber}>
                {String(index + 1).padStart(2, '0')}
              </AppText>
              <AppText size={12} color={colors.ink} style={styles.flex}>
                {step}
              </AppText>
            </View>
          ))}
        </Card>
      ) : null}

      <View style={styles.actions}>
        <AppButton title={t('Retour à l’accueil', 'Back to home')} onPress={onHome} />
        <AppButton
          title={t('Voir mes tickets', 'See my tickets')}
          variant="ghost"
          size="md"
          onPress={onTickets}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
  },
  lockBox: {
    width: 64,
    height: 64,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    marginTop: 2,
  },
  heroText: {
    marginTop: 10,
    maxWidth: 314,
  },
  limits: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
    alignSelf: 'stretch',
  },
  limit: {
    flex: 1,
    borderRadius: 16,
    padding: 12,
    gap: 6,
    minHeight: 83,
  },
  rule: {
    marginTop: 18,
    marginBottom: 6,
  },
  block: {
    marginTop: 20,
  },
  ticketRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 6,
    marginBottom: 6,
  },
  noTicket: {
    marginTop: 8,
    marginBottom: 14,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
  },
  stepNumber: {
    width: 25,
  },
  flex: {
    flex: 1,
  },
  actions: {
    marginTop: 24,
    gap: 6,
  },
});

export default WaitingRoomClosed;
