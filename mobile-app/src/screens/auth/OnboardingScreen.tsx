import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../types/navigation.types';
import useAppTheme from '../../hooks/useAppTheme';
import useAuth from '../../hooks/useAuth';
import { useGetOnboardingQuery } from '../../store/api/authApi';
import AppText from '../../components/ui/AppText';
import AppButton from '../../components/ui/AppButton';

type Props = NativeStackScreenProps<AuthStackParamList, 'Onboarding'>;

export const OnboardingScreen: React.FC<Props> = ({ navigation }) => {
  const { colors, borderRadius, spacing, language, setLanguage, t } =
    useAppTheme();
  const { markOnboardingComplete } = useAuth();
  const { data } = useGetOnboardingQuery();
  const rawSlides = data?.data?.slides;

  const fallbackSlides = [
    {
      step: 1,
      title: t('Loterie citoyenne d EtherBay', 'EtherBay Community Lottery'),
      description: t(
        'Participez au tirage municipal de fin d année. Chaque participation est vérifiable et transparente sur la blockchain.',
        'Take part in the year-end city draw. Every entry is verifiable and transparent on the blockchain.'
      ),
    },
    {
      step: 2,
      title: t('Participation en un clic sans frais', 'One-click Gasless Entry'),
      description: t(
        'Les frais techniques du réseau sont pris en charge par la ville. En cas d annulation, le remboursement est automatique.',
        'Network gas fees are sponsored by the city. If the draw is cancelled, a full refund is automatic.'
      ),
    },
    {
      step: 3,
      title: t('EtherPoints et économie locale', 'EtherPoints & Local Rewards'),
      description: t(
        'Cumulez des points à chaque participation et échangez-les contre des réductions chez les commerçants d EtherBay.',
        'Earn points with every entry and redeem them for discounts at local EtherBay merchants.'
      ),
    },
    {
      step: 4,
      title: t('Tirage en direct certifié', 'Certified Live Draw'),
      description: t(
        'Rejoignez la salle d attente 10 minutes avant l échéance et recevez votre badge commémoratif POAP.',
        'Join the waiting room 10 minutes before the draw and collect your commemorative POAP badge.'
      ),
    },
  ];

  const slides =
    language === 'FR' && Array.isArray(rawSlides) && rawSlides.length > 0
      ? rawSlides
      : fallbackSlides;

  const [currentIndex, setCurrentIndex] = useState(0);
  const currentSlide = slides[currentIndex] || slides[0];

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      markOnboardingComplete();
      navigation.replace('Login');
    }
  };

  const handleSkip = () => {
    markOnboardingComplete();
    navigation.replace('Login');
  };

  return (
    <SafeAreaView
      edges={['top', 'bottom', 'left', 'right']}
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <View style={[styles.container, { padding: spacing.lg }]}>
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => setLanguage(language === 'FR' ? 'EN' : 'FR')}
            style={[
              styles.langPill,
              {
                backgroundColor: colors.surfaceElevated,
                borderRadius: borderRadius.sm,
                borderColor: colors.border,
              },
            ]}
          >
            <AppText variant="caption" weight="semibold" color={colors.textPrimary}>
              {language === 'FR' ? 'FR / EN' : 'EN / FR'}
            </AppText>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSkip}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <AppText variant="caption" weight="medium" color={colors.textMuted}>
              {t('Passer', 'Skip')}
            </AppText>
          </TouchableOpacity>
        </View>

        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderRadius: borderRadius.lg,
              borderColor: colors.border,
              padding: spacing.xl,
            },
          ]}
        >
          <View
            style={[
              styles.stepTag,
              {
                backgroundColor: colors.surfaceElevated,
                borderRadius: borderRadius.sm,
              },
            ]}
          >
            <AppText variant="caption" weight="bold" color={colors.secondary}>
              {t(
                `Étape ${currentSlide.step} / ${slides.length}`,
                `Step ${currentSlide.step} / ${slides.length}`
              )}
            </AppText>
          </View>

          <AppText variant="title" weight="bold" style={styles.slideTitle}>
            {currentSlide.title}
          </AppText>

          <AppText variant="body" color={colors.textSecondary}>
            {currentSlide.description}
          </AppText>
        </View>

        <View style={styles.footer}>
          <View style={styles.dotsRow}>
            {slides.map((s, idx) => (
              <View
                key={s.step}
                style={[
                  styles.dot,
                  {
                    backgroundColor:
                      idx === currentIndex ? colors.primary : colors.border,
                    width: idx === currentIndex ? 22 : 8,
                  },
                ]}
              />
            ))}
          </View>

          <AppButton
            title={
              currentIndex < slides.length - 1
                ? t('Suivant', 'Next')
                : t('Accéder à la connexion', 'Proceed to Sign In')
            }
            onPress={handleNext}
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  langPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
  },
  card: {
    borderWidth: 1,
  },
  stepTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 14,
  },
  slideTitle: {
    marginBottom: 10,
  },
  footer: {
    gap: 18,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
});

export default OnboardingScreen;
