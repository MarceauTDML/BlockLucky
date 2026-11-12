import React, { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { Edge, SafeAreaView } from 'react-native-safe-area-context';

import SecurityFooter from './SecurityFooter';
import useAppTheme from '../../hooks/useAppTheme';

export interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
  footer?: ReactNode;
  showSecurityFooter?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  edges?: Edge[];
  contentStyle?: StyleProp<ViewStyle>;
}

export const Screen: React.FC<ScreenProps> = ({
  children,
  scroll = true,
  footer,
  showSecurityFooter = false,
  refreshing = false,
  onRefresh,
  edges = ['top', 'left', 'right'],
  contentStyle,
}) => {
  const { colors } = useAppTheme();
  const body = scroll ? (
    <ScrollView
      contentContainerStyle={[styles.content, contentStyle]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.ink} />
        ) : undefined
      }
    >
      {children}
      {showSecurityFooter && !footer ? <SecurityFooter /> : null}
    </ScrollView>
  ) : (
    <View style={[styles.content, styles.fill, contentStyle]}>{children}</View>
  );

  return (
    <SafeAreaView
      edges={footer ? [...edges, 'bottom'] : edges}
      style={[styles.fill, { backgroundColor: colors.background }]}
    >
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {body}
        {footer ? (
          <View style={[styles.footer, { backgroundColor: colors.surface }]}>
            {footer}
            {showSecurityFooter ? <SecurityFooter /> : null}
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
});

export default Screen;
