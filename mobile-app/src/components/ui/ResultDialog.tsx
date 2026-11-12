import React, { ReactNode } from 'react';
import { Modal, StyleSheet, View } from 'react-native';

import AppButton from './AppButton';
import AppText from './AppText';
import Icon from './icons/Icon';
import useAppTheme from '../../hooks/useAppTheme';

export interface ResultDialogProps {
  visible: boolean;
  status: 'success' | 'error' | 'info';
  title: string;
  message?: string;
  children?: ReactNode;
  note?: string;
  primaryLabel: string;
  onPrimary: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  onRequestClose?: () => void;
}

export const ResultDialog: React.FC<ResultDialogProps> = ({
  visible,
  status,
  title,
  message,
  children,
  note,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  onRequestClose,
}) => {
  const { colors } = useAppTheme();
  const badge =
    status === 'success'
      ? { background: colors.mint, color: colors.green, icon: 'check' as const }
      : status === 'error'
        ? { background: colors.peach, color: colors.terracotta, icon: 'close' as const }
        : { background: colors.lavender, color: colors.violet, icon: 'alert' as const };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onRequestClose ?? onSecondary ?? onPrimary}
    >
      <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
        <View style={[styles.dialog, { backgroundColor: colors.surface }]} accessibilityViewIsModal>
          <View style={[styles.badge, { backgroundColor: badge.background }]}>
            <Icon name={badge.icon} size={30} color={badge.color} />
          </View>
          <AppText size={23} weight="bold" align="center" accessibilityRole="header">
            {title}
          </AppText>
          {message ? (
            <AppText size={13} color={colors.inkMuted} align="center" style={styles.message}>
              {message}
            </AppText>
          ) : null}
          {children ? <View style={styles.body}>{children}</View> : null}
          {note ? (
            <AppText size={11} color={colors.inkMuted} align="center" style={styles.note}>
              {note}
            </AppText>
          ) : null}
          <AppButton title={primaryLabel} onPress={onPrimary} style={styles.primary} />
          {secondaryLabel && onSecondary ? (
            <AppButton title={secondaryLabel} variant="ghost" size="md" onPress={onSecondary} />
          ) : null}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  dialog: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 16,
    alignItems: 'stretch',
    shadowColor: '#111827',
    shadowOpacity: 0.18,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 14 },
    elevation: 12,
  },
  badge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 18,
  },
  message: {
    marginTop: 12,
  },
  body: {
    marginTop: 20,
  },
  note: {
    marginTop: 16,
  },
  primary: {
    marginTop: 20,
    marginBottom: 6,
  },
});

export default ResultDialog;
