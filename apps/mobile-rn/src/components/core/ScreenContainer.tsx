/**
 * ScreenContainer
 * SafeArea + 그라디언트 배경 래퍼 — 모든 화면의 기본 컨테이너
 */
import React from 'react';
import {StyleSheet, ViewStyle, StyleProp, StatusBar} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {GradientBackground, gradientPresets} from './GradientBackground';
import {useSettingsStore} from '@/stores/settingsStore';

type GradientPreset = keyof typeof gradientPresets;

interface ScreenContainerProps {
  children: React.ReactNode;
  /** 그라디언트 프리셋 */
  gradient?: GradientPreset;
  /** 커스텀 그라디언트 색상 (프리셋 대신 사용) */
  gradientColors?: string[];
  /** 배경색 (그라디언트 미사용 시) */
  backgroundColor?: string;
  /** SafeArea edges */
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
  /** StatusBar 스타일 */
  statusBarStyle?: 'light-content' | 'dark-content';
  style?: StyleProp<ViewStyle>;
}

export function ScreenContainer({
  children,
  gradient,
  gradientColors,
  backgroundColor = '#FFFFFF',
  edges = ['top', 'left', 'right'],
  statusBarStyle = 'dark-content',
  style,
}: ScreenContainerProps) {
  const backgroundPreset = useSettingsStore(s => s.backgroundPreset);
  const effectiveGradient = backgroundPreset;
  const preset = effectiveGradient ? gradientPresets[effectiveGradient] : null;
  const colors = gradientColors ?? preset?.colors;

  return (
    <>
      <StatusBar barStyle={statusBarStyle} />
      {colors ? (
        <GradientBackground
          colors={colors}
          start={preset?.start}
          end={preset?.end}
          style={styles.flex}>
          <SafeAreaView edges={edges} style={[styles.flex, style]}>
            {children}
          </SafeAreaView>
        </GradientBackground>
      ) : (
        <SafeAreaView
          edges={edges}
          style={[styles.flex, {backgroundColor}, style]}>
          {children}
        </SafeAreaView>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
});
