import React, { useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';

import { getErrorMessage } from '../../components/auth/authErrors';
import SettingsLinkCard from '../../components/settings/SettingsLinkCard';
import AppButton from '../../components/ui/AppButton';
import AppInput from '../../components/ui/AppInput';
import AppText from '../../components/ui/AppText';
import Card from '../../components/ui/Card';
import Pill from '../../components/ui/Pill';
import ResultDialog from '../../components/ui/ResultDialog';
import Screen from '../../components/ui/Screen';
import ScreenHeader from '../../components/ui/ScreenHeader';
import SectionHeader from '../../components/ui/SectionHeader';
import Icon from '../../components/ui/icons/Icon';
import { getLegalDocument, LEGAL_DOC_ORDER } from '../../content/legal';
import useAppTheme from '../../hooks/useAppTheme';
import { useRootNavigation } from '../../navigation/hooks';
import { useSendSupportMessageMutation } from '../../store/api/authApi';

const HELP_CENTER_URL = process.env.EXPO_PUBLIC_HELP_CENTER_URL || '';
const SUBJECT_MAX = 120;
const MESSAGE_MAX = 2000;

export const HelpSupportScreen: React.FC = () => {
  const { colors, language, t } = useAppTheme();
  const navigation = useRootNavigation();
  const [sendMessage, { isLoading }] = useSendSupportMessageMutation();

  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<{ subject?: string; message?: string; form?: string }>({});
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    const found: typeof errors = {};
    if (subject.trim().length < 3) {
      found.subject = t('3 caractères minimum.', 'At least 3 characters.');
    }
    if (message.trim().length < 10) {
      found.message = t('10 caractères minimum.', 'At least 10 characters.');
    }
    setErrors(found);
    if (found.subject || found.message) return;
    try {
      await sendMessage({ subject: subject.trim(), message: message.trim() }).unwrap();
      setSubject('');
      setMessage('');
      setSent(true);
    } catch (error) {
      setErrors({
        form: getErrorMessage(
          error,
          t('Le message n’a pas pu être envoyé.', 'The message could not be sent.'),
        ),
      });
    }
  };

  const openHelpCenter = () => {
    if (HELP_CENTER_URL) Linking.openURL(HELP_CENTER_URL).catch(() => {});
  };

  return (
    <Screen showSecurityFooter>
      <ScreenHeader
        title={t('Aide & Support', 'Help & Support')}
        subtitle={t('Une question ? La Mairie vous répond.', 'A question? The city hall answers.')}
        onBack={() => navigation.goBack()}
      />

      <SectionHeader
        title={t('Écrire à un administrateur', 'Write to an administrator')}
        subtitle={t(
          'La réponse arrive sur l’adresse e-mail de votre compte.',
          'The answer is sent to your account e-mail address.',
        )}
        style={styles.firstSection}
      />
      <Card>
        <AppInput
          label={t('Objet', 'Subject')}
          value={subject}
          onChangeText={setSubject}
          errorText={errors.subject}
          tone="muted"
          maxLength={SUBJECT_MAX}
          placeholder={t('Ex. : problème avec mon ticket', 'E.g. issue with my ticket')}
        />
        <AppInput
          label={t('Message', 'Message')}
          value={message}
          onChangeText={setMessage}
          errorText={errors.message}
          tone="muted"
          multiline
          maxLength={MESSAGE_MAX}
          placeholder={t('Décrivez votre demande', 'Describe your request')}
          style={styles.messageField}
        />
        <AppText size={10} color={colors.inkMuted} align="right" style={styles.counter}>
          {`${message.length}/${MESSAGE_MAX}`}
        </AppText>
        {errors.form ? (
          <AppText
            size={12}
            color={colors.terracotta}
            style={styles.formError}
            accessibilityRole="alert"
          >
            {errors.form}
          </AppText>
        ) : null}
        <AppButton
          title={t('Envoyer le message', 'Send the message')}
          variant="dark"
          size="md"
          rightIcon="arrowSend"
          align="space-between"
          loading={isLoading}
          onPress={handleSend}
        />
      </Card>

      <SectionHeader title={t('Centre d’aide', 'Help Center')} />
      <Card
        onPress={HELP_CENTER_URL ? openHelpCenter : undefined}
        accessibilityLabel={t('Centre d’aide', 'Help Center')}
      >
        <View style={styles.helpRow}>
          <View style={[styles.iconBox, { backgroundColor: colors.lavender }]}>
            <Icon name="help" size={20} color={colors.violet} />
          </View>
          <View style={styles.flex}>
            <AppText size={15} weight="bold">
              {t('Centre d’aide BlockLucky', 'BlockLucky Help Center')}
            </AppText>
            <AppText size={11} color={colors.inkMuted}>
              {t('Guides, questions fréquentes et tutoriels', 'Guides, FAQ and tutorials')}
            </AppText>
          </View>
          {HELP_CENTER_URL ? (
            <Icon name="arrowRight" size={22} color={colors.ink} />
          ) : (
            <Pill label={t('Bientôt', 'Soon')} tone="sunSoft" uppercase={false} />
          )}
        </View>
      </Card>

      <SectionHeader title={t('Informations légales', 'Legal information')} />
      <View style={styles.legalList}>
        {LEGAL_DOC_ORDER.map((id) => {
          const document = getLegalDocument(id, language);
          return (
            <SettingsLinkCard
              key={id}
              title={document.title}
              subtitle={document.summary}
              icon="document"
              onPress={() => navigation.navigate('Legal', { doc: id })}
            />
          );
        })}
      </View>

      <ResultDialog
        visible={sent}
        status="success"
        title={t('Message envoyé', 'Message sent')}
        message={t(
          'Un administrateur de la Mairie vous répondra par e-mail.',
          'A city hall administrator will reply by e-mail.',
        )}
        primaryLabel={t('Fermer', 'Close')}
        onPrimary={() => setSent(false)}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  firstSection: {
    marginTop: 6,
  },
  messageField: {
    minHeight: 120,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  counter: {
    marginTop: -8,
    marginBottom: 12,
  },
  formError: {
    marginBottom: 12,
  },
  helpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: {
    flex: 1,
    gap: 2,
  },
  legalList: {
    gap: 12,
  },
});

export default HelpSupportScreen;
