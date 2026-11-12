import React, { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { formatClock, groupThousands } from './drawFormat';
import useAppTheme from '../../hooks/useAppTheme';
import { LiveChatMessage } from '../../store/slices/lotterySlice';
import { rf } from '../../theme/typography';
import AppText from '../ui/AppText';
import Pill from '../ui/Pill';
import SectionHeader from '../ui/SectionHeader';
import Icon from '../ui/icons/Icon';

export interface RoomChatProps {
  messages: LiveChatMessage[];
  myAnonymizedWallet: string | null;
  onlineCount: number;
  onSend: (message: string) => boolean;
  maxVisible?: number;
}

const MAX_LENGTH = 280;

export const RoomChat: React.FC<RoomChatProps> = ({
  messages,
  myAnonymizedWallet,
  onlineCount,
  onSend,
  maxVisible = 30,
}) => {
  const { colors, t, typography } = useAppTheme();
  const [draft, setDraft] = useState('');
  const [sendError, setSendError] = useState<string | null>(null);
  const visible = messages.slice(-maxVisible);
  const canSend = draft.trim().length > 0;

  const handleSend = () => {
    const text = draft.trim();
    if (!text) return;
    const sent = onSend(text);
    if (sent) {
      setDraft('');
      setSendError(null);
    } else {
      setSendError(
        t(
          'Connexion à la salle en cours. Réessayez dans un instant.',
          'Connecting to the room. Please try again in a moment.',
        ),
      );
    }
  };

  return (
    <View>
      <SectionHeader
        title={t('La discussion', 'The chat')}
        subtitle={t(
          'Un espace convivial, restez bienveillants.',
          'A friendly space, please be kind.',
        )}
        right={
          onlineCount > 0 ? (
            <Pill
              tone="mint"
              dot
              uppercase={false}
              label={t(
                `${groupThousands(onlineCount)} en ligne`,
                `${groupThousands(onlineCount)} online`,
              )}
            />
          ) : undefined
        }
        style={styles.header}
      />

      <View style={[styles.welcome, { backgroundColor: colors.lavender }]}>
        <AppText size={10} weight="bold" color={colors.violet}>
          {t('L’équipe BlockLucky', 'The BlockLucky team')}
        </AppText>
        <AppText size={11} color={colors.ink}>
          {t('Bienvenue ! Dites bonsoir à vos voisins.', 'Welcome! Say hello to your neighbours.')}
        </AppText>
      </View>

      {visible.map((message) => {
        const mine = Boolean(
          myAnonymizedWallet &&
          message.senderWallet.toLowerCase() === myAnonymizedWallet.toLowerCase(),
        );
        const author = mine ? t('Vous', 'You') : message.senderWallet;
        const clock = formatClock(message.timestamp);
        return (
          <View key={message.id} style={[styles.messageBlock, mine ? styles.mine : styles.theirs]}>
            <AppText
              size={10}
              weight="semibold"
              color={colors.inkMuted}
              align={mine ? 'right' : 'left'}
              style={styles.author}
            >
              {clock ? `${author} · ${clock}` : author}
            </AppText>
            <View
              accessible
              accessibilityLabel={`${author}, ${message.message}`}
              style={[styles.bubble, { backgroundColor: mine ? colors.sunNav : colors.surface }]}
            >
              <AppText size={13} color={colors.ink}>
                {message.emoji ? `${message.message} ${message.emoji}` : message.message}
              </AppText>
            </View>
          </View>
        );
      })}

      <View style={[styles.inputRow, { backgroundColor: colors.surface }]}>
        <TextInput
          value={draft}
          onChangeText={(value) => {
            setDraft(value);
            if (sendError) setSendError(null);
          }}
          placeholder={t('Écrivez un message…', 'Write a message…')}
          placeholderTextColor={colors.inkMuted}
          maxLength={MAX_LENGTH}
          returnKeyType="send"
          onSubmitEditing={handleSend}
          accessibilityLabel={t('Message pour la salle', 'Message for the room')}
          style={[
            styles.input,
            { color: colors.ink, fontFamily: typography.fontFamily.regular, fontSize: rf(13) },
          ]}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('Envoyer le message', 'Send message')}
          accessibilityState={{ disabled: !canSend }}
          disabled={!canSend}
          onPress={handleSend}
          hitSlop={4}
          style={({ pressed }) => [
            styles.send,
            {
              backgroundColor: canSend ? colors.sun : colors.disabled,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <Icon name="arrowSend" size={22} color={colors.onSun} />
        </Pressable>
      </View>
      {sendError ? (
        <AppText size={11} color={colors.terracotta} align="center" style={styles.caption}>
          {sendError}
        </AppText>
      ) : (
        <AppText size={10} color={colors.inkMuted} align="center" style={styles.caption}>
          {t(
            'Vos messages sont visibles par toute la salle.',
            'Your messages are visible to the whole room.',
          )}
        </AppText>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    marginTop: 12,
  },
  welcome: {
    borderRadius: 16,
    paddingHorizontal: 13,
    paddingVertical: 10,
    gap: 6,
    marginBottom: 6,
  },
  messageBlock: {
    marginTop: 12,
    maxWidth: '84%',
  },
  mine: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  theirs: {
    alignSelf: 'flex-start',
  },
  author: {
    marginBottom: 5,
    paddingHorizontal: 5,
  },
  bubble: {
    borderRadius: 14,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 17,
    paddingLeft: 15,
    paddingRight: 5,
    minHeight: 50,
    marginTop: 22,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
  },
  send: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  caption: {
    marginTop: 8,
  },
});

export default RoomChat;
