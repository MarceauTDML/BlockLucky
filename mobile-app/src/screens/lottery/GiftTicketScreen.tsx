import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import DialogSummary from '../../components/lottery/DialogSummary';
import {
  formatEth,
  formatRoundNumber,
  formatTicketPrice,
  resolvePhase,
} from '../../components/lottery/lotteryFormat';
import AppButton from '../../components/ui/AppButton';
import AppInput from '../../components/ui/AppInput';
import AppText from '../../components/ui/AppText';
import Card from '../../components/ui/Card';
import ResultDialog from '../../components/ui/ResultDialog';
import Screen from '../../components/ui/Screen';
import ScreenHeader from '../../components/ui/ScreenHeader';
import SectionHeader from '../../components/ui/SectionHeader';
import StepList from '../../components/ui/StepList';
import Icon from '../../components/ui/icons/Icon';
import useAppTheme from '../../hooks/useAppTheme';
import useCitizenWallet from '../../hooks/useCitizenWallet';
import { useRootNavigation } from '../../navigation/hooks';
import { useGetLotteryStatusQuery, useGetWalletQuery } from '../../store/api/lotteryApi';
import { GiftTicketResponse } from '../../types/api.types';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MESSAGE_MAX = 250;

type DialogState =
  | { kind: 'none' }
  | { kind: 'success'; data: GiftTicketResponse }
  | { kind: 'failed'; title: string; message: string; canRetry: boolean }
  | { kind: 'already'; message: string }
  | { kind: 'age'; message: string };

const GiftTicketScreen: React.FC = () => {
  const { colors, t } = useAppTheme();
  const navigation = useRootNavigation();
  const { sendGiftTicket, isGifting } = useCitizenWallet();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [touched, setTouched] = useState(false);
  const [dialog, setDialog] = useState<DialogState>({ kind: 'none' });

  const statusQuery = useGetLotteryStatusQuery();
  const walletQuery = useGetWalletQuery();
  const round = statusQuery.data?.data?.round;
  const phase = resolvePhase(round);
  const price = round?.ticketPriceEth ?? 0;
  const balance = walletQuery.data?.data?.balanceEth ?? null;
  const sufficient = balance === null || balance >= price;
  const closed = Boolean(round) && phase !== 'OPEN';
  const roundLabel = formatRoundNumber(round?.contractRoundId);
  const trimmedEmail = email.trim().toLowerCase();
  const emailValid = EMAIL_PATTERN.test(trimmedEmail);
  const emailError =
    touched && !emailValid
      ? t('Saisissez une adresse e-mail valide.', 'Enter a valid e-mail address.')
      : undefined;

  const handleSend = async () => {
    setTouched(true);
    if (!emailValid) return;
    const outcome = await sendGiftTicket(trimmedEmail, message.trim());
    switch (outcome.status) {
      case 'SUCCESS':
        setDialog({ kind: 'success', data: outcome.data });
        walletQuery.refetch();
        break;
      case 'ALREADY_OWNED':
        setDialog({ kind: 'already', message: outcome.message });
        break;
      case 'AGE_REQUIRED':
        setDialog({ kind: 'age', message: outcome.message });
        break;
      default:
        setDialog({
          kind: 'failed',
          title: t('Le cadeau n’a pas abouti.', 'The gift did not go through.'),
          message: outcome.message,
          canRetry: outcome.canRetry,
        });
    }
  };

  const resetForm = () => {
    setEmail('');
    setMessage('');
    setTouched(false);
    setDialog({ kind: 'none' });
  };

  const buttonTitle = closed
    ? t('Achats clos pour ce tirage', 'Sales closed for this draw')
    : !sufficient
      ? t('Solde insuffisant', 'Insufficient balance')
      : t('Offrir ce ticket par e-mail', 'Gift this ticket by e-mail');

  const footer = (
    <View>
      <View style={styles.totalRow}>
        <AppText size={13} weight="medium" style={styles.flex}>
          {t('Total · 1 ticket offert', 'Total · 1 gifted ticket')}
        </AppText>
        <AppText size={18} weight="bold">
          {price > 0
            ? t(
                `${formatTicketPrice(price)} ETH fictif`,
                `${formatTicketPrice(price)} fictional ETH`,
              )
            : '—'}
        </AppText>
      </View>
      <AppButton
        title={buttonTitle}
        rightIcon={closed || !sufficient ? undefined : 'arrowSend'}
        onPress={handleSend}
        loading={isGifting}
        disabled={!round || closed || !sufficient}
      />
    </View>
  );

  return (
    <Screen footer={footer} showSecurityFooter>
      <ScreenHeader
        title={t('Offrir un ticket', 'Gift a ticket')}
        subtitle={
          round ? t(`EtherBay · Tirage ${roundLabel}`, `EtherBay · Draw ${roundLabel}`) : 'EtherBay'
        }
        onBack={() => navigation.goBack()}
      />

      <Card tone="sun" radius={28} elevated>
        <View style={[styles.giftBadge, { backgroundColor: colors.sunPale }]}>
          <Icon name="gift" size={26} color={colors.onSun} />
        </View>
        <AppText
          variant="hero"
          color={colors.onSun}
          style={styles.heroTitle}
          accessibilityRole="header"
        >
          {t('Faites plaisir à un proche.', 'Treat someone you love.')}
        </AppText>
        <AppText size={12} weight="medium" color={colors.onSun} style={styles.heroBody}>
          {t(
            'Vous achetez son ticket pour le grand tirage avec vos ETH fictifs. Il est rattaché à son adresse e-mail, même s’il n’a pas encore de compte.',
            'You buy their grand draw ticket with your fictional ETH. It is linked to their e-mail address, even without an account yet.',
          )}
        </AppText>
        <View style={[styles.balanceBox, { backgroundColor: colors.sunLight }]}>
          <AppText size={11} weight="semibold" color={colors.onSun} style={styles.flex}>
            {t('Votre solde', 'Your balance')}
          </AppText>
          <AppText size={13} weight="bold" color={colors.onSun}>
            {walletQuery.isLoading ? '…' : formatEth(balance)}
          </AppText>
        </View>
      </Card>

      <SectionHeader title={t('À qui l’offrez-vous ?', 'Who is it for?')} />
      <Card>
        <AppInput
          label={t('E-mail du destinataire', 'Recipient e-mail')}
          icon="envelope"
          tone="muted"
          value={email}
          onChangeText={setEmail}
          onBlur={() => setTouched(true)}
          placeholder={t('prenom@exemple.fr', 'name@example.com')}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="next"
          errorText={emailError}
          accessibilityLabel={t('E-mail du destinataire', 'Recipient e-mail')}
        />
        <View style={styles.messageField}>
          <AppInput
            label={t('Un petit mot (facultatif)', 'A short note (optional)')}
            icon="chat"
            tone="muted"
            value={message}
            onChangeText={(value) => setMessage(value.slice(0, MESSAGE_MAX))}
            placeholder={t('Bonne chance pour le tirage !', 'Good luck in the draw!')}
            multiline
            maxLength={MESSAGE_MAX}
            helperText={t(
              `${message.length} / ${MESSAGE_MAX} caractères`,
              `${message.length} / ${MESSAGE_MAX} characters`,
            )}
            accessibilityLabel={t('Message personnel', 'Personal message')}
          />
        </View>
      </Card>

      <SectionHeader title={t('Bon à savoir', 'Good to know')} />
      <Card tone="lavender" padding={16}>
        <StepList
          variant="badge"
          steps={[
            {
              title: t('Un ticket par personne', 'One ticket per person'),
              description: t(
                'Si votre proche a déjà son ticket pour ce grand tirage, le cadeau n’est pas possible.',
                'If they already have a ticket for this grand draw, the gift is not possible.',
              ),
            },
            {
              title: t('Des EtherPoints pour vous', 'EtherPoints for you'),
              description: t(
                'Chaque ticket offert vous rapporte des EtherPoints, à échanger chez les commerçants.',
                'Every gifted ticket earns you EtherPoints to spend at local shops.',
              ),
            },
          ]}
        />
      </Card>
      <AppText size={10} color={colors.inkMuted} style={styles.fictional}>
        {t('Monnaie fictive, aucune valeur réelle.', 'Fictional currency, no real value.')}
      </AppText>

      <ResultDialog
        visible={dialog.kind === 'success'}
        status="success"
        title={t('Ticket offert !', 'Ticket gifted!')}
        message={
          dialog.kind === 'success'
            ? t(
                `${dialog.data.ticket.recipientEmail} participe au grand tirage ${roundLabel}. Son ticket l’attend dans son espace BlockLucky.`,
                `${dialog.data.ticket.recipientEmail} is entered in grand draw ${roundLabel}. The ticket is waiting in their BlockLucky account.`,
              )
            : undefined
        }
        primaryLabel={t('Retour à l’accueil', 'Back to home')}
        onPrimary={() => {
          setDialog({ kind: 'none' });
          navigation.navigate('Main', { screen: 'HomeTab' });
        }}
        secondaryLabel={t('Offrir un autre ticket', 'Gift another ticket')}
        onSecondary={resetForm}
      >
        {dialog.kind === 'success' ? (
          <DialogSummary
            title={
              dialog.data.ticket.ticketNumber
                ? t(
                    `Ticket n° ${dialog.data.ticket.ticketNumber} · Tirage ${roundLabel}`,
                    `Ticket no. ${dialog.data.ticket.ticketNumber} · Draw ${roundLabel}`,
                  )
                : t(
                    `1 ticket offert · Tirage ${roundLabel}`,
                    `1 gifted ticket · Draw ${roundLabel}`,
                  )
            }
            detail={t(
              `+${dialog.data.senderPointsAwarded} EtherPoints pour vous`,
              `+${dialog.data.senderPointsAwarded} EtherPoints for you`,
            )}
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
        primaryLabel={
          dialog.kind === 'failed' && dialog.canRetry
            ? t('Réessayer', 'Try again')
            : t('Compris', 'Got it')
        }
        onPrimary={() => {
          const retry = dialog.kind === 'failed' && dialog.canRetry;
          setDialog({ kind: 'none' });
          if (retry) handleSend();
        }}
        secondaryLabel={t('Revenir plus tard', 'Come back later')}
        onSecondary={() => {
          setDialog({ kind: 'none' });
          navigation.goBack();
        }}
        onRequestClose={() => setDialog({ kind: 'none' })}
      />

      <ResultDialog
        visible={dialog.kind === 'already'}
        status="info"
        title={t('Ce proche a déjà son ticket', 'They already have a ticket')}
        message={dialog.kind === 'already' ? dialog.message : undefined}
        note={t(
          'Un seul ticket par participant et par grand tirage.',
          'Only one ticket per participant per grand draw.',
        )}
        primaryLabel={t('Choisir quelqu’un d’autre', 'Pick someone else')}
        onPrimary={() => {
          setEmail('');
          setTouched(false);
          setDialog({ kind: 'none' });
        }}
        secondaryLabel={t('Fermer', 'Close')}
        onSecondary={() => setDialog({ kind: 'none' })}
      />

      <ResultDialog
        visible={dialog.kind === 'age'}
        status="info"
        title={t('Vérifiez votre âge pour jouer.', 'Verify your age to play.')}
        message={t(
          'Offrir un ticket est réservé aux personnes majeures. Envoyez une pièce d’identité pour débloquer le cadeau.',
          'Gifting a ticket is for adults only. Send an ID document to unlock gifting.',
        )}
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
  giftBadge: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    marginTop: 14,
  },
  heroBody: {
    marginTop: 8,
  },
  balanceBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginTop: 16,
  },
  messageField: {
    marginTop: 14,
  },
  fictional: {
    marginTop: 12,
    marginHorizontal: 4,
  },
});

export default GiftTicketScreen;
