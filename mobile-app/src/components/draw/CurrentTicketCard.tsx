import React from 'react';
import { StyleSheet, View } from 'react-native';

import { formatLongDuration, formatMockEth, formatRoundLabel, groupThousands } from './drawFormat';
import useAppTheme from '../../hooks/useAppTheme';
import { LotteryPhase, TicketItem } from '../../types/api.types';
import AppButton from '../ui/AppButton';
import AppText from '../ui/AppText';
import Card from '../ui/Card';
import Pill from '../ui/Pill';

export interface CurrentTicketCardProps {
  ticket: TicketItem;
  phase: LotteryPhase | null;
  ticketPriceEth: number | null;
  secondsToOpen: number | null;
  secondsToReveal: number | null;
  maxParticipants: number | null;
  onOpenRoom: () => void;
  onOpenDraw: () => void;
}

export const CurrentTicketCard: React.FC<CurrentTicketCardProps> = ({
  ticket,
  phase,
  ticketPriceEth,
  secondsToOpen,
  secondsToReveal,
  maxParticipants,
  onOpenRoom,
  onOpenDraw,
}) => {
  const { colors, t } = useAppTheme();
  const roundLabel = formatRoundLabel(ticket.contractRoundId);
  const drawing = phase === 'DRAWING' || phase === 'COMPLETED';
  const inRoom = phase === 'WAITING_ROOM';

  const statusLabel = drawing
    ? t('Tirage en cours', 'Drawing')
    : inRoom
      ? t('Salle ouverte', 'Room open')
      : t('En cours', 'Ongoing');
  const timerCaption = drawing
    ? t('La roue tourne en ce moment', 'The wheel is spinning now')
    : inRoom
      ? t('Révélation dans', 'Reveal in')
      : t('La salle ouvre au plus tard dans', 'The room opens at the latest in');
  const timerValue = drawing ? null : inRoom ? secondsToReveal : secondsToOpen;

  return (
    <Card tone="sun" radius={25} padding={18}>
      <View style={styles.headRow}>
        <AppText variant="subtitle" color={colors.onSun} style={styles.flex}>
          {roundLabel
            ? t(`Grand tirage #${roundLabel}`, `Draw #${roundLabel}`)
            : t('Grand tirage', 'Grand draw')}
        </AppText>
        <Pill tone="sunSoft" uppercase={false} label={statusLabel} />
      </View>

      <AppText variant="overline" color={colors.onSun} style={styles.overline}>
        {t('Votre numéro', 'Your number')}
      </AppText>
      <View style={styles.numberRow}>
        <AppText
          size={36}
          weight="bold"
          color={colors.onSun}
          style={styles.flex}
          accessibilityLabel={
            ticket.ticketNumber
              ? t(
                  `Votre numéro ${ticket.ticketNumber.split('').join(' ')}`,
                  `Your number ${ticket.ticketNumber.split('').join(' ')}`,
                )
              : undefined
          }
        >
          {ticket.ticketNumber ?? '-----'}
        </AppText>
        {ticketPriceEth !== null ? (
          <AppText size={12} weight="medium" color={colors.onSun}>
            {formatMockEth(ticketPriceEth, t)}
          </AppText>
        ) : null}
      </View>

      <AppText size={11} weight="medium" color={colors.onSun} style={styles.caption}>
        {timerCaption}
      </AppText>
      <View style={styles.actionRow}>
        {timerValue !== null ? (
          <AppText
            size={23}
            weight="bold"
            color={colors.onSun}
            style={styles.flex}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {formatLongDuration(timerValue, t)}
          </AppText>
        ) : (
          <View style={styles.flex} />
        )}
        <AppButton
          title={drawing ? t('Voir le tirage', 'See the draw') : t('Voir la salle', 'See the room')}
          variant="dark"
          size="md"
          rightIcon="arrowRight"
          fullWidth={false}
          onPress={drawing ? onOpenDraw : onOpenRoom}
          style={styles.cta}
        />
      </View>

      {phase === 'OPEN' ? (
        <AppText size={10} weight="medium" color={colors.onSun} style={styles.footnote}>
          {maxParticipants
            ? t(
                `ou dès ${groupThousands(maxParticipants)} participants · 1 ticket par grand tirage`,
                `or at ${groupThousands(maxParticipants)} participants · 1 ticket per draw`,
              )
            : t('1 ticket par grand tirage', '1 ticket per draw')}
        </AppText>
      ) : null}
    </Card>
  );
};

const styles = StyleSheet.create({
  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  flex: {
    flex: 1,
  },
  overline: {
    marginTop: 14,
  },
  numberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  caption: {
    marginTop: 8,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 2,
  },
  cta: {
    minHeight: 44,
    minWidth: 150,
  },
  footnote: {
    marginTop: 14,
  },
});

export default CurrentTicketCard;
