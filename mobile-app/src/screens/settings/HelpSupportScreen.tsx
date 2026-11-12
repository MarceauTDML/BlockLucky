import React from 'react';
import { Linking, StyleSheet, View } from 'react-native';

import ListGroup from '../../components/profile/ListGroup';
import AppText from '../../components/ui/AppText';
import Card from '../../components/ui/Card';
import ListRow from '../../components/ui/ListRow';
import Loader from '../../components/ui/Loader';
import Pill from '../../components/ui/Pill';
import Screen from '../../components/ui/Screen';
import ScreenHeader from '../../components/ui/ScreenHeader';
import SectionHeader from '../../components/ui/SectionHeader';
import useAppTheme from '../../hooks/useAppTheme';
import { useRootNavigation } from '../../navigation/hooks';
import { useGetTransparencyCharterQuery } from '../../store/api/lotteryApi';

const SUPPORT_EMAIL = 'dsi@etherbay.fr';

export const HelpSupportScreen: React.FC = () => {
  const { colors, language, t } = useAppTheme();
  const navigation = useRootNavigation();
  const { data, isLoading } = useGetTransparencyCharterQuery();
  const charter = data?.data;

  const fallbackSections = [
    {
      heading: t('Registre public', 'Public ledger'),
      body: t(
        'Chaque participation et chaque tirage sont inscrits sur la blockchain. Personne ne peut modifier le résultat.',
        'Every entry and draw is recorded on the blockchain. Nobody can alter the outcome.',
      ),
    },
    {
      heading: t('Tirage vérifiable', 'Verifiable draw'),
      body: t(
        'Le gagnant est désigné par un tirage aléatoire dont la preuve peut être vérifiée par tous.',
        'The winner is picked by a random draw whose proof anyone can verify.',
      ),
    },
    {
      heading: t('Remboursement automatique', 'Automatic refund'),
      body: t(
        'Si le tirage est annulé, les ETH fictifs engagés sont rendus automatiquement.',
        'If the draw is cancelled, the play ETH spent is refunded automatically.',
      ),
    },
  ];

  const sections =
    language === 'FR' && charter?.sections?.length ? charter.sections : fallbackSections;
  const tones = ['lavender', 'mint', 'peach'] as const;

  const openMail = () => {
    Linking.openURL(`mailto:${SUPPORT_EMAIL}`).catch(() => {});
  };

  return (
    <Screen showSecurityFooter>
      <ScreenHeader
        title={t('Aide et support', 'Help and support')}
        subtitle={t('Règles, transparence et contact', 'Rules, transparency and contact')}
        onBack={() => navigation.goBack()}
      />

      <ListGroup>
        <ListRow
          title={t('Comment se passe le tirage ?', 'How does the draw work?')}
          subtitle={t('Règles, salle d’attente, révélation', 'Rules, waiting room, reveal')}
          icon="wheel"
          iconTone="sun"
          onPress={() => navigation.navigate('HowItWorks')}
          divider
        />
        <ListRow
          title={t('Contacter la Mairie', 'Contact the city hall')}
          subtitle={SUPPORT_EMAIL}
          icon="envelope"
          iconTone="lavender"
          onPress={openMail}
          divider
        />
        <ListRow
          title={t('Mes notifications', 'My notifications')}
          icon="bell"
          iconTone="mint"
          onPress={() => navigation.navigate('Notifications')}
        />
      </ListGroup>

      <SectionHeader
        title={
          language === 'FR' && charter?.title
            ? charter.title
            : t('Charte de transparence', 'Transparency charter')
        }
        right={
          charter?.version ? (
            <Pill label={`v${charter.version}`} tone="surface" uppercase={false} />
          ) : undefined
        }
      />

      {isLoading ? (
        <Loader message={t('Chargement de la charte...', 'Loading the charter...')} />
      ) : (
        <View style={styles.sections}>
          {sections.map((section, index) => (
            <Card key={section.heading} tone={tones[index % tones.length]}>
              <AppText size={14} weight="bold">
                {section.heading}
              </AppText>
              <AppText size={12} color={colors.ink} style={styles.body}>
                {section.body}
              </AppText>
            </Card>
          ))}
        </View>
      )}

      <AppText size={11} color={colors.inkMuted} align="center" style={styles.footnote}>
        {t(
          'BlockLucky est un jeu citoyen gratuit de la Ville d’EtherBay. Aucun argent réel n’est engagé.',
          'BlockLucky is a free civic game by the City of EtherBay. No real money is involved.',
        )}
      </AppText>
    </Screen>
  );
};

const styles = StyleSheet.create({
  sections: {
    gap: 12,
  },
  body: {
    marginTop: 6,
    lineHeight: 18,
  },
  footnote: {
    marginTop: 20,
  },
});

export default HelpSupportScreen;
