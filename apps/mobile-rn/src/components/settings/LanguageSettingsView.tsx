/**
 * LanguageSettingsView — 앱 언어 선택
 * null = 시스템 기본 (기기 언어 따라감)
 */
import React from 'react';
import {View, Text, ScrollView, StyleSheet} from 'react-native';
import {useTranslation} from 'react-i18next';
import {AnimatedPressable} from '@/components/core';
import {useTheme} from '@/theme';
import {Check, ArrowLeft} from 'lucide-react-native';
import {
  changeLanguage,
  getLanguageSetting,
  SUPPORTED_LANGUAGES,
  type SupportedLanguage,
} from '@/i18n';

interface LanguageSettingsViewProps {
  onBack: () => void;
}

type Option = {key: SupportedLanguage | null; labelKey: string};

const OPTIONS: Option[] = [
  {key: null, labelKey: 'language.systemDefault'},
  ...SUPPORTED_LANGUAGES.map(code => ({
    key: code,
    labelKey: `language.${code}`,
  })),
];

export function LanguageSettingsView({onBack}: LanguageSettingsViewProps) {
  const {t} = useTranslation();
  const {primaryColor} = useTheme();
  const [selected, setSelected] = React.useState<SupportedLanguage | null>(
    getLanguageSetting(),
  );

  const handleSelect = (lang: SupportedLanguage | null) => {
    setSelected(lang);
    changeLanguage(lang);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <AnimatedPressable onPress={onBack} hapticType="light" scaleValue={0.9}>
          <ArrowLeft size={24} color="#1F2937" strokeWidth={2} />
        </AnimatedPressable>
        <Text style={styles.title}>{t('language.title')}</Text>
        <View style={{width: 24}} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          {OPTIONS.map((option, index) => {
            const isSelected = selected === option.key;
            return (
              <React.Fragment key={option.key ?? 'system'}>
                <AnimatedPressable
                  onPress={() => handleSelect(option.key)}
                  hapticType="light"
                  scaleValue={0.98}
                  style={styles.row}>
                  <Text style={styles.rowLabel}>{t(option.labelKey)}</Text>
                  {isSelected && (
                    <Check size={20} color={primaryColor} strokeWidth={2.5} />
                  )}
                </AnimatedPressable>
                {index < OPTIONS.length - 1 && <View style={styles.divider} />}
              </React.Fragment>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  scrollContent: {
    paddingBottom: 120,
  },
  section: {
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowLabel: {
    fontSize: 15,
    color: '#1F2937',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginLeft: 16,
  },
});
