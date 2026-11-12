import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import AppText from '../../components/ui/AppText';
import Card from '../../components/ui/Card';
import Screen from '../../components/ui/Screen';
import ScreenHeader from '../../components/ui/ScreenHeader';
import SectionHeader from '../../components/ui/SectionHeader';
import Icon from '../../components/ui/icons/Icon';
import { getLegalDocument, LEGAL_DOC_ORDER, LEGAL_VERSION } from '../../content/legal';
import useAppTheme from '../../hooks/useAppTheme';
import { RootStackParamList } from '../../types/navigation.types';

export const LegalScreen: React.FC = () => {
  const { colors, language, t } = useAppTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'Legal'>>();
  const docId = route.params?.doc ?? 'cgu';
  const document = getLegalDocument(docId, language);

  return (
    <Screen showSecurityFooter>
      <ScreenHeader
        title={document.title}
        subtitle={LEGAL_VERSION[language]}
        onBack={() => navigation.goBack()}
      />

      <AppText size={13} color={colors.inkMuted} style={styles.intro}>
        {document.intro}
      </AppText>

      <View style={styles.sections}>
        {document.sections.map((section) => (
          <Card key={section.heading}>
            <AppText variant="subtitle" accessibilityRole="header" style={styles.heading}>
              {section.heading}
            </AppText>
            {section.paragraphs.map((paragraph) => (
              <AppText key={paragraph} size={13} color={colors.inkMuted} style={styles.paragraph}>
                {paragraph}
              </AppText>
            ))}
            {section.items?.map((item) => (
              <View key={item.title} style={[styles.item, { backgroundColor: colors.background }]}>
                <AppText size={13} weight="bold">
                  {item.title}
                </AppText>
                <AppText size={12} color={colors.inkMuted}>
                  {item.text}
                </AppText>
              </View>
            ))}
          </Card>
        ))}
      </View>

      <SectionHeader title={t('Autres documents', 'Other documents')} style={styles.others} />
      <View style={styles.sections}>
        {LEGAL_DOC_ORDER.filter((id) => id !== docId).map((id) => {
          const other = getLegalDocument(id, language);
          return (
            <Card
              key={id}
              onPress={() => navigation.replace('Legal', { doc: id })}
              accessibilityLabel={other.title}
            >
              <View style={styles.row}>
                <Icon name="document" size={22} color={colors.ink} />
                <AppText size={14} weight="bold" style={styles.flex}>
                  {other.title}
                </AppText>
                <Icon name="arrowRight" size={20} color={colors.ink} />
              </View>
            </Card>
          );
        })}
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  intro: {
    marginTop: 6,
    marginBottom: 14,
  },
  sections: {
    gap: 12,
  },
  heading: {
    marginBottom: 8,
  },
  paragraph: {
    marginBottom: 8,
  },
  item: {
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    gap: 2,
  },
  others: {
    marginTop: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  flex: {
    flex: 1,
  },
});

export default LegalScreen;
