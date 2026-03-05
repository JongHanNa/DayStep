/**
 * GradientBackground
 * 부드러운 그라디언트 배경 — Calm Luxe 분위기
 * LinearGradient 기반 (Skia 메시 그라디언트는 Phase 2+에서 점진적 적용)
 */
import React from 'react';
import {StyleSheet, ViewStyle, StyleProp} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

interface GradientBackgroundProps {
  /** 그라디언트 색상 (최소 2개) */
  colors: string[];
  /** 시작 좌표 (default: top-left) */
  start?: {x: number; y: number};
  /** 끝 좌표 (default: bottom-right) */
  end?: {x: number; y: number};
  /** 색상 위치 */
  locations?: number[];
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

export function GradientBackground({
  colors,
  start = {x: 0, y: 0},
  end = {x: 1, y: 1},
  locations,
  style,
  children,
}: GradientBackgroundProps) {
  return (
    <LinearGradient
      colors={colors}
      start={start}
      end={end}
      locations={locations}
      style={[styles.container, style]}>
      {children}
    </LinearGradient>
  );
}

/** 프리셋 그라디언트 */
export const gradientPresets = {
  /** 따뜻한 배경 (홈) */
  warmBackground: {
    colors: ['#FFF7ED', '#FFFBEB', '#FFFFFF'],
    start: {x: 0, y: 0},
    end: {x: 1, y: 1},
  },
  /** 차분한 배경 (플래너) */
  calmBackground: {
    colors: ['#F0F9FF', '#F5F3FF', '#FFFFFF'],
    start: {x: 0, y: 0},
    end: {x: 0.5, y: 1},
  },
  /** 저녁 배경 */
  eveningBackground: {
    colors: ['#EDE9FE', '#FCE7F3', '#FFFFFF'],
    start: {x: 0, y: 0},
    end: {x: 1, y: 1},
  },
  /** 실행 모드 */
  executionBackground: {
    colors: ['#FFF7ED', '#FEF3C7', '#FFFFFF'],
    start: {x: 0, y: 0},
    end: {x: 0, y: 1},
  },
} as const;

/** 배경 프리셋 선택 옵션 (설정 UI용) */
export const backgroundPresetOptions = [
{key: 'warmBackground' as const, label: '따뜻한 크림', description: '홈화면 배경', preview: ['#FFF7ED', '#FFFBEB']},
  {key: 'calmBackground' as const, label: '차분한 블루', description: '하루계획하기 배경', preview: ['#F0F9FF', '#F5F3FF']},
  {key: 'eveningBackground' as const, label: '저녁 보라', description: '저녁 시간 배경', preview: ['#EDE9FE', '#FCE7F3']},
  {key: 'executionBackground' as const, label: '실행 오렌지', description: '실행 모드 배경', preview: ['#FFF7ED', '#FEF3C7']},
] as const;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
