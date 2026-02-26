/**
 * LiquidGlassTabBar — Phase 1 TypeScript 래퍼
 * iOS 26+ 네이티브 Liquid Glass 탭바 컴포넌트
 *
 * requireNativeComponent은 모듈 레벨에서 1회만 호출 (조건부 호출 금지)
 */
import React from 'react';
import {requireNativeComponent, type ViewStyle} from 'react-native';

export interface NativeTabData {
  name: string;
  /** SF Symbol 이름 (e.g. "house", "calendar", "bolt", "flame", "gearshape") */
  sfSymbol: string;
}

interface NativeLiquidGlassTabBarProps {
  tabs: NativeTabData[];
  selectedIndex: number;
  primaryColor: string;
  onTabPress?: (event: {nativeEvent: {index: number}}) => void;
  style?: ViewStyle;
}

// 모듈 레벨에서 1회 등록
const NativeLiquidGlassTabBar =
  requireNativeComponent<NativeLiquidGlassTabBarProps>('LiquidGlassTabBar');

export function LiquidGlassTabBarNative(
  props: NativeLiquidGlassTabBarProps,
): React.ReactElement {
  return <NativeLiquidGlassTabBar {...props} />;
}
