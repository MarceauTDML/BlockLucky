import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { formatDayMonth, formatMockEth, formatRoundLabel } from './drawFormat';
import useAppTheme from '../../hooks/useAppTheme';
import { ClaimedRewardCode, TicketItem } from '../../types/api.types';
import AppText from '../ui/AppText';
import Card from '../ui/Card';
import Pill from '../ui/Pill';
import Icon from '../ui/icons/Icon';

const LinkRow: React.FC<{ label: string; onPress: () => void }> = ({ label, onPress }) => {
  const { colors } = useAppTheme();
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={10}
      style={({ pressed }) => [styles.link, { opacity: pressed ? 0.6 : 1 }]}
    >
      <AppText size={11} weight="semibold" color={colors.ink}>
        {label}
      </AppText>
      <Icon name="arrowRight" size={14} color={colors.ink} />
    </Pressable>
  );
};

export interface DrawResultCardProps {
  ticket: TicketItem;
  linkLabel?: string;
  onPressLink?: () => void;
}

export const DrawResultCard: React.FC<DrawResultCardProps> = ({
  ticket,
  linkLabel,
  onPressLink,
}) => {
  const { colors, t } = useAppTheme();
  const roundLabel = formatRoundLabel(ticket.contractRoundId);
  const cancelled = ticket.roundStatus === 'CANCELLED';
  const won = Boolean(ticket.isWinner);
  const date = formatDayMonth(ticket.purchasedAt, t);

  return (
    <Card tone={won ? 'lavender' : 'surface'} radius={24} padding={18} style={styles.card}>
      <View style={styles.headRow}>
        <AppText size={15} weight="bold" style={styles.flex}>
          {roundLabel
            ? t(`Grand tirage #${roundLabel}`, `Draw #${roundLabel}`)
            : t('Grand tirage', 'Grand draw')}
        </AppText>
        {cancelled ? (
          <Pill tone="peach" uppercase={false} label={t('Annulé', 'Cancelled')} />
        ) : won ? (
          <Pill tone="mint" uppercase={false} label={t('Gagné', 'Won')} />
        ) : (
          <Pill
            tone="muted"
            uppercase={false}
            label={t('Non gagnant', 'Not a winner')}
            style={{ backgroundColor: colors.surfaceNeutral }}
          />
        )}
      </View>
      {date ? (
        <AppText size={11} color={colors.inkMuted} style={styles.subtitle}>
          {t(`Ticket du ${date}`, `Ticket from ${date}`)}
        </AppText>
      ) : null}

      {won && ticket.prizeEth !== null && ticket.prizeEth !== undefined ? (
        <>
          <AppText size={23} weight="bold" color={colors.violet} style={styles.gain}>
            {`+${formatMockEth(ticket.prizeEth, t)}`}
          </AppText>
          <AppText size={10} weight="medium" color={colors.inkMuted}>
            {t('Versés sur votre portefeuille BlockLucky', 'Paid to your BlockLucky wallet')}
          </AppText>
        </>
      ) : null}

      {cancelled ? (
        <AppText size={12} color={colors.inkMuted} style={styles.gain}>
          {t(
            'Tirage annulé, ticket remboursé automatiquement.',
            'Draw cancelled, ticket refunded automatically.',
          )}
        </AppText>
      ) : ticket.ticketNumber || ticket.winningTicketNumber ? (
        <View
          style={[styles.compare, { backgroundColor: won ? colors.surface : colors.background }]}
        >
          <View style={styles.flex}>
            <AppText size={9} weight="medium" color={colors.inkMuted}>
              {t('Votre numéro', 'Your number')}
            </AppText>
            <AppText size={14} weight="bold">
              {ticket.ticketNumber ?? '-----'}
            </AppText>
          </View>
          {ticket.winningTicketNumber ? (
            <View style={styles.flex}>
              <AppText size={9} weight="medium" color={colors.inkMuted}>
                {t('Numéro gagnant', 'Winning number')}
              </AppText>
              <AppText size={14} weight="bold">
                {ticket.winningTicketNumber}
              </AppText>
            </View>
          ) : null}
        </View>
      ) : null}

      {linkLabel && onPressLink ? <LinkRow label={linkLabel} onPress={onPressLink} /> : null}
    </Card>
  );
};

export interface ScratchResultCardProps {
  claim: ClaimedRewardCode;
  onPress: () => void;
}

export const ScratchResultCard: React.FC<ScratchResultCardProps> = ({ claim, onPress }) => {
  const { colors, t } = useAppTheme();
  const partner = claim.partner?.name ?? claim.partnerName;
  const date = formatDayMonth(claim.claimedAt, t);
  const meta = [t('À gratter', 'Scratch card'), partner, date].filter(Boolean).join(' · ');

  return (
    <Card tone={claim.isUsed ? 'surface' : 'lavender'} radius={24} padding={18} style={styles.card}>
      <View style={styles.headRow}>
        <AppText size={15} weight="bold" style={styles.flex} numberOfLines={2}>
          {claim.rewardTitle}
        </AppText>
        {claim.isUsed ? (
          <Pill
            tone="muted"
            uppercase={false}
            label={t('Utilisé', 'Used')}
            style={{ backgroundColor: colors.surfaceNeutral }}
          />
        ) : (
          <Pill tone="mint" uppercase={false} label={t('Gagné', 'Won')} />
        )}
      </View>
      <AppText size={11} color={colors.inkMuted} style={styles.subtitle}>
        {meta}
      </AppText>
      <AppText
        size={17}
        weight="semibold"
        color={claim.isUsed ? colors.ink : colors.violet}
        style={styles.gain}
      >
        {claim.isUsed
          ? t('Code déjà utilisé', 'Code already used')
          : t('Code à présenter en boutique', 'Code to show in store')}
      </AppText>
      {partner ? (
        <AppText size={10} weight="medium" color={colors.inkMuted}>
          {t(`Valable chez ${partner}`, `Valid at ${partner}`)}
        </AppText>
      ) : null}
      <LinkRow label={t('Revoir le ticket', 'See the ticket again')} onPress={onPress} />
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
  },
  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  flex: {
    flex: 1,
  },
  subtitle: {
    marginTop: 4,
  },
  gain: {
    marginTop: 12,
    marginBottom: 2,
  },
  compare: {
    flexDirection: 'row',
    borderRadius: 13,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 12,
    gap: 12,
  },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
    minHeight: 28,
    alignSelf: 'flex-start',
  },
});
