import React, { ReactNode } from 'react';
import { Modal, View, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AppText from './AppText';
import useAppTheme from '../../hooks/useAppTheme';

export interface BottomSheetProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({ visible, title, onClose, children }) => {
  const { colors, borderRadius, t } = useAppTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              borderColor: colors.border,
              paddingBottom: Math.max(insets.bottom + 12, 20),
            },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <View style={styles.header}>
            <AppText size={19} weight="bold">
              {title}
            </AppText>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <AppText variant="caption" weight="medium" color={colors.inkMuted}>
                {t('Fermer', 'Close')}
              </AppText>
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>{children}</ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,

    justifyContent: 'flex-end',
  },
  sheet: {
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: '82%',
    borderTopWidth: 0,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  closeBtn: {
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
});

export default BottomSheet;
