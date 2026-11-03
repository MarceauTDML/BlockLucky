import React from 'react';
import { View, StyleSheet } from 'react-native';
import useAppTheme from '../../hooks/useAppTheme';
import AppText from '../ui/AppText';
import { LeaderboardEntry } from '../../types/api.types';

export interface LeaderboardListProps {
  entries: LeaderboardEntry[];
}

export const LeaderboardList: React.FC<LeaderboardListProps> = ({ entries }) => {
  const { colors, borderRadius, t } = useAppTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderRadius: borderRadius.lg,
          borderColor: colors.border,
        },
      ]}
    >
      <AppText variant="body" weight="bold" style={styles.title}>
        {t('Ambassadeurs d EtherBay', 'EtherBay Ambassadors')}
      </AppText>

      {entries.length === 0 ? (
        <AppText variant="caption" color={colors.textMuted}>
          {t(
            'Aucun participant classé pour le moment.',
            'No ranked participants yet.'
          )}
        </AppText>
      ) : (
        entries.slice(0, 6).map((item, idx) => (
          <View
            key={`${item.rank}-${item.anonymizedWallet}`}
            style={[
              styles.row,
              {
                borderBottomColor: colors.border,
                borderBottomWidth: idx === Math.min(entries.length, 6) - 1 ? 0 : 1,
              },
            ]}
          >
            <View style={styles.leftCol}>
              <View
                style={[
                  styles.rankBadge,
                  {
                    backgroundColor:
                      item.rank === 1 ? colors.secondary : colors.surfaceElevated,
                    borderRadius: borderRadius.sm,
                  },
                ]}
              >
                <AppText
                  variant="caption"
                  weight="bold"
                  color={item.rank === 1 ? '#F7F6F2' : colors.textSecondary}
                >
                  {item.rank}
                </AppText>
              </View>
              <View>
                <AppText variant="caption" weight="bold">
                  {item.anonymizedWallet}
                </AppText>
                <AppText variant="caption" color={colors.textMuted}>
                  {t(
                    `${item.referralsCount} parrainage(s) • ${item.ticketsBought} ticket(s)`,
                    `${item.referralsCount} referral(s) • ${item.ticketsBought} ticket(s)`
                  )}
                </AppText>
              </View>
            </View>
            <AppText variant="caption" weight="bold" color={colors.primary}>
              {item.pointsBalance} pts
            </AppText>
          </View>
        ))
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderWidth: 1,
    marginBottom: 14,
  },
  title: {
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 9,
  },
  leftCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rankBadge: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default LeaderboardList;
