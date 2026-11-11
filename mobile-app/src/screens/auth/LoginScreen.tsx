import React, { useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Modal,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../types/navigation.types';
import useAppTheme from '../../hooks/useAppTheme';
import useAuth from '../../hooks/useAuth';
import useCitizenWallet from '../../hooks/useCitizenWallet';
import AppText from '../../components/ui/AppText';
import AppInput from '../../components/ui/AppInput';
import AppButton from '../../components/ui/AppButton';
import { isValidEmail } from '../../utils/validators.util';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const { colors, borderRadius, spacing, language, setLanguage, t } =
    useAppTheme();
  const { loginWithSocial, isLoggingIn } = useAuth();
  const { generateDeterministicWallet } = useCitizenWallet();

  const [email, setEmail] = useState('citoyen@etherbay.fr');
  const [referralCode, setReferralCode] = useState('');
  const [ageGroup, setAgeGroup] = useState<'18-25' | '26-35' | '36-50' | '50+'>('18-25');
  const [isAdultConfirmed, setIsAdultConfirmed] = useState(false);
  const [ageModalVisible, setAgeModalVisible] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSocialAuth = async (provider: 'GOOGLE' | 'EMAIL') => {
    setErrorMessage('');

    if (!isAdultConfirmed) {
      setAgeModalVisible(true);
      return;
    }

    if (provider === 'EMAIL' && !isValidEmail(email)) {
      setErrorMessage(
        t('Veuillez saisir une adresse email valide.', 'Please enter a valid email address.')
      );
      return;
    }

    const seed = email.trim() || `${provider.toLowerCase()}-user@etherbay.fr`;
    const walletAddress = generateDeterministicWallet(seed);

    try {
      const result = await loginWithSocial({
        walletAddress,
        email: seed,
        provider,
        isAdultConfirmed: true,
        ageGroup,
        ...(referralCode.trim() ? { referralCode: referralCode.trim() } : {}),
        utmSource: 'MOBILE_APP',
      });

      if (result.requiresTwoFactor && result.userId && result.method) {
        navigation.navigate('Verify2FA', {
          userId: result.userId,
          method: result.method,
          email: result.email,
        });
      }
    } catch (err: any) {
      setErrorMessage(
        err?.data?.message ||
          t('Impossible de vous connecter au serveur.', 'Unable to connect to the server.')
      );
    }
  };

  return (
    <SafeAreaView
      edges={['top', 'bottom', 'left', 'right']}
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 24}
      >
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { padding: spacing.lg, paddingBottom: spacing.xxl },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.topRow}>
            <AppText variant="caption" weight="medium" color={colors.secondary}>
              BlockLucky • EtherBay
            </AppText>
            <TouchableOpacity
              onPress={() => setLanguage(language === 'FR' ? 'EN' : 'FR')}
              style={[
                styles.langBtn,
                {
                  backgroundColor: colors.surfaceElevated,
                  borderRadius: borderRadius.sm,
                  borderColor: colors.border,
                },
              ]}
            >
              <AppText variant="caption" weight="semibold" color={colors.textPrimary}>
                {language}
              </AppText>
            </TouchableOpacity>
          </View>

          <View style={styles.headerBlock}>
            <AppText variant="title" weight="bold" style={styles.title}>
              {t('Connexion citoyenne', 'Citizen Sign In')}
            </AppText>
            <AppText variant="body" color={colors.textSecondary}>
              {t(
                'Accédez à la loterie municipale avec votre compte habituel. Un portefeuille BlockLucky intégré est créé pour vous et crédité d une dotation de bienvenue en ethers fictifs par la Mairie.',
                'Access the municipal lottery with your account. An integrated BlockLucky wallet is created for you and credited with a welcome grant of fictitious ETH by the City Hall.'
              )}
            </AppText>
          </View>

          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.surface,
                borderRadius: borderRadius.lg,
                borderColor: colors.border,
                padding: spacing.lg,
              },
            ]}
          >
            <TouchableOpacity
              onPress={() => setIsAdultConfirmed((prev) => !prev)}
              style={[
                styles.ageCheckBanner,
                {
                  backgroundColor: colors.surfaceElevated,
                  borderColor: isAdultConfirmed ? colors.primary : colors.border,
                  borderRadius: borderRadius.md,
                },
              ]}
            >
              <View
                style={[
                  styles.checkbox,
                  {
                    backgroundColor: isAdultConfirmed
                      ? colors.primary
                      : 'transparent',
                    borderColor: isAdultConfirmed
                      ? colors.primary
                      : colors.textMuted,
                  },
                ]}
              />
              <AppText variant="caption" weight="medium" color={colors.textPrimary} style={styles.flex}>
                {t(
                  'Je certifie être majeur (18 ans et plus)',
                  'I confirm that I am 18 years of age or older'
                )}
              </AppText>
            </TouchableOpacity>

            <AppText
              variant="caption"
              weight="medium"
              color={colors.textSecondary}
              style={styles.sectionLabel}
            >
              {t('Tranche d âge', 'Age group')}
            </AppText>
            <View style={styles.agePillsRow}>
              {(['18-25', '26-35', '36-50', '50+'] as const).map((group) => (
                <TouchableOpacity
                  key={group}
                  onPress={() => setAgeGroup(group)}
                  style={[
                    styles.agePill,
                    {
                      backgroundColor:
                        ageGroup === group
                          ? colors.primary
                          : colors.surfaceElevated,
                      borderRadius: borderRadius.sm,
                    },
                  ]}
                >
                  <AppText
                    variant="caption"
                    weight="medium"
                    color={ageGroup === group ? '#F7F6F2' : colors.textSecondary}
                  >
                    {group}
                  </AppText>
                </TouchableOpacity>
              ))}
            </View>

            <AppInput
              label={t('Adresse email', 'Email address')}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="citoyen@etherbay.fr"
            />

            <AppInput
              label={t('Code de parrainage (optionnel)', 'Referral code (optional)')}
              value={referralCode}
              onChangeText={setReferralCode}
              autoCapitalize="none"
              placeholder={t('Code ambassadeur', 'Referral code')}
            />

            {errorMessage ? (
              <AppText variant="caption" color={colors.error} style={styles.errorText}>
                {errorMessage}
              </AppText>
            ) : null}

            <View style={styles.socialButtons}>
              <AppButton
                title={t('Continuer avec Google', 'Continue with Google')}
                onPress={() => handleSocialAuth('GOOGLE')}
                loading={isLoggingIn}
              />
              <AppButton
                title={t(
                  'Connexion par email sans mot de passe',
                  'Passwordless Email Sign In'
                )}
                variant="outline"
                onPress={() => handleSocialAuth('EMAIL')}
                loading={isLoggingIn}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={ageModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalBox,
              {
                backgroundColor: colors.surface,
                borderRadius: borderRadius.lg,
                borderColor: colors.border,
              },
            ]}
          >
            <AppText variant="caption" weight="medium" color={colors.secondary}>
              {t('Cadre réglementaire', 'Regulatory Notice')}
            </AppText>
            <AppText variant="subtitle" weight="bold" style={styles.modalTitle}>
              {t('Vérification de majorité (18+)', 'Age Verification (18+)')}
            </AppText>
            <AppText variant="body" color={colors.textSecondary} style={styles.modalBody}>
              {t(
                'La participation à la loterie de la Ville d EtherBay est réservée aux personnes majeures (18 ans révolus).',
                'Participation in the City of EtherBay lottery is strictly reserved for adults (18 years and older).'
              )}
            </AppText>
            <AppButton
              title={t('Je confirme avoir 18 ans ou plus', 'I confirm I am 18 or older')}
              onPress={() => {
                setIsAdultConfirmed(true);
                setAgeModalVisible(false);
              }}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  langBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
  },
  headerBlock: {
    marginBottom: 18,
  },
  title: {
    marginVertical: 4,
  },
  card: {
    borderWidth: 1,
  },
  ageCheckBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    marginBottom: 14,
    gap: 10,
  },
  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1.5,
  },
  sectionLabel: {
    marginBottom: 6,
  },
  agePillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  agePill: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
  },
  errorText: {
    marginBottom: 10,
  },
  socialButtons: {
    gap: 10,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(20, 20, 19, 0.52)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalBox: {
    padding: 22,
    borderWidth: 1,
    width: '100%',
  },
  modalTitle: {
    marginVertical: 8,
  },
  modalBody: {
    marginBottom: 18,
  },
});

export default LoginScreen;
