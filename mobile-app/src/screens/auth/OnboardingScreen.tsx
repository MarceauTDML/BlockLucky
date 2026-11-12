import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import TextLink from '../../components/auth/TextLink';
import AppButton from '../../components/ui/AppButton';
import AppText from '../../components/ui/AppText';
import BrandLogo from '../../components/ui/BrandLogo';
import Card, { CardTone } from '../../components/ui/Card';
import Pill from '../../components/ui/Pill';
import Screen from '../../components/ui/Screen';
import SecurityFooter from '../../components/ui/SecurityFooter';
import Icon, { IconName } from '../../components/ui/icons/Icon';
import useAppTheme from '../../hooks/useAppTheme';
import useAuth from '../../hooks/useAuth';
import { useAuthNavigation } from '../../navigation/hooks';

interface Slide {
  key: string;
  icon: IconName;
  tone: CardTone;
  badge: 'sunSoft' | 'surface';
  colored: boolean;
  title: string;
  description: string;
}

const OnboardingScreen: React.FC = () => {
  const { colors, language, setLanguage, t } = useAppTheme();
  const navigation = useAuthNavigation();
  const { markOnboardingComplete } = useAuth();
  const [index, setIndex] = useState(0);

  const slides: Slide[] = [
    {
      key: 'draw',
      icon: 'ticket',
      tone: 'sun',
      badge: 'sunSoft',
      colored: false,
      title: t('La loterie citoyenne d’EtherBay', 'The EtherBay community lottery'),
      description: t(
        'Un ticket par habitant pour le grand tirage de la ville, enregistré et vérifiable sur la blockchain.',
        'One ticket per resident for the city’s big draw, recorded and verifiable on the blockchain.',
      ),
    },
    {
      key: 'live',
      icon: 'wheel',
      tone: 'lavender',
      badge: 'surface',
      colored: true,
      title: t('Un tirage en direct, sans trucage', 'A live, fair draw'),
      description: t(
        'Rejoignez la salle d’attente, suivez la roulette et découvrez le ticket gagnant en même temps que tout le monde.',
        'Join the waiting room, watch the wheel and discover the winning ticket at the same time as everyone else.',
      ),
    },
    {
      key: 'wallet',
      icon: 'gift',
      tone: 'mint',
      badge: 'surface',
      colored: false,
      title: t('Un portefeuille déjà prêt', 'A ready-made wallet'),
      description: t(
        'La Mairie vous offre des ETH fictifs pour jouer. Aucun argent réel, et l’accès est réservé aux 18 ans et plus.',
        'The City Hall gives you fictitious ETH to play. No real money, and access is reserved for people aged 18 and over.',
      ),
    },
  ];

  const slide = slides[index];
  const isLast = index === slides.length - 1;

  const finish = (target: 'SignIn' | 'SignUp') => {
    markOnboardingComplete();
    navigation.replace(target);
  };

  return (
    <Screen scroll={false} edges={['top', 'left', 'right', 'bottom']} contentStyle={styles.content}>
      <View style={styles.topBar}>
        <BrandLogo />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('Passer en anglais', 'Switch to French')}
          onPress={() => setLanguage(language === 'FR' ? 'EN' : 'FR')}
          hitSlop={8}
          style={[styles.lang, { backgroundColor: colors.surface }]}
        >
          <Icon name="globe" size={16} color={colors.ink} />
          <AppText size={11} weight="semibold">
            {language === 'FR' ? 'FR' : 'EN'}
          </AppText>
        </Pressable>
      </View>

      <View style={styles.body}>
        <Card tone={slide.tone} radius={32} padding={0} style={styles.visual}>
          <View
            style={[
              styles.iconHalo,
              { backgroundColor: slide.badge === 'sunSoft' ? colors.sunSoft : colors.surface },
            ]}
          >
            <Icon name={slide.icon} size={72} color={slide.colored ? undefined : colors.onSun} />
          </View>
        </Card>

        <Pill
          label={t(
            `Étape ${index + 1} sur ${slides.length}`,
            `Step ${index + 1} of ${slides.length}`,
          )}
          tone="surface"
          uppercase={false}
        />
        <AppText size={28} weight="bold" accessibilityRole="header" style={styles.title}>
          {slide.title}
        </AppText>
        <AppText size={13} color={colors.inkMuted}>
          {slide.description}
        </AppText>

        <View
          style={styles.dots}
          accessible
          accessibilityLabel={t(
            `Étape ${index + 1} sur ${slides.length}`,
            `Step ${index + 1} of ${slides.length}`,
          )}
        >
          {slides.map((item, position) => (
            <View
              key={item.key}
              style={[
                styles.dot,
                {
                  width: position === index ? 24 : 8,
                  backgroundColor: position === index ? colors.ink : colors.separator,
                },
              ]}
            />
          ))}
        </View>
      </View>

      <View style={styles.footer}>
        <AppButton
          title={isLast ? t('Créer mon compte', 'Create my account') : t('Suivant', 'Next')}
          rightIcon={isLast ? undefined : 'arrowRight'}
          onPress={() => (isLast ? finish('SignUp') : setIndex(index + 1))}
        />
        <TextLink
          label={t('J’ai déjà un compte', 'I already have an account')}
          onPress={() => finish('SignIn')}
        />
        <SecurityFooter />
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: {
    justifyContent: 'space-between',
    paddingBottom: 8,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lang: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: 18,
  },
  body: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 20,
  },
  visual: {
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  iconHalo: {
    width: 132,
    height: 132,
    borderRadius: 66,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    marginTop: 14,
    marginBottom: 10,
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 24,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  footer: {
    gap: 6,
  },
});

export default OnboardingScreen;
