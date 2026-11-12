import React from 'react';
import { Linking, StyleSheet, View } from 'react-native';

import {
  formatInteger,
  formatTicketPrice,
  resolvePhase,
} from '../../components/lottery/lotteryFormat';
import AppButton from '../../components/ui/AppButton';
import AppText from '../../components/ui/AppText';
import Card from '../../components/ui/Card';
import ListRow from '../../components/ui/ListRow';
import Screen from '../../components/ui/Screen';
import ScreenHeader from '../../components/ui/ScreenHeader';
import SectionHeader from '../../components/ui/SectionHeader';
import StepList from '../../components/ui/StepList';
import Icon, { IconName } from '../../components/ui/icons/Icon';
import useAppTheme from '../../hooks/useAppTheme';
import { useRootNavigation } from '../../navigation/hooks';
import {
  useGetLotteryStatusQuery,
  useGetTransparencyCharterQuery,
} from '../../store/api/lotteryApi';

interface InfoBlock {
  icon: IconName;
  tone: 'mint' | 'peach' | 'sunPale' | 'lavender';
  title: string;
  body: string;
}

const HowItWorksScreen: React.FC = () => {
  const { colors, t } = useAppTheme();
  const navigation = useRootNavigation();
  const { data: statusRes } = useGetLotteryStatusQuery();
  const { data: charterRes } = useGetTransparencyCharterQuery();

  const status = statusRes?.data;
  const phase = resolvePhase(status?.round);
  const maxParticipants =
    status?.round.maxParticipants ?? status?.progression.targetParticipants ?? 10000;
  const price = status?.round.ticketPriceEth;
  const explorerUrl = status?.blockchain?.lotteryExplorerUrl ?? null;
  const vrfCertified = Boolean(status?.guarantees.vrfCertified) && !status?.guarantees.simulated;
  const charter = charterRes?.data;
  const maxLabel = formatInteger(maxParticipants);

  const blocks: InfoBlock[] = [
    {
      icon: 'shield',
      tone: 'mint',
      title: t('Un tirage vérifiable', 'A verifiable draw'),
      body: vrfCertified
        ? t(
            'Le gagnant est désigné par un Smart Contract public, avec un nombre aléatoire certifié par Chainlink VRF. Personne, pas même la Mairie, ne peut choisir le résultat.',
            'The winner is picked by a public Smart Contract using a random number certified by Chainlink VRF. Nobody, not even the City, can choose the result.',
          )
        : t(
            'Le gagnant est désigné par le Smart Contract selon des règles publiques et identiques pour tous. En mode démonstration, le tirage est simulé.',
            'The winner is picked by the Smart Contract under public rules that are the same for everyone. In demo mode, the draw is simulated.',
          ),
    },
    {
      icon: 'bag',
      tone: 'peach',
      title: t('Les lots des commerces', 'Local shop prizes'),
      body: t(
        'En plus de la cagnotte, les commerçants d’EtherBay offrent des lots au gagnant. Vos EtherPoints deviennent aussi des réductions dans leurs boutiques.',
        'On top of the prize pool, EtherBay shops offer prizes to the winner. Your EtherPoints also become discounts in their stores.',
      ),
    },
    {
      icon: 'lock',
      tone: 'sunPale',
      title: t('Une monnaie fictive', 'A fictional currency'),
      body: t(
        'Les ETH utilisés sont fictifs et offerts par la Mairie à l’inscription. Ils n’ont aucune valeur réelle : vous ne dépensez jamais d’argent.',
        'The ETH used is fictional and granted by the City when you sign up. It has no real value: you never spend real money.',
      ),
    },
  ];

  const toneColor = (tone: InfoBlock['tone']) =>
    tone === 'mint'
      ? colors.green
      : tone === 'peach'
        ? colors.terracotta
        : tone === 'lavender'
          ? colors.violet
          : colors.onSun;

  return (
    <Screen showSecurityFooter>
      <ScreenHeader
        title={t('Comment ça marche', 'How it works')}
        subtitle={t('Le grand tirage d’EtherBay', 'The EtherBay grand draw')}
        onBack={() => navigation.goBack()}
      />

      <Card tone="sun" radius={28} elevated>
        <AppText variant="hero" color={colors.onSun} accessibilityRole="header">
          {t('Un jeu gratuit, pour votre ville.', 'A free game, for your city.')}
        </AppText>
        <AppText size={12} weight="medium" color={colors.onSun} style={styles.introBody}>
          {t(
            'Chaque citoyen peut prendre un ticket avec les ETH fictifs offerts par la Mairie. Les règles sont les mêmes pour tous et le résultat se vérifie.',
            'Every citizen can take a ticket with the fictional ETH granted by the City. The rules are the same for everyone and the result can be verified.',
          )}
        </AppText>
      </Card>

      <SectionHeader title={t('Les règles du jeu', 'The rules')} />
      <Card padding={16} radius={23}>
        <StepList
          variant="numbered"
          steps={[
            {
              title: t(
                'Un seul ticket par participant et par grand tirage.',
                'Only one ticket per participant per grand draw.',
              ),
              description:
                price !== undefined
                  ? t(
                      `Il coûte ${formatTicketPrice(price)} ETH fictif, débité de votre portefeuille.`,
                      `It costs ${formatTicketPrice(price)} fictional ETH, taken from your wallet.`,
                    )
                  : undefined,
            },
            {
              title: t(
                'Vous pouvez offrir un ticket à un proche.',
                'You can gift a ticket to a loved one.',
              ),
              description: t(
                'Vous l’achetez pour lui avec son adresse e-mail.',
                'You buy it for them with their e-mail address.',
              ),
            },
            {
              title: t(
                'Un seul gagnant remporte la cagnotte.',
                'A single winner takes the prize pool.',
              ),
              description: t(
                'Elle est versée dans son portefeuille, avec les lots des commerces.',
                'It is paid into their wallet, along with the shop prizes.',
              ),
            },
            {
              title: t(
                'Si le tirage est annulé, tout le monde est remboursé.',
                'If the draw is cancelled, everyone is refunded.',
              ),
              description: t('Le remboursement est automatique.', 'The refund is automatic.'),
            },
          ]}
        />
      </Card>

      <SectionHeader
        title={t('Le calendrier d’un tirage', 'A draw’s timeline')}
        subtitle={t(
          'La première limite atteinte ouvre la salle.',
          'The first limit reached opens the room.',
        )}
      />
      <Card tone="lavender" padding={16}>
        <StepList
          variant="badge"
          steps={[
            {
              title: t('Les achats sont ouverts', 'Sales are open'),
              description: t(
                'Prenez votre ticket depuis l’accueil, en un clic.',
                'Take your ticket from the home screen, in one tap.',
              ),
            },
            {
              title: t(
                `À 0:00 ou à ${maxLabel} inscrits`,
                `At midnight or at ${maxLabel} sign-ups`,
              ),
              description: t(
                'Les achats se ferment et la salle d’attente ouvre.',
                'Sales close and the waiting room opens.',
              ),
            },
            {
              title: t('10 minutes dans la salle d’attente', '10 minutes in the waiting room'),
              description: t(
                'Tous les participants attendent ensemble la révélation.',
                'All participants wait together for the reveal.',
              ),
            },
            {
              title: t('La roulette révèle le gagnant', 'The wheel reveals the winner'),
              description: t(
                'Le numéro gagnant s’affiche en direct, et dans « Mes tickets ».',
                'The winning number is shown live and in “My tickets”.',
              ),
            },
          ]}
        />
      </Card>

      <SectionHeader title={t('Nos engagements', 'Our commitments')} />
      <View style={styles.blocks}>
        {blocks.map((block) => (
          <Card key={block.title} tone={block.tone} radius={22}>
            <View style={styles.blockHead}>
              <Icon name={block.icon} size={22} color={toneColor(block.tone)} />
              <AppText
                size={16}
                weight="bold"
                color={block.tone === 'sunPale' ? colors.onSun : colors.ink}
                style={styles.flex}
              >
                {block.title}
              </AppText>
            </View>
            <AppText
              size={12}
              color={block.tone === 'sunPale' ? colors.onSun : colors.ink}
              style={styles.blockBody}
            >
              {block.body}
            </AppText>
          </Card>
        ))}
      </View>

      {charter && charter.sections.length > 0 ? (
        <>
          <SectionHeader
            title={t('La charte de transparence', 'The transparency charter')}
            subtitle={
              charter.version
                ? t(`Version ${charter.version}`, `Version ${charter.version}`)
                : undefined
            }
          />
          <Card padding={16}>
            {charter.sections.map((section, index) => (
              <View
                key={section.heading}
                style={[
                  styles.charterItem,
                  index > 0 ? { borderTopWidth: 1, borderTopColor: colors.divider } : null,
                ]}
              >
                <AppText size={13} weight="semibold">
                  {section.heading}
                </AppText>
                <AppText size={11} color={colors.inkMuted} style={styles.charterBody}>
                  {section.body}
                </AppText>
              </View>
            ))}
            {explorerUrl ? (
              <ListRow
                title={t('Voir le Smart Contract', 'View the Smart Contract')}
                subtitle={t('Sur l’explorateur de blocs', 'On the block explorer')}
                icon="globe"
                iconTone="mint"
                onPress={() => Linking.openURL(explorerUrl)}
              />
            ) : null}
          </Card>
        </>
      ) : null}

      {phase === 'OPEN' ? (
        <View style={styles.cta}>
          <AppButton
            title={t('Prendre mon ticket', 'Get my ticket')}
            rightIcon="arrowRight"
            onPress={() => navigation.navigate('BuyTicket')}
          />
        </View>
      ) : null}
    </Screen>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  introBody: {
    marginTop: 10,
  },
  blocks: {
    gap: 12,
  },
  blockHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  blockBody: {
    marginTop: 8,
  },
  charterItem: {
    paddingVertical: 12,
  },
  charterBody: {
    marginTop: 4,
  },
  cta: {
    marginTop: 30,
  },
});

export default HowItWorksScreen;
