import { RouteProp, useRoute } from '@react-navigation/native';
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import ScratchCanvas from '../../components/marketplace/ScratchCanvas';
import ScratchOfferCard from '../../components/marketplace/ScratchOfferCard';
import {
  getApiErrorMessage,
  getApiErrorStatus,
  isAgeVerificationError,
} from '../../components/marketplace/apiErrors';
import {
  getScratchOfferName,
  getScratchOfferTheme,
} from '../../components/marketplace/scratchOffers';
import AppButton from '../../components/ui/AppButton';
import AppText from '../../components/ui/AppText';
import Card from '../../components/ui/Card';
import Pill from '../../components/ui/Pill';
import ResultDialog from '../../components/ui/ResultDialog';
import Screen from '../../components/ui/Screen';
import ScreenHeader from '../../components/ui/ScreenHeader';
import useAppTheme from '../../hooks/useAppTheme';
import usePoints from '../../hooks/usePoints';
import { useRootNavigation } from '../../navigation/hooks';
import { useScratchTicketMutation } from '../../store/api/marketplaceApi';
import { ClaimedRewardCode, ScratchOffer, ScratchTicketResponse } from '../../types/api.types';
import { RootStackParamList } from '../../types/navigation.types';

type DialogState = 'none' | 'confirm' | 'age' | 'error';

const extractClaim = (data?: ScratchTicketResponse): ClaimedRewardCode | null => {
  if (!data) return null;
  if (data.claim?.uniqueCode) return data.claim;
  if (data.uniqueCode && data.id) return data as ClaimedRewardCode;
  return null;
};

const ScratchCardScreen: React.FC = () => {
  const { colors, t } = useAppTheme();
  const navigation = useRootNavigation();
  const { params } = useRoute<RouteProp<RootStackParamList, 'ScratchCard'>>();
  const { pointsBalance, setPointsBalance } = usePoints();
  const [scratchTicket, { isLoading }] = useScratchTicketMutation();

  const [offer, setOffer] = useState<ScratchOffer | undefined>(
    params?.claim ? undefined : params?.offer,
  );
  const [claim, setClaim] = useState<ClaimedRewardCode | null>(params?.claim ?? null);
  const [revealed, setRevealed] = useState(Boolean(params?.claim));
  const [dialog, setDialog] = useState<DialogState>('none');
  const [errorTitle, setErrorTitle] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const theme = getScratchOfferTheme(offer ?? 'violet', colors);
  const offerName = offer ? getScratchOfferName(offer, t) : '';
  const missing = offer ? Math.max(0, theme.cost - pointsBalance) : 0;
  const partnerName =
    claim?.partnerName || claim?.partner?.name || t('Commerce d’EtherBay', 'EtherBay shop');

  const handleBuy = async () => {
    if (!offer) return;
    setDialog('none');
    try {
      const res = await scratchTicket({ offer }).unwrap();
      const won = extractClaim(res.data);
      if (typeof res.data.newBalance === 'number') setPointsBalance(res.data.newBalance);
      if (!won) {
        setErrorTitle(t('Aucune récompense disponible', 'No reward available'));
        setErrorMessage(
          t(
            'Aucune réduction n’a pu être attribuée. Réessayez plus tard.',
            'No discount could be assigned. Please try again later.',
          ),
        );
        setDialog('error');
        return;
      }
      setClaim(won);
      setRevealed(false);
    } catch (error) {
      if (isAgeVerificationError(error)) {
        setDialog('age');
        return;
      }
      const status = getApiErrorStatus(error);
      setErrorTitle(
        status === 404 || status === 409
          ? t('Aucune récompense disponible', 'No reward available')
          : status === 400 || status === 402
            ? t('EtherPoints insuffisants', 'Not enough EtherPoints')
            : t('Le ticket n’a pas pu être acheté', 'The ticket could not be bought'),
      );
      setErrorMessage(
        getApiErrorMessage(
          error,
          t(
            'Une erreur est survenue. Réessayez dans un instant.',
            'Something went wrong. Please try again shortly.',
          ),
        ),
      );
      setDialog('error');
    }
  };

  const headerTitle = claim
    ? offerName || t('Carte à gratter', 'Scratch card')
    : offer
      ? offerName
      : t('Tickets à gratter', 'Scratch tickets');

  const renderChooser = () => (
    <>
      <AppText size={13} color={colors.inkMuted} style={styles.lead}>
        {t(
          'Choisissez votre ticket, grattez et découvrez une réduction chez un commerce d’EtherBay.',
          'Pick a ticket, scratch it and discover a discount at an EtherBay shop.',
        )}
      </AppText>
      <View style={styles.offers}>
        <ScratchOfferCard offer="violet" onPress={() => setOffer('violet')} />
        <ScratchOfferCard offer="lucky" onPress={() => setOffer('lucky')} />
      </View>
    </>
  );

  const renderOffer = () => (
    <>
      <View style={[styles.hero, { backgroundColor: theme.background }]}>
        <Pill label={t('Ticket à gratter', 'Scratch ticket')} tone="surface" />
        <AppText size={28} weight="bold" style={styles.heroTitle}>
          {offerName}
        </AppText>
        <AppText size={13} color={colors.ink}>
          {t(
            'Une réduction chez un commerce partenaire d’EtherBay est cachée sous la zone à gratter.',
            'A discount at an EtherBay partner shop is hidden under the scratch area.',
          )}
        </AppText>
        <View style={[styles.zonePreview, { backgroundColor: colors.surface }]}>
          {[0, 1, 2].map((index) => (
            <View key={index} style={[styles.previewCell, { backgroundColor: theme.cell }]}>
              <AppText
                size={theme.symbolSize + 8}
                weight="bold"
                color={theme.accent}
                align="center"
              >
                {theme.symbol}
              </AppText>
            </View>
          ))}
        </View>
      </View>

      <Card style={styles.block}>
        <View style={styles.costRow}>
          <AppText size={13} color={colors.inkMuted}>
            {t('Prix du ticket', 'Ticket price')}
          </AppText>
          <AppText size={14} weight="bold">{`${theme.cost} EtherPoints`}</AppText>
        </View>
        <View style={[styles.costRow, styles.costDivider, { borderTopColor: colors.divider }]}>
          <AppText size={13} color={colors.inkMuted}>
            {t('Votre solde', 'Your balance')}
          </AppText>
          <AppText size={14} weight="bold" color={missing > 0 ? colors.terracotta : colors.ink}>
            {`${pointsBalance} EtherPoints`}
          </AppText>
        </View>
        {missing > 0 ? (
          <AppText size={11} color={colors.terracotta} style={styles.note}>
            {t(
              `Il vous manque ${missing} EtherPoints. Gagnez-en avec vos tickets, vos invitations et les missions.`,
              `You need ${missing} more EtherPoints. Earn some with tickets, invitations and quests.`,
            )}
          </AppText>
        ) : null}
      </Card>
    </>
  );

  const renderScratch = (current: ClaimedRewardCode) => (
    <>
      <View style={[styles.hero, { backgroundColor: theme.background }]}>
        <AppText size={14} weight="bold">
          {revealed
            ? t('Votre réduction', 'Your discount')
            : t('Grattez la zone', 'Scratch the area')}
        </AppText>
        <AppText size={11} weight="medium" style={styles.heroHint}>
          {revealed
            ? t(
                'Présentez ce code en caisse chez le commerçant.',
                'Show this code at the shop checkout.',
              )
            : t(
                'Glissez le doigt pour découvrir votre réduction.',
                'Slide your finger to discover your discount.',
              )}
        </AppText>
        <ScratchCanvas
          secretCode={current.uniqueCode}
          partnerName={partnerName}
          rewardTitle={current.rewardTitle}
          revealed={revealed}
          onReveal={() => setRevealed(true)}
          coverColor={theme.cell}
          accentColor={theme.accent}
          symbol={theme.symbol}
        />
      </View>
      {revealed ? (
        <Card tone="mint" style={styles.block}>
          <AppText size={14} weight="bold" color={colors.green}>
            {t('Code enregistré dans Mes codes', 'Code saved in My codes')}
          </AppText>
          <AppText size={12} color={colors.ink} style={styles.note}>
            {t(
              `${current.rewardTitle} chez ${partnerName}.`,
              `${current.rewardTitle} at ${partnerName}.`,
            )}
          </AppText>
        </Card>
      ) : null}
    </>
  );

  const footer = claim ? (
    revealed ? (
      <View style={styles.footer}>
        <AppButton
          title={t('Voir mes codes', 'See my codes')}
          rightIcon="arrowRight"
          align="space-between"
          onPress={() => navigation.replace('MyCodes')}
        />
        {offer ? (
          <AppButton
            title={t('Rejouer', 'Play again')}
            variant="ghost"
            size="md"
            onPress={() => {
              setClaim(null);
              setRevealed(false);
            }}
          />
        ) : null}
      </View>
    ) : (
      <AppButton
        title={t('Tout révéler', 'Reveal all')}
        variant="dark"
        onPress={() => setRevealed(true)}
        accessibilityHint={t(
          'Découvre la réduction sans gratter',
          'Shows the discount without scratching',
        )}
      />
    )
  ) : offer ? (
    <AppButton
      title={
        missing > 0
          ? t(`Encore ${missing} EtherPoints`, `${missing} EtherPoints to go`)
          : t(`Gratter pour ${theme.cost} EtherPoints`, `Scratch for ${theme.cost} EtherPoints`)
      }
      rightIcon={missing > 0 ? undefined : 'arrowRight'}
      align={missing > 0 ? 'center' : 'space-between'}
      disabled={missing > 0}
      loading={isLoading}
      onPress={() => setDialog('confirm')}
    />
  ) : undefined;

  return (
    <Screen showSecurityFooter footer={footer}>
      <ScreenHeader
        title={headerTitle}
        subtitle={t(
          'Payé en EtherPoints, aucun argent réel',
          'Paid with EtherPoints, no real money',
        )}
        onBack={() => navigation.goBack()}
      />

      {claim ? renderScratch(claim) : offer ? renderOffer() : renderChooser()}

      <ResultDialog
        visible={dialog === 'confirm'}
        status="info"
        title={t(`Jouer à ${offerName} ?`, `Play ${offerName}?`)}
        message={t(
          `${theme.cost} EtherPoints seront débités de votre solde (${pointsBalance} EtherPoints).`,
          `${theme.cost} EtherPoints will be deducted from your balance (${pointsBalance} EtherPoints).`,
        )}
        primaryLabel={t(`Payer ${theme.cost} EtherPoints`, `Pay ${theme.cost} EtherPoints`)}
        onPrimary={handleBuy}
        secondaryLabel={t('Annuler', 'Cancel')}
        onSecondary={() => setDialog('none')}
      />

      <ResultDialog
        visible={dialog === 'age'}
        status="info"
        title={t('Vérifiez votre âge', 'Verify your age')}
        message={t(
          'Les jeux sont réservés aux personnes majeures. Envoyez votre pièce d’identité pour débloquer les tickets à gratter.',
          'Games are for adults only. Send your ID to unlock scratch tickets.',
        )}
        primaryLabel={t('Vérifier mon âge', 'Verify my age')}
        onPrimary={() => {
          setDialog('none');
          navigation.navigate('VerifyAge');
        }}
        secondaryLabel={t('Plus tard', 'Later')}
        onSecondary={() => setDialog('none')}
      />

      <ResultDialog
        visible={dialog === 'error'}
        status="error"
        title={errorTitle}
        message={errorMessage}
        primaryLabel={t('Fermer', 'Close')}
        onPrimary={() => setDialog('none')}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  lead: {
    marginBottom: 16,
  },
  offers: {
    flexDirection: 'row',
    gap: 12,
  },
  hero: {
    borderRadius: 24,
    padding: 18,
  },
  heroTitle: {
    marginTop: 14,
    marginBottom: 8,
  },
  heroHint: {
    marginTop: 4,
    marginBottom: 14,
  },
  zonePreview: {
    flexDirection: 'row',
    gap: 8,
    borderRadius: 16,
    padding: 10,
    marginTop: 18,
  },
  previewCell: {
    flex: 1,
    height: 58,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  block: {
    marginTop: 14,
  },
  costRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  costDivider: {
    borderTopWidth: 1,
  },
  note: {
    marginTop: 6,
  },
  footer: {
    gap: 4,
  },
});

export default ScratchCardScreen;
