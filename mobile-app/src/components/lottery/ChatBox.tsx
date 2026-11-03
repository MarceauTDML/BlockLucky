import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import useAppTheme from '../../hooks/useAppTheme';
import AppText from '../ui/AppText';
import { LiveChatMessage } from '../../store/slices/lotterySlice';

export interface ChatBoxProps {
  messages: LiveChatMessage[];
  onSendMessage: (message: string, reactionTag?: string) => void;
}

const REACTION_TAGS = ['Bravo', 'EtherBay', 'VRF', '10k'];

export const ChatBox: React.FC<ChatBoxProps> = ({ messages, onSendMessage }) => {
  const { colors, borderRadius, typography, t } = useAppTheme();
  const [inputText, setInputText] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | undefined>(undefined);

  const handleSend = () => {
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim(), selectedTag);
    setInputText('');
    setSelectedTag(undefined);
  };

  const visibleMessages = messages.slice(-15);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderRadius: borderRadius.lg,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.header}>
        <AppText variant="body" weight="bold">
          {t('Discussion en direct', 'Live Chat')}
        </AppText>
        <AppText variant="caption" color={colors.secondary}>
          {t('En direct', 'Live')}
        </AppText>
      </View>

      <View style={styles.messageList}>
        {visibleMessages.length === 0 ? (
          <AppText variant="caption" color={colors.textMuted}>
            {t(
              'Aucun message pour le moment. Soyez le premier à réagir.',
              'No messages yet. Be the first to react.'
            )}
          </AppText>
        ) : (
          visibleMessages.map((item) => (
            <View key={item.id} style={styles.messageRow}>
              <AppText variant="caption" weight="bold" color={colors.textSecondary}>
                {item.senderWallet}{' '}
              </AppText>
              <AppText variant="caption" color={colors.textPrimary}>
                {item.emoji ? `[${item.emoji}] ` : ''}
                {item.message}
              </AppText>
            </View>
          ))
        )}
      </View>

      <View style={styles.reactionRow}>
        {REACTION_TAGS.map((tag) => (
          <TouchableOpacity
            key={tag}
            onPress={() => setSelectedTag(tag === selectedTag ? undefined : tag)}
            style={[
              styles.reactionPill,
              {
                backgroundColor:
                  selectedTag === tag ? colors.primary : colors.surfaceElevated,
                borderRadius: borderRadius.sm,
              },
            ]}
          >
            <AppText
              variant="caption"
              weight="medium"
              color={selectedTag === tag ? '#F7F6F2' : colors.textSecondary}
            >
              {tag}
            </AppText>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.inputRow}>
        <TextInput
          value={inputText}
          onChangeText={setInputText}
          placeholder={t('Écrire un message...', 'Write a message...')}
          placeholderTextColor={colors.textMuted}
          returnKeyType="send"
          onSubmitEditing={handleSend}
          style={[
            styles.input,
            {
              backgroundColor: colors.surfaceElevated,
              color: colors.textPrimary,
              borderRadius: borderRadius.md,
              fontSize: typography.fontSize.sm,
            },
          ]}
        />
        <TouchableOpacity
          onPress={handleSend}
          style={[
            styles.sendButton,
            {
              backgroundColor: colors.primary,
              borderRadius: borderRadius.md,
            },
          ]}
        >
          <AppText variant="caption" weight="medium" color="#F7F6F2">
            {t('Envoyer', 'Send')}
          </AppText>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderWidth: 1,
    marginTop: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  messageList: {
    marginBottom: 12,
    gap: 6,
  },
  messageRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  reactionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  reactionPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  sendButton: {
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ChatBox;
