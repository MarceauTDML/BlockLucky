import React, { useEffect, useState } from 'react';
import { Share, StyleSheet, View } from 'react-native';

import { getApiErrorMessage } from '../../components/marketplace/apiErrors';
import ListGroup from '../../components/profile/ListGroup';
import AppButton from '../../components/ui/AppButton';
import AppInput from '../../components/ui/AppInput';
import AppText from '../../components/ui/AppText';
import Card from '../../components/ui/Card';
import ListRow from '../../components/ui/ListRow';
import ResultDialog from '../../components/ui/ResultDialog';
import Screen from '../../components/ui/Screen';
import ScreenHeader from '../../components/ui/ScreenHeader';
import SectionHeader from '../../components/ui/SectionHeader';
import useAppTheme from '../../hooks/useAppTheme';
import useAuth from '../../hooks/useAuth';
import { useRootNavigation } from '../../navigation/hooks';
import {
  useConfirmGdprDeletionMutation,
  useExportGdprDataMutation,
  useGetProfileQuery,
  useRequestGdprDeletionMutation,
  useUpdateProfileNamesMutation,
} from '../../store/api/authApi';
import { GdprExportResponse } from '../../types/api.types';
import { formatDateShort } from '../../utils/date.util';

type DialogState = 'none' | 'askDelete' | 'confirmDelete' | 'error' | 'namesSaved';

const NAME_PATTERN = /^[\p{L}][\p{L}' -]*$/u;

export const PersonalDataScreen: React.FC = () => {
  const { colors, t } = useAppTheme();
  const navigation = useRootNavigation();
  const { user, signOut, patchUser } = useAuth();
  const { data: profileRes } = useGetProfileQuery();
  const [updateNames, { isLoading: isSavingNames }] = useUpdateProfileNamesMutation();
  const profile = profileRes?.data?.profile ?? user;
  const [firstName, setFirstName] = useState(profile?.firstName ?? '');
  const [lastName, setLastName] = useState(profile?.lastName ?? '');
  const [nameErrors, setNameErrors] = useState<{ firstName?: string; lastName?: string }>({});
  const [exportGdpr, { isLoading: isExporting }] = useExportGdprDataMutation();
  const [requestDeletion, { isLoading: isRequesting }] = useRequestGdprDeletionMutation();
  const [confirmDeletion, { isLoading: isConfirming }] = useConfirmGdprDeletionMutation();

  const [exported, setExported] = useState<GdprExportResponse | null>(null);
  const [deletionRequested, setDeletionRequested] = useState(false);
  const [deletionInfo, setDeletionInfo] = useState('');
  const [token, setToken] = useState('');
  const [dialog, setDialog] = useState<DialogState>('none');
  const [errorMessage, setErrorMessage] = useState('');

  const serverFirst = profile?.firstName ?? '';
  const serverLast = profile?.lastName ?? '';
  useEffect(() => {
    setFirstName(serverFirst);
    setLastName(serverLast);
  }, [serverFirst, serverLast]);

  const namesChanged = firstName.trim() !== serverFirst || lastName.trim() !== serverLast;

  const validateName = (value: string): string | undefined => {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    if (trimmed.length > 50) return t('50 caractères au plus.', '50 characters at most.');
    if (!NAME_PATTERN.test(trimmed)) {
      return t(
        'Lettres, espaces, tirets et apostrophes uniquement.',
        'Letters, spaces, hyphens and apostrophes only.',
      );
    }
    return undefined;
  };

  const handleSaveNames = async () => {
    const errors = { firstName: validateName(firstName), lastName: validateName(lastName) };
    setNameErrors(errors);
    if (errors.firstName || errors.lastName) return;
    try {
      const res = await updateNames({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      }).unwrap();
      await patchUser(res.data.profile);
      setDialog('namesSaved');
    } catch (error) {
      fail(
        error,
        t(
          'Impossible d’enregistrer votre nom pour le moment.',
          'Unable to save your name right now.',
        ),
      );
    }
  };

  const fail = (error: unknown, fallback: string) => {
    setErrorMessage(getApiErrorMessage(error, fallback));
    setDialog('error');
  };

  const handleExport = async () => {
    try {
      const res = await exportGdpr().unwrap();
      setExported(res.data);
    } catch (error) {
      fail(
        error,
        t(
          'L’export de vos données a échoué. Réessayez plus tard.',
          'Data export failed. Please try again later.',
        ),
      );
    }
  };

  const handleShareExport = async () => {
    if (!exported) return;
    try {
      await Share.share({ title: 'BlockLucky', message: JSON.stringify(exported, null, 2) });
    } catch {
      setErrorMessage(t('Le partage n’a pas pu s’ouvrir.', 'Sharing could not be opened.'));
      setDialog('error');
    }
  };

  const handleRequestDeletion = async () => {
    setDialog('none');
    try {
      const res = await requestDeletion().unwrap();
      setDeletionRequested(true);
      setDeletionInfo(res.data.message);
      if (res.data.confirmationToken) setToken(res.data.confirmationToken);
    } catch (error) {
      fail(error, t('La demande de suppression a échoué.', 'The deletion request failed.'));
    }
  };

  const handleConfirmDeletion = async () => {
    const value = token.trim();
    setDialog('none');
    if (!value) return;
    try {
      await confirmDeletion({ token: value }).unwrap();
      await signOut();
    } catch (error) {
      fail(
        error,
        t('Code de confirmation invalide ou expiré.', 'Invalid or expired confirmation code.'),
      );
    }
  };

  const counts = exported
    ? [
        { label: t('Tickets', 'Tickets'), value: exported.ticketsHistory?.length ?? 0 },
        {
          label: t('Mouvements de points', 'Point movements'),
          value: exported.pointsLedger?.length ?? 0,
        },
        { label: t('Codes obtenus', 'Codes claimed'), value: exported.claimedRewards?.length ?? 0 },
      ]
    : [];

  return (
    <Screen showSecurityFooter>
      <ScreenHeader
        title={t('Données personnelles', 'Personal data')}
        subtitle={t('Votre identité et vos droits RGPD', 'Your identity and your GDPR rights')}
        onBack={() => navigation.goBack()}
      />

      <SectionHeader
        title={t('Identité', 'Identity')}
        subtitle={t(
          'Affichés dans vos paramètres et utilisés par la Mairie pour vous contacter.',
          'Shown in your settings and used by the city hall to contact you.',
        )}
        style={styles.firstSection}
      />
      <Card>
        <AppInput
          tone="muted"
          label={t('Prénom', 'First name')}
          value={firstName}
          onChangeText={setFirstName}
          errorText={nameErrors.firstName}
          autoCapitalize="words"
          autoComplete="given-name"
          textContentType="givenName"
          maxLength={50}
          placeholder={t('Votre prénom', 'Your first name')}
        />
        <AppInput
          tone="muted"
          label={t('Nom', 'Last name')}
          value={lastName}
          onChangeText={setLastName}
          errorText={nameErrors.lastName}
          autoCapitalize="words"
          autoComplete="family-name"
          textContentType="familyName"
          maxLength={50}
          placeholder={t('Votre nom', 'Your last name')}
        />
        <AppButton
          title={t('Enregistrer', 'Save')}
          variant="dark"
          size="md"
          disabled={!namesChanged}
          loading={isSavingNames}
          onPress={handleSaveNames}
        />
      </Card>

      <SectionHeader
        title={t('Télécharger mes données', 'Download my data')}
        subtitle={t(
          'Profil, tickets, EtherPoints et codes, au format JSON.',
          'Profile, tickets, EtherPoints and codes, in JSON format.',
        )}
      />
      <Card>
        {exported ? (
          <View style={styles.exportBody}>
            <AppText size={13} weight="semibold">
              {t(
                `Export du ${formatDateShort(exported.exportedAt)}`,
                `Export of ${formatDateShort(exported.exportedAt)}`,
              )}
            </AppText>
            {exported.controller ? (
              <AppText size={11} color={colors.inkMuted}>
                {t(`Responsable : ${exported.controller}`, `Controller: ${exported.controller}`)}
              </AppText>
            ) : null}
            <View style={styles.counts}>
              {counts.map((item) => (
                <View
                  key={item.label}
                  style={[styles.count, { backgroundColor: colors.surfaceMuted }]}
                >
                  <AppText size={18} weight="bold">
                    {item.value}
                  </AppText>
                  <AppText size={10} color={colors.inkMuted}>
                    {item.label}
                  </AppText>
                </View>
              ))}
            </View>
            <AppButton
              title={t('Partager le fichier', 'Share the file')}
              variant="dark"
              size="md"
              rightIcon="share"
              align="space-between"
              onPress={handleShareExport}
            />
          </View>
        ) : (
          <AppButton
            title={t('Préparer mon export', 'Prepare my export')}
            variant="dark"
            size="md"
            rightIcon="document"
            align="space-between"
            loading={isExporting}
            onPress={handleExport}
          />
        )}
      </Card>

      <SectionHeader
        title={t('Supprimer mon compte', 'Delete my account')}
        subtitle={t(
          'Votre e-mail et votre portefeuille sont anonymisés définitivement.',
          'Your e-mail and wallet are permanently anonymized.',
        )}
      />
      {deletionRequested ? (
        <Card tone="peach">
          <AppText size={13} weight="semibold" color={colors.terracotta}>
            {t('Demande enregistrée', 'Request recorded')}
          </AppText>
          {deletionInfo ? (
            <AppText size={11} color={colors.ink} style={styles.info}>
              {deletionInfo}
            </AppText>
          ) : null}
          <AppInput
            label={t(
              'Code de confirmation reçu par e-mail',
              'Confirmation code received by e-mail',
            )}
            value={token}
            onChangeText={setToken}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder={t('Collez le code ici', 'Paste the code here')}
          />
          <AppButton
            title={t('Supprimer définitivement', 'Delete permanently')}
            variant="danger"
            size="md"
            leftIcon="trash"
            disabled={!token.trim()}
            loading={isConfirming}
            onPress={() => setDialog('confirmDelete')}
            style={styles.deleteButton}
          />
        </Card>
      ) : (
        <ListGroup>
          <ListRow
            title={t('Supprimer mon compte', 'Delete my account')}
            subtitle={t(
              'Une confirmation vous sera envoyée par e-mail.',
              'A confirmation will be sent by e-mail.',
            )}
            icon="trash"
            destructive
            onPress={() => setDialog('askDelete')}
          />
        </ListGroup>
      )}
      {isRequesting ? (
        <AppText size={11} color={colors.inkMuted} style={styles.info}>
          {t('Envoi de la demande...', 'Sending the request...')}
        </AppText>
      ) : null}

      <ResultDialog
        visible={dialog === 'askDelete'}
        status="error"
        title={t('Supprimer votre compte ?', 'Delete your account?')}
        message={t(
          'Vos tickets, EtherPoints et codes ne seront plus accessibles. Nous vous enverrons un code pour confirmer.',
          'Your tickets, EtherPoints and codes will no longer be accessible. We will send you a code to confirm.',
        )}
        primaryLabel={t('Demander la suppression', 'Request deletion')}
        onPrimary={handleRequestDeletion}
        secondaryLabel={t('Annuler', 'Cancel')}
        onSecondary={() => setDialog('none')}
      />

      <ResultDialog
        visible={dialog === 'confirmDelete'}
        status="error"
        title={t('Dernière confirmation', 'Final confirmation')}
        message={t(
          'Cette action est irréversible. Votre compte sera anonymisé et vous serez déconnecté.',
          'This action cannot be undone. Your account will be anonymized and you will be signed out.',
        )}
        primaryLabel={t('Oui, supprimer', 'Yes, delete')}
        onPrimary={handleConfirmDeletion}
        secondaryLabel={t('Annuler', 'Cancel')}
        onSecondary={() => setDialog('none')}
      />

      <ResultDialog
        visible={dialog === 'namesSaved'}
        status="success"
        title={t('Nom enregistré', 'Name saved')}
        message={t('Votre identité est à jour.', 'Your identity is up to date.')}
        primaryLabel={t('Fermer', 'Close')}
        onPrimary={() => setDialog('none')}
      />

      <ResultDialog
        visible={dialog === 'error'}
        status="error"
        title={t('Une erreur est survenue', 'Something went wrong')}
        message={errorMessage}
        primaryLabel={t('Fermer', 'Close')}
        onPrimary={() => setDialog('none')}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  firstSection: {
    marginTop: 6,
  },
  exportBody: {
    gap: 10,
  },
  counts: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 4,
  },
  count: {
    flex: 1,
    borderRadius: 14,
    padding: 10,
    gap: 2,
  },
  info: {
    marginTop: 6,
    marginBottom: 12,
  },
  deleteButton: {
    marginTop: 12,
  },
});

export default PersonalDataScreen;
