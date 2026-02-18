/**
 * ThemeSettingsView — 9개 컬러 테마 그리드 선택
 */
import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {AnimatedPressable} from '@/components/core';
import {useSettingsStore} from '@/stores/settingsStore';
import {useTheme} from '@/theme';
import {COLOR_THEMES, type ColorTheme} from '@/theme/colors';
import {Check, ArrowLeft} from 'lucide-react-native';

interface ThemeSettingsViewProps {
  onBack: () => void;
}

export function ThemeSettingsView({onBack}: ThemeSettingsViewProps) {
  const {primaryColor} = useTheme();
  const currentTheme = useSettingsStore(s => s.colorTheme);
  const setColorTheme = useSettingsStore(s => s.setColorTheme);

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <AnimatedPressable onPress={onBack} hapticType="light" scaleValue={0.9}>
          <ArrowLeft size={24} color="#1F2937" strokeWidth={2} />
        </AnimatedPressable>
        <Text style={styles.title}>테마 색상</Text>
        <View style={{width: 24}} />
      </View>

      {/* 테마 그리드 */}
      <View style={styles.grid}>
        {COLOR_THEMES.map(theme => {
          const isSelected = currentTheme === theme.id;
          return (
            <AnimatedPressable
              key={theme.id}
              onPress={() => setColorTheme(theme.id)}
              hapticType="medium"
              scaleValue={0.92}
              style={[
                styles.themeCard,
                isSelected && {borderColor: theme.colors.primary, borderWidth: 2},
              ]}>
              <View
                style={[styles.colorCircle, {backgroundColor: theme.colors.primary}]}>
                {isSelected && <Check size={18} color="#FFFFFF" strokeWidth={3} />}
              </View>
              <Text style={styles.themeIcon}>{theme.icon}</Text>
              <Text style={styles.themeName}>{theme.nameKo}</Text>
            </AnimatedPressable>
          );
        })}
      </View>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1F2937',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
  },
  themeCard: {
    width: '30%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  colorCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  themeIcon: {
    fontSize: 16,
    marginBottom: 4,
  },
  themeName: {
    fontSize: 12,
    fontWeight: '500',
    color: '#4B5563',
  },
});
