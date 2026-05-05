/**
 * ScreenContainer
 * SafeArea + 그라디언트 배경 래퍼 — 모든 화면의 기본 컨테이너
 */
import React, {useCallback, useEffect} from 'react';
import {StyleSheet, View, ViewStyle, StyleProp, StatusBar, Platform, NativeModules} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useFocusEffect} from '@react-navigation/native';
import {GradientBackground, gradientPresets} from './GradientBackground';
import {useSettingsStore} from '@/stores/settingsStore';
import {useResponsiveLayout} from '@/hooks/useResponsiveLayout';

const {NavigationBarColor} = NativeModules;

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
  const {contentMaxWidth} = useResponsiveLayout();

  // Android: 프리셋 첫 번째 색상을 상태바/네비게이션바에 적용
  const systemBarColor = colors?.[0] ?? backgroundColor;
  const isLightBar = statusBarStyle === 'dark-content';

  // 화면 포커스 시마다 네비바 색상 복원 (다른 화면에서 변경된 색상 덮어쓰기)
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS === 'android' && NavigationBarColor) {
        NavigationBarColor.setColor(systemBarColor, !isLightBar);
      }
    }, [systemBarColor, isLightBar]),
  );

  const innerContent = contentMaxWidth > 0 ? (
    <View style={[styles.flex, {alignItems: 'center'}]}>
      <View style={[styles.flex, {width: '100%', maxWidth: contentMaxWidth}]}>
        {children}
      </View>
    </View>
  ) : children;

  return (
    <>
      <StatusBar
        barStyle={statusBarStyle}
        backgroundColor={Platform.OS === 'android' ? systemBarColor : undefined}
      />
      {colors ? (
        <GradientBackground
          colors={colors}
          start={preset?.start}
          end={preset?.end}
          style={styles.flex}>
          <SafeAreaView edges={edges} style={[styles.flex, style]}>
            {innerContent}
          </SafeAreaView>
        </GradientBackground>
      ) : (
        <SafeAreaView
          edges={edges}
          style={[styles.flex, {backgroundColor}, style]}>
          {innerContent}
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
