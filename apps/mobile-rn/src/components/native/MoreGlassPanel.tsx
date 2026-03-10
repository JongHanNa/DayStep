/**
 * MoreGlassPanel — iOS 26+ 네이티브 Glass Panel 래퍼
 * More 메뉴 그리드를 glassEffect로 표시하는 오버레이 패널
 *
 * requireNativeComponent은 모듈 레벨에서 1회만 호출 (조건부 호출 금지)
 */
import React from 'react';
import {requireNativeComponent, type ViewStyle} from 'react-native';
import type {NativeMenuItemData} from './LiquidGlassTabBar';

interface NativeMoreGlassPanelProps {
  menuItems: NativeMenuItemData[];
  showLabels: boolean;
  primaryColor: string;
  onMenuItemPress?: (event: {nativeEvent: {screenName: string}}) => void;
  onToggleLabels?: (event: {nativeEvent: {showLabels: boolean}}) => void;
  onDismiss?: (event: {nativeEvent: Record<string, never>}) => void;
  style?: ViewStyle;
}

// 모듈 레벨에서 1회 등록
const NativeMoreGlassPanel =
  requireNativeComponent<NativeMoreGlassPanelProps>('MoreGlassPanel');

export function MoreGlassPanelNative(
  props: NativeMoreGlassPanelProps,
): React.ReactElement {
  return <NativeMoreGlassPanel {...props} />;
}
