/**
 * ThemeSettingsView — 9개 컬러 테마 그리드 선택 + 배경 프리셋 선택
 */
import React from 'react';
import {View, Text, ScrollView, StyleSheet} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {AnimatedPressable} from '@/components/core';
import {backgroundPresetOptions} from '@/components/core/GradientBackground';
import {useSettingsStore} from '@/stores/settingsStore';
import {useTheme} from '@/theme';
import {COLOR_THEMES, type ColorTheme} from '@/theme/colors';
import {Check, ArrowLeft} from 'lucide-react-native';
import type {BackgroundPreset} from '@/stores/settingsStore';

interface ThemeSettingsViewProps {
  onBack: () => void;
}

export function ThemeSettingsView({onBack}: ThemeSettingsViewProps) {
  const {primaryColor} = useTheme();
  const currentTheme = useSettingsStore(s => s.colorTheme);
  const setColorTheme = useSettingsStore(s => s.setColorTheme);
  const backgroundPreset = useSettingsStore(s => s.backgroundPreset);
  const setBackgroundPreset = useSettingsStore(s => s.setBackgroundPreset);

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

      <ScrollView contentContainerStyle={styles.scrollContent}>
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

        {/* 배경 설정 */}
        <Text style={styles.sectionTitle}>배경 설정</Text>
        <View style={styles.bgSection}>
          {backgroundPresetOptions.map(option => {
            const isSelected = backgroundPreset === option.key;
            return (
              <AnimatedPressable
                key={option.key}
                onPress={() => setBackgroundPreset(option.key as BackgroundPreset)}
                hapticType="medium"
                scaleValue={0.97}
                style={[
                  styles.bgOption,
                  isSelected && {borderColor: primaryColor, borderWidth: 2},
                ]}>
                <LinearGradient
                  colors={[...option.preview]}
                  start={{x: 0, y: 0}}
                  end={{x: 1, y: 1}}
                  style={styles.bgPreview}>
                  {isSelected && (
                    <View style={[styles.bgCheck, {backgroundColor: primaryColor}]}>
                      <Check size={12} color="#FFFFFF" strokeWidth={3} />
                    </View>
                  )}
                </LinearGradient>
                <View style={styles.bgTextContainer}>
                  <Text style={[styles.bgLabel, isSelected && {color: primaryColor}]}>
                    {option.label}
                  </Text>
                  <Text style={styles.bgDescription}>{option.description}</Text>
                </View>
              </AnimatedPressable>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1F2937',
  },
  scrollContent: {
    paddingBottom: 40,
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
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    marginLeft: 20,
    marginTop: 24,
    marginBottom: 8,
  },
  bgSection: {
    marginHorizontal: 16,
    gap: 8,
  },
  bgOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  bgPreview: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  bgCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bgTextContainer: {
    flex: 1,
  },
  bgLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  bgDescription: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
});
