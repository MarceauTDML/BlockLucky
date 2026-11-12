import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import FormMessage from '../../components/auth/FormMessage';
import HighlightCard from '../../components/auth/HighlightCard';
import IdentitySideCard from '../../components/auth/IdentitySideCard';
import TextLink from '../../components/auth/TextLink';
import { getErrorMessage } from '../../components/auth/authErrors';
import AppButton from '../../components/ui/AppButton';
import AppText from '../../components/ui/AppText';
import BottomSheet from '../../components/ui/BottomSheet';
import Card from '../../components/ui/Card';
import Loader from '../../components/ui/Loader';
import ResultDialog from '../../components/ui/ResultDialog';
import Screen from '../../components/ui/Screen';
import ScreenHeader from '../../components/ui/ScreenHeader';
import SectionHeader from '../../components/ui/SectionHeader';
import Icon, { IconName } from '../../components/ui/icons/Icon';
import useAppTheme from '../../hooks/useAppTheme';
import useAuth from '../../hooks/useAuth';
import { useRootNavigation } from '../../navigation/hooks';
import { useGetIdentityStatusQuery, useSubmitIdentityMutation } from '../../store/api/authApi';
import { formatDateShort } from '../../utils/date.util';

type Side = 'front' | 'back';

interface PickedImage {
  uri: string;
  dataUrl: string;
}

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

const VerifyAgeScreen: React.FC = () => {
  const { colors, t } = useAppTheme();
  const navigation = useRootNavigation();
  const { setAgeVerificationStatus } = useAuth();
  const { data, isLoading, isFetching, error, refetch } = useGetIdentityStatusQuery();
  const [submitIdentity, { isLoading: isSubmitting }] = useSubmitIdentityMutation();

  const [images, setImages] = useState<Partial<Record<Side, PickedImage>>>({});
  const [pickerSide, setPickerSide] = useState<Side | null>(null);
  const [formError, setFormError] = useState('');
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [sent, setSent] = useState(false);

  const identity = data?.data;
  const status = identity?.status ?? 'NONE';
  const canSubmit = status === 'NONE' || status === 'REJECTED';
  const ready = Boolean(images.front && images.back);

  useEffect(() => {
    if (identity?.status) setAgeVerificationStatus(identity.status);
  }, [identity?.status, setAgeVerificationStatus]);

  const pick = async (side: Side, source: 'camera' | 'library') => {
    setPickerSide(null);
    setFormError('');
    await new Promise((resolve) => setTimeout(resolve, 350));
    try {
      const permission =
        source === 'camera'
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setFormError(
          source === 'camera'
            ? t(
                'Autorisez l’accès à l’appareil photo dans les réglages pour photographier votre carte.',
                'Allow camera access in settings to photograph your card.',
              )
            : t(
                'Autorisez l’accès à vos photos dans les réglages pour choisir un fichier.',
                'Allow photo access in settings to choose a file.',
              ),
        );
        return;
      }
      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'],
        quality: 0.6,
        base64: true,
        allowsEditing: false,
        exif: false,
      };
      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync(options)
          : await ImagePicker.launchImageLibraryAsync(options);
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      if (!asset.base64) {
        setFormError(
          t(
            'Impossible de lire cette image. Essayez une autre photo.',
            'Unable to read this image. Try another photo.',
          ),
        );
        return;
      }
      const mimeType = asset.mimeType === 'image/png' ? 'image/png' : 'image/jpeg';
      if (Math.floor((asset.base64.length * 3) / 4) > MAX_IMAGE_BYTES) {
        setFormError(
          t(
            'Cette image dépasse 4 Mo. Reprenez la photo un peu plus loin.',
            'This image exceeds 4 MB. Retake the photo from a little further away.',
          ),
        );
        return;
      }
      setImages((current) => ({
        ...current,
        [side]: { uri: asset.uri, dataUrl: `data:${mimeType};base64,${asset.base64}` },
      }));
    } catch {
      setFormError(
        t(
          'Impossible d’ouvrir l’appareil photo ou la galerie.',
          'Unable to open the camera or the gallery.',
        ),
      );
    }
  };

  const submit = async () => {
    if (!images.front || !images.back) return;
    setFormError('');
    try {
      await submitIdentity({ front: images.front.dataUrl, back: images.back.dataUrl }).unwrap();
      setImages({});
      setSent(true);
      await setAgeVerificationStatus('PENDING');
      refetch();
    } catch (submitError) {
      setFormError(
        getErrorMessage(
          submitError,
          t(
            'Envoi impossible. Vérifiez votre connexion et réessayez.',
            'Unable to send. Check your connection and try again.',
          ),
        ),
      );
    }
  };

  const subtitle =
    status === 'VERIFIED'
      ? t('Âge vérifié · Accès aux jeux ouvert', 'Age verified · Games unlocked')
      : status === 'PENDING'
        ? t('Demande envoyée · En attente', 'Request sent · Pending')
        : t('Obligatoire pour jouer · Une seule fois', 'Required to play · Only once');

  const renderStatus = () => {
    if (status === 'NONE') return null;
    const config: Record<
      'PENDING' | 'VERIFIED' | 'REJECTED',
      {
        tone: 'lavender' | 'mint' | 'peach';
        icon: IconName;
        color: string;
        title: string;
        text: string;
      }
    > = {
      PENDING: {
        tone: 'lavender',
        icon: 'clock',
        color: colors.violet,
        title: t('En cours de validation par la Mairie', 'Being reviewed by the City Hall'),
        text: identity?.submittedAt
          ? t(
              `Document envoyé le ${formatDateShort(identity.submittedAt)}. Vous serez prévenu par e-mail dès la décision.`,
              `Document sent on ${formatDateShort(identity.submittedAt)}. You will be notified by email once a decision is made.`,
            )
          : t(
              'Vous serez prévenu par e-mail dès la décision.',
              'You will be notified by email once a decision is made.',
            ),
      },
      VERIFIED: {
        tone: 'mint',
        icon: 'check',
        color: colors.green,
        title: t('Âge vérifié', 'Age verified'),
        text: identity?.reviewedAt
          ? t(
              `Vérification validée le ${formatDateShort(identity.reviewedAt)}. Vous pouvez participer aux jeux.`,
              `Approved on ${formatDateShort(identity.reviewedAt)}. You can take part in the games.`,
            )
          : t('Vous pouvez participer aux jeux.', 'You can take part in the games.'),
      },
      REJECTED: {
        tone: 'peach',
        icon: 'alert',
        color: colors.terracotta,
        title: t('Vérification refusée', 'Verification rejected'),
        text: t(
          'Vous pouvez envoyer de nouvelles photos de votre carte ci-dessous.',
          'You can send new photos of your card below.',
        ),
      },
    };
    const item = config[status];

    return (
      <Card tone={item.tone} style={styles.section}>
        <View style={styles.statusRow}>
          <View style={[styles.statusIcon, { backgroundColor: colors.surface }]}>
            <Icon name={item.icon} size={22} color={item.color} />
          </View>
          <View style={styles.flex}>
            <AppText size={15} weight="bold" color={item.color} accessibilityRole="header">
              {item.title}
            </AppText>
            <AppText size={11} color={colors.inkMuted}>
              {item.text}
            </AppText>
            {status === 'REJECTED' && identity?.note ? (
              <AppText size={12} weight="semibold" color={colors.terracotta} style={styles.note}>
                {t(`Motif : ${identity.note}`, `Reason: ${identity.note}`)}
              </AppText>
            ) : null}
          </View>
        </View>
      </Card>
    );
  };

  return (
    <Screen showSecurityFooter refreshing={isFetching && !isLoading} onRefresh={refetch}>
      <ScreenHeader
        title={t('Vérifier mon âge', 'Verify my age')}
        subtitle={subtitle}
        onBack={() => navigation.goBack()}
      />

      <HighlightCard
        badge={
          <AppText size={24} weight="bold" color={colors.onSun}>
            18+
          </AppText>
        }
        title={t('Réservé aux majeurs', 'Adults only')}
        message={t(
          'La loi interdit les jeux de loterie aux mineurs. Votre carte d’identité permet de vérifier que vous avez 18 ans ou plus.',
          'The law forbids lottery games to minors. Your ID card lets us check that you are 18 or older.',
        )}
      />

      {isLoading ? (
        <Loader message={t('Chargement de votre vérification…', 'Loading your verification…')} />
      ) : error && !identity ? (
        <View style={styles.section}>
          <FormMessage
            message={getErrorMessage(
              error,
              t(
                'Impossible de charger l’état de votre vérification.',
                'Unable to load your verification status.',
              ),
            )}
          />
          <AppButton title={t('Réessayer', 'Try again')} variant="outline" onPress={refetch} />
        </View>
      ) : (
        <>
          {renderStatus()}

          {canSubmit ? (
            <>
              <SectionHeader
                title={t('Votre carte d’identité', 'Your ID card')}
                subtitle={t(
                  'Ajoutez les deux faces, nettes et sans reflet.',
                  'Add both sides, sharp and without glare.',
                )}
                style={styles.sectionHeader}
              />
              <IdentitySideCard
                title={t('Recto', 'Front')}
                description={t('Face avec votre photo', 'Side with your photo')}
                previewUri={images.front?.uri}
                disabled={isSubmitting}
                onPress={() => setPickerSide('front')}
              />
              <IdentitySideCard
                title={t('Verso', 'Back')}
                description={t('Autre face de votre carte', 'Other side of your card')}
                previewUri={images.back?.uri}
                disabled={isSubmitting}
                onPress={() => setPickerSide('back')}
              />
              <AppText size={11} color={colors.inkMuted} style={styles.hint}>
                {t(
                  'Les 4 coins de la carte doivent être visibles. Le nom et la date de naissance doivent être lisibles.',
                  'All 4 corners of the card must be visible. Name and date of birth must be readable.',
                )}
              </AppText>

              <View style={styles.section}>
                <AppText size={15} weight="bold" style={styles.usageTitle}>
                  {t('Avant d’envoyer votre document', 'Before sending your document')}
                </AppText>
                <AppText size={11} color={colors.inkMuted}>
                  {t(
                    'L’accès aux jeux sera ouvert après vérification de l’âge. Consultez l’utilisation de votre document avant l’envoi.',
                    'Games will be unlocked once your age is verified. Read how your document is used before sending it.',
                  )}
                </AppText>
                <TextLink
                  label={
                    showPrivacy
                      ? t('Masquer la protection de vos données', 'Hide data protection')
                      : t('Protection de vos données  →', 'Data protection  →')
                  }
                  align="left"
                  size={11}
                  underline
                  onPress={() => setShowPrivacy((value) => !value)}
                />
                {showPrivacy ? (
                  <Card tone="muted" padding={16}>
                    <View style={styles.privacyList}>
                      {[
                        t(
                          'Vos photos sont chiffrées dès leur réception par nos serveurs.',
                          'Your photos are encrypted as soon as our servers receive them.',
                        ),
                        t(
                          'Seul un agent habilité de la Mairie les consulte, uniquement pour vérifier votre âge.',
                          'Only an authorised City Hall agent views them, solely to check your age.',
                        ),
                        t(
                          'Elles sont supprimées définitivement dès la décision : seul le résultat est conservé.',
                          'They are permanently deleted once a decision is made: only the result is kept.',
                        ),
                      ].map((line) => (
                        <View key={line} style={styles.privacyRow}>
                          <Icon name="lock" size={16} color={colors.green} />
                          <AppText size={11} color={colors.ink} style={styles.flex}>
                            {line}
                          </AppText>
                        </View>
                      ))}
                    </View>
                  </Card>
                ) : null}
              </View>

              {formError ? <FormMessage message={formError} /> : null}

              <AppButton
                title={t('Envoyer pour vérification', 'Send for verification')}
                loading={isSubmitting}
                disabled={!ready}
                onPress={submit}
              />
              {!ready ? (
                <AppText size={11} color={colors.inkMuted} align="center" style={styles.helper}>
                  {t(
                    'Ajoutez les deux faces de votre carte pour continuer.',
                    'Add both sides of your card to continue.',
                  )}
                </AppText>
              ) : null}
            </>
          ) : (
            <View style={styles.privacyRow}>
              <Icon name="lock" size={16} color={colors.green} />
              <AppText size={11} color={colors.inkMuted} style={styles.flex}>
                {status === 'VERIFIED'
                  ? t(
                      'Les photos de votre carte ont été supprimées : seule la décision est conservée.',
                      'Your card photos have been deleted: only the decision is kept.',
                    )
                  : t(
                      'Vos photos sont chiffrées et seront supprimées dès la décision.',
                      'Your photos are encrypted and will be deleted once a decision is made.',
                    )}
              </AppText>
            </View>
          )}
        </>
      )}

      <BottomSheet
        visible={pickerSide !== null}
        title={
          pickerSide === 'back'
            ? t('Ajouter le verso', 'Add the back')
            : t('Ajouter le recto', 'Add the front')
        }
        onClose={() => setPickerSide(null)}
      >
        <View style={styles.sheet}>
          <AppButton
            title={t('Prendre une photo', 'Take a photo')}
            leftIcon="camera"
            onPress={() => pickerSide && pick(pickerSide, 'camera')}
          />
          <AppButton
            title={t('Choisir un fichier', 'Choose a file')}
            variant="outline"
            leftIcon="document"
            onPress={() => pickerSide && pick(pickerSide, 'library')}
          />
        </View>
      </BottomSheet>

      <ResultDialog
        visible={sent}
        status="success"
        title={t('Document envoyé', 'Document sent')}
        message={t(
          'Votre demande est en cours de validation par la Mairie. Vous serez prévenu par e-mail dès la décision.',
          'Your request is being reviewed by the City Hall. You will be notified by email once a decision is made.',
        )}
        note={t(
          'Vos photos sont chiffrées puis supprimées après la décision.',
          'Your photos are encrypted, then deleted after the decision.',
        )}
        primaryLabel={t('Compris', 'Got it')}
        onPrimary={() => setSent(false)}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  section: {
    marginBottom: 30,
  },
  sectionHeader: {
    marginBottom: 14,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  statusIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  note: {
    marginTop: 8,
  },
  hint: {
    marginTop: 4,
    marginBottom: 30,
    paddingHorizontal: 4,
  },
  usageTitle: {
    marginBottom: 8,
  },
  privacyList: {
    gap: 10,
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  helper: {
    marginTop: 10,
  },
  sheet: {
    gap: 12,
  },
});

export default VerifyAgeScreen;
