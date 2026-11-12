import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import IdentityCard from '../../components/profile/IdentityCard';
import SummaryTiles, { SummaryTile } from '../../components/profile/SummaryTiles';
import TabTitle from '../../components/profile/TabTitle';
import { readAgeStatus } from '../../components/profile/ageStatus';
import AppButton from '../../components/ui/AppButton';
import AppText from '../../components/ui/AppText';
import Card, { CardTone } from '../../components/ui/Card';
import ResultDialog from '../../components/ui/ResultDialog';
import Screen from '../../components/ui/Screen';
import SectionHeader from '../../components/ui/SectionHeader';
import Icon, { IconName } from '../../components/ui/icons/Icon';
import useAppTheme from '../../hooks/useAppTheme';
import useAuth from '../../hooks/useAuth';
import usePoints from '../../hooks/usePoints';
import { useRootNavigation } from '../../navigation/hooks';
import { useGetProfileQuery } from '../../store/api/authApi';
import { useGetWalletQuery } from '../../store/api/lotteryApi';

type ShortcutRoute = 'MyCodes' | 'RewardsCatalog' | 'TransactionHistory';

const formatEthAmount = (value: number, language: string): string => {
  const fixed = Number(value || 0).toFixed(2);
  return language === 'FR' ? fixed.replace('.', ',') : fixed;
};

export const ProfileScreen: React.FC = () => {
  const { colors, language, t } = useAppTheme();
  const navigation = useRootNavigation();
  const { user, signOut } = useAuth();
  const { pointsBalance } = usePoints();
  const {
    data: profileRes,
    isFetching: isFetchingProfile,
    refetch: refetchProfile,
  } = useGetProfileQuery();
  const { data: walletRes, refetch: refetchWallet } = useGetWalletQuery();
  const [confirmLogout, setConfirmLogout] = useState(false);

  const profile = profileRes?.data?.profile ?? user;
  const ageStatus = readAgeStatus(profileRes?.data?.profile ?? user);
  const balanceEth = walletRes?.data?.balanceEth;
  const ticketsCount = profile?.stats?.ticketsCount;

  const tiles: SummaryTile[] = [];
  if (typeof balanceEth === 'number') {
    tiles.push({
      key: 'eth',
      value: formatEthAmount(balanceEth, language),
      label: t('ETH fictifs', 'Play ETH'),
      tone: 'sunSoft',
      onPress: () => navigation.navigate('TransactionHistory'),
    });
  }
  tiles.push({
    key: 'points',
    value: String(pointsBalance ?? 0),
    label: 'EtherPoints',
    tone: 'lavender',
    onPress: () => navigation.navigate('RewardsCatalog'),
  });
  if (typeof ticketsCount === 'number') {
    tiles.push({
      key: 'tickets',
      value: String(ticketsCount),
      label:
        ticketsCount > 1 ? t('tickets joués', 'tickets played') : t('ticket joué', 'ticket played'),
      tone: 'mint',
      onPress: () => navigation.navigate('TicketsTab'),
    });
  }

  const shortcuts: {
    route: ShortcutRoute;
    label: string;
    icon: IconName;
    tone: CardTone;
    color: string;
  }[] = [
    {
      route: 'MyCodes',
      label: t('Mes codes', 'My codes'),
      icon: 'ticket',
      tone: 'sunPale',
      color: colors.onSun,
    },
    {
      route: 'RewardsCatalog',
      label: t('Boutique', 'Shop'),
      icon: 'bag',
      tone: 'lavender',
      color: colors.violet,
    },
    {
      route: 'TransactionHistory',
      label: t('Historique', 'History'),
      icon: 'document',
      tone: 'peach',
      color: colors.terracotta,
    },
  ];

  return (
    <Screen
      refreshing={isFetchingProfile}
      onRefresh={() => {
        refetchProfile();
        refetchWallet();
      }}
    >
      <TabTitle
        title={t('Profil', 'Profile')}
        subtitle={t('Votre compte citoyen', 'Your citizen account')}
      />

      <IdentityCard
        email={profile?.email}
        ageStatus={ageStatus}
        onVerifyAge={() => navigation.navigate('VerifyAge')}
      />

      <View style={styles.block}>
        <SummaryTiles
          title={t('Mon résumé', 'My summary')}
          tiles={tiles}
          note={t('Monnaie fictive, aucune valeur réelle.', 'Play money, no real value.')}
        />
      </View>

      <SectionHeader title={t('Raccourcis', 'Shortcuts')} />
      <View style={styles.shortcuts}>
        {shortcuts.map((shortcut) => (
          <Card
            key={shortcut.route}
            tone={shortcut.tone}
            radius={20}
            padding={14}
            onPress={() => navigation.navigate(shortcut.route)}
            accessibilityLabel={shortcut.label}
            style={styles.shortcut}
          >
            <Icon name={shortcut.icon} size={24} color={shortcut.color} />
            <AppText
              size={12}
              weight="semibold"
              color={shortcut.tone === 'sunPale' ? colors.onSun : colors.ink}
            >
              {shortcut.label}
            </AppText>
          </Card>
        ))}
      </View>

      <AppButton
        title={t('Se déconnecter', 'Sign out')}
        variant="ghost"
        size="md"
        leftIcon="logout"
        onPress={() => setConfirmLogout(true)}
        style={styles.logout}
      />

      <ResultDialog
        visible={confirmLogout}
        status="info"
        title={t('Se déconnecter ?', 'Sign out?')}
        message={t(
          'Vos tickets et vos EtherPoints restent attachés à votre compte.',
          'Your tickets and EtherPoints stay attached to your account.',
        )}
        primaryLabel={t('Se déconnecter', 'Sign out')}
        onPrimary={() => {
          setConfirmLogout(false);
          signOut();
        }}
        secondaryLabel={t('Annuler', 'Cancel')}
        onSecondary={() => setConfirmLogout(false)}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  block: {
    marginTop: 14,
  },
  shortcuts: {
    flexDirection: 'row',
    gap: 10,
  },
  shortcut: {
    flex: 1,
    minHeight: 88,
    justifyContent: 'space-between',
    gap: 10,
  },
  logout: {
    marginTop: 24,
  },
});

export default ProfileScreen;
