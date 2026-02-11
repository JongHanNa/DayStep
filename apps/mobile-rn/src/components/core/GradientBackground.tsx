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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
