import React, { useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Linking,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import useAppTheme from '../../hooks/useAppTheme';
import useAuth from '../../hooks/useAuth';
import usePoints from '../../hooks/usePoints';
import { useAppDispatch } from '../../store';
import { showPointsPopup } from '../../store/slices/uiSlice';
import { updateUserPoints } from '../../store/slices/authSlice';
import {
  useGetReferralsQuery,
  useGetQuestsQuery,
  useCompleteQuestMutation,
  useUpdatePreferencesMutation,
} from '../../store/api/authApi';
import AppText from '../../components/ui/AppText';
import AppButton from '../../components/ui/AppButton';
import { shortenWallet } from '../../utils/formatters.util';

export const ProfileScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const {
    colors,
    borderRadius,
    spacing,
    mode,
    language,
    toggleTheme,
    setLanguage,
    t,
  } = useAppTheme();
  const { user, signOut } = useAuth();
  const { pointsBalance } = usePoints();
  const dispatch = useAppDispatch();

  const { data: referralRes } = useGetReferralsQuery();
  const { data: questsRes } = useGetQuestsQuery();
  const [completeQuest] = useCompleteQuestMutation();
  const [updatePreferences] = useUpdatePreferencesMutation();

  const [copiedFeedback, setCopiedFeedback] = useState(false);

  const referralInfo = referralRes?.data;
  const rawQuests = questsRes?.data?.quests;
  const quests = Array.isArray(rawQuests) ? rawQuests : [];

  const handleCopyReferral = async () => {
    const link =
      referralInfo?.referralLink ||
      `https://etherbay.fr/invite/${user?.referralCode || 'etherbay'}`;
    await Clipboard.setStringAsync(link);
    setCopiedFeedback(true);
    setTimeout(() => setCopiedFeedback(false), 2500);
  };

  const handleCompleteQuest = async (questId: string) => {
    try {
      const res = await completeQuest({ questId }).unwrap();
      dispatch(updateUserPoints(res.data.newPointsBalance));
      dispatch(
        showPointsPopup({
          amount: res.data.pointsAwarded,
          reason: t(
            `Mission accomplie : ${res.data.quest.title}`,
            `Quest completed: ${res.data.quest.title}`
          ),
        })
      );
    } catch {}
  };

  const handleThemeSwitch = async () => {
    const nextTheme = mode === 'DARK' ? 'LIGHT' : 'DARK';
    toggleTheme();
    try {
      await updatePreferences({ theme: nextTheme });
    } catch {}
  };

  const handleLanguageSwitch = async () => {
    const nextLang = language === 'FR' ? 'EN' : 'FR';
    setLanguage(nextLang);
    try {
      await updatePreferences({ language: nextLang });
    } catch {}
  };

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          { padding: spacing.md, paddingBottom: spacing.xxl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.profileCard,
            {
              backgroundColor: colors.surface,
              borderRadius: borderRadius.lg,
              borderColor: colors.border,
            },
          ]}
        >
          <AppText variant="overline" weight="semibold" color={colors.secondary}>
            {t(
              `Compte citoyen (${user?.role || 'USER'})`,
              `Citizen Account (${user?.role || 'USER'})`
            )}
          </AppText>
          <AppText variant="title" weight="bold" style={styles.walletTitle}>
            {shortenWallet(user?.walletAddress, 6)}
          </AppText>
          <AppText variant="caption" color={colors.textSecondary}>
            {user?.email || t('Portefeuille Web3', 'Web3 Wallet')} • {pointsBalance} pts
          </AppText>

          <View style={styles.prefsRow}>
            <TouchableOpacity
              onPress={handleThemeSwitch}
              style={[
                styles.prefPill,
                {
                  backgroundColor: colors.surfaceElevated,
                  borderRadius: borderRadius.md,
                  borderColor: colors.border,
                },
              ]}
            >
              <AppText variant="caption" weight="semibold">
                {t(
                  `Apparence : ${mode === 'DARK' ? 'Sombre' : 'Claire'}`,
                  `Theme: ${mode === 'DARK' ? 'Dark' : 'Light'}`
                )}
              </AppText>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleLanguageSwitch}
              style={[
                styles.prefPill,
                {
                  backgroundColor: colors.surfaceElevated,
                  borderRadius: borderRadius.md,
                  borderColor: colors.border,
                },
              ]}
            >
              <AppText variant="caption" weight="semibold">
                {t(`Langue : ${language}`, `Language: ${language}`)}
              </AppText>
            </TouchableOpacity>
          </View>
        </View>

        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: colors.surface,
              borderRadius: borderRadius.lg,
              borderColor: colors.border,
            },
          ]}
        >
          <AppText variant="subtitle" weight="semibold">
            {t('Parrainage (+100 pts par invitation)', 'Referrals (+100 pts per friend)')}
          </AppText>
          <AppText variant="caption" color={colors.textSecondary}>
            {t(
              `Code : ${referralInfo?.referralCode || user?.referralCode} (${referralInfo?.referralsCount ?? 0} filleul(s))`,
              `Code: ${referralInfo?.referralCode || user?.referralCode} (${referralInfo?.referralsCount ?? 0} referral(s))`
            )}
          </AppText>

          <AppButton
            title={
              copiedFeedback
                ? t('Lien copié dans le presse-papiers', 'Link copied to clipboard')
                : t('Copier mon lien de parrainage', 'Copy my referral link')
            }
            onPress={handleCopyReferral}
          />

          <View style={styles.shareButtonsRow}>
            <TouchableOpacity
              onPress={() =>
                referralInfo?.quickShareLinks.whatsapp &&
                Linking.openURL(referralInfo.quickShareLinks.whatsapp).catch(() => {})
              }
              style={[
                styles.shareBtn,
                {
                  backgroundColor: colors.surfaceElevated,
                  borderRadius: borderRadius.md,
                  borderColor: colors.border,
                },
              ]}
            >
              <AppText variant="caption" weight="medium" color={colors.text}>
                WhatsApp
              </AppText>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() =>
                referralInfo?.quickShareLinks.twitter &&
                Linking.openURL(referralInfo.quickShareLinks.twitter).catch(() => {})
              }
              style={[
                styles.shareBtn,
                {
                  backgroundColor: colors.surfaceElevated,
                  borderRadius: borderRadius.md,
                  borderColor: colors.border,
                },
              ]}
            >
              <AppText variant="caption" weight="medium" color={colors.text}>
                X / Twitter
              </AppText>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() =>
                referralInfo?.quickShareLinks.sms &&
                Linking.openURL(referralInfo.quickShareLinks.sms).catch(() => {})
              }
              style={[
                styles.shareBtn,
                {
                  backgroundColor: colors.surfaceElevated,
                  borderRadius: borderRadius.md,
                  borderColor: colors.border,
                },
              ]}
            >
              <AppText variant="caption" weight="medium" color={colors.text}>
                SMS
              </AppText>
            </TouchableOpacity>
          </View>
        </View>

        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: colors.surface,
              borderRadius: borderRadius.lg,
              borderColor: colors.border,
            },
          ]}
        >
          <AppText variant="subtitle" weight="semibold">
            {t('Missions citoyennes', 'Community Quests')}
          </AppText>
          {quests.map((q) => (
            <TouchableOpacity
              key={q.id}
              disabled={q.completed}
              onPress={() => handleCompleteQuest(q.id)}
              style={[
                styles.questItem,
                {
                  backgroundColor: colors.surfaceElevated,
                  borderRadius: borderRadius.md,
                  borderColor: q.completed ? colors.primary : colors.border,
                },
              ]}
            >
              <View style={styles.questLeft}>
                <AppText
                  variant="caption"
                  weight="semibold"
                  color={q.completed ? colors.primary : colors.textMuted}
                >
                  {q.completed ? t('Fait', 'Done') : t('À faire', 'Todo')}
                </AppText>
                <AppText variant="caption" weight="medium" style={styles.questTitle}>
                  {q.title}
                </AppText>
              </View>
              <AppText variant="caption" weight="semibold" color={colors.secondary}>
                +{q.rewardPoints} pts
              </AppText>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.navButtonsGroup}>
          <AppButton
            title={t('Sécurité 2FA & Jeu responsable', '2FA Security & Responsible Play')}
            variant="secondary"
            onPress={() => navigation.navigate('Security')}
          />
          <AppButton
            title={t('Données personnelles (RGPD)', 'Personal Data (GDPR)')}
            variant="outline"
            onPress={() => navigation.navigate('GDPR')}
          />
          <AppButton
            title={t('Charte de transparence & Aide', 'Transparency Charter & Help')}
            variant="outline"
            onPress={() => navigation.navigate('HelpSupport')}
          />
          <AppButton
            title={t('Se déconnecter', 'Sign Out')}
            variant="danger"
            onPress={signOut}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {},
  profileCard: {
    padding: 18,
    borderWidth: 1,
    marginBottom: 14,
    gap: 6,
  },
  walletTitle: {
    marginVertical: 2,
  },
  prefsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  prefPill: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  sectionCard: {
    padding: 16,
    borderWidth: 1,
    marginBottom: 14,
    gap: 10,
  },
  shareButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  shareBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
  },
  questItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
  },
  questLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  questTitle: {
    flex: 1,
  },
  navButtonsGroup: {
    gap: 10,
  },
});

export default ProfileScreen;
