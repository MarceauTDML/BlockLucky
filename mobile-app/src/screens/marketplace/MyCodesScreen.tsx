import React, { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import CodeCard from '../../components/marketplace/CodeCard';
import { getApiErrorMessage } from '../../components/marketplace/apiErrors';
import AppButton from '../../components/ui/AppButton';
import AppText from '../../components/ui/AppText';
import Card from '../../components/ui/Card';
import FilterChips from '../../components/ui/FilterChips';
import Screen from '../../components/ui/Screen';
import ScreenHeader from '../../components/ui/ScreenHeader';
import useAppTheme from '../../hooks/useAppTheme';
import { useRootNavigation } from '../../navigation/hooks';
import { useGetMyCodesQuery } from '../../store/api/marketplaceApi';

type CodesFilter = 'active' | 'used' | 'all';

const TONES = ['sun', 'lavender', 'peach'] as const;

const MyCodesScreen: React.FC = () => {
  const { colors, t } = useAppTheme();
  const navigation = useRootNavigation();
  const { data, isLoading, isFetching, isError, error, refetch } = useGetMyCodesQuery();
  const [filter, setFilter] = useState<CodesFilter>('active');

  const codes = useMemo(() => {
    const raw = data?.data?.codes;
    return Array.isArray(raw) ? raw : [];
  }, [data]);
  const activeCount = codes.filter((code) => !code.isUsed).length;
  const usedCount = codes.length - activeCount;
  const visible = codes.filter((code) =>
    filter === 'all' ? true : filter === 'used' ? code.isUsed : !code.isUsed,
  );

  return (
    <Screen showSecurityFooter refreshing={isFetching && !isLoading} onRefresh={refetch}>
      <ScreenHeader
        title={t('Mes codes', 'My codes')}
        subtitle={t('À présenter en caisse chez les commerçants', 'Show them at the shop checkout')}
        onBack={() => navigation.goBack()}
      />

      {codes.length > 0 ? (
        <View style={styles.filters}>
          <FilterChips<CodesFilter>
            options={[
              { value: 'active', label: t(`Actifs · ${activeCount}`, `Active · ${activeCount}`) },
              { value: 'used', label: t(`Utilisés · ${usedCount}`, `Used · ${usedCount}`) },
              { value: 'all', label: t(`Tous · ${codes.length}`, `All · ${codes.length}`) },
            ]}
            value={filter}
            onChange={setFilter}
          />
        </View>
      ) : null}

      {isLoading ? (
        <Card style={styles.state}>
          <ActivityIndicator color={colors.ink} />
          <AppText size={12} color={colors.inkMuted}>
            {t('Chargement de vos codes...', 'Loading your codes...')}
          </AppText>
        </Card>
      ) : isError ? (
        <Card style={styles.state}>
          <AppText size={13} weight="semibold" align="center">
            {t('Codes indisponibles', 'Codes unavailable')}
          </AppText>
          <AppText size={12} color={colors.inkMuted} align="center">
            {getApiErrorMessage(
              error,
              t('Vérifiez votre connexion et réessayez.', 'Check your connection and try again.'),
            )}
          </AppText>
          <AppButton
            title={t('Réessayer', 'Retry')}
            variant="outline"
            size="md"
            onPress={refetch}
          />
        </Card>
      ) : visible.length === 0 ? (
        <Card tone="lavender" style={styles.state}>
          <AppText size={16} weight="bold" align="center">
            {codes.length === 0
              ? t('Aucun code pour l’instant', 'No codes yet')
              : t('Rien dans ce filtre', 'Nothing in this filter')}
          </AppText>
          <AppText size={12} color={colors.ink} align="center">
            {t(
              'Échangez vos EtherPoints dans la boutique ou grattez un ticket pour obtenir une réduction.',
              'Exchange your EtherPoints in the shop or scratch a ticket to get a discount.',
            )}
          </AppText>
          <AppButton
            title={t('Aller à la boutique', 'Go to the shop')}
            variant="dark"
            size="md"
            onPress={() => navigation.navigate('RewardsCatalog')}
          />
        </Card>
      ) : (
        <View style={styles.list}>
          {visible.map((code, index) => (
            <CodeCard key={code.id} code={code} tone={TONES[index % TONES.length]} />
          ))}
        </View>
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  filters: {
    marginBottom: 14,
  },
  state: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 26,
  },
  list: {
    gap: 12,
  },
});

export default MyCodesScreen;
