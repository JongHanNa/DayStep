/**
 * LiquidGlassTabBar — Phase 2 TypeScript 래퍼
 * iOS 26+ 네이티브 Liquid Glass 탭바 컴포넌트
 * 확장/축소 시 SwiftUI glassEffectID 모프 지원
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

export interface NativeMenuItemData {
  label: string;
  sfSymbol: string;
  screenName: string;
  isActive: boolean;
}

interface NativeLiquidGlassTabBarProps {
  tabs: NativeTabData[];
  selectedIndex: number;
  primaryColor: string;
  /** Timer progress 0~1 when active, -1 when inactive */
  timerProgress?: number;
  /** MorePanel 확장 상태 */
  isExpanded?: boolean;
  /** MorePanel 메뉴 아이템 (SF Symbol 기반) */
  menuItems?: NativeMenuItemData[];
  /** 그리드 라벨 표시 여부 */
  showLabels?: boolean;
  onTabPress?: (event: {nativeEvent: {index: number}}) => void;
  /** 메뉴 아이템 탭 시 screenName 전달 */
  onMenuItemPress?: (event: {nativeEvent: {screenName: string}}) => void;
  /** 라벨 토글 시 새 상태 전달 */
  onToggleLabels?: (event: {nativeEvent: {showLabels: boolean}}) => void;
  /** SwiftUI 뷰 높이 변경 시 */
  onHeightChange?: (event: {nativeEvent: {height: number}}) => void;
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
