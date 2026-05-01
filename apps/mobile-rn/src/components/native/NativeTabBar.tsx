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
  /** 패널 확장 여부 — true면 네이티브 expandedView 활성화 */
  isExpanded?: boolean;
  /** 확장 패널에 표시할 메뉴 아이템 목록 */
  menuItems?: NativeMenuItemData[];
  /** 메뉴 아이템 레이블 표시 여부 */
  showLabels?: boolean;
  onTabPress?: (event: {nativeEvent: {index: number}}) => void;
  /** 확장 패널 메뉴 아이템 탭 */
  onMenuItemPress?: (event: {nativeEvent: {screenName: string}}) => void;
  /** 레이블 토글 */
  onToggleLabels?: (event: {nativeEvent: {showLabels: boolean}}) => void;
  /** 네이티브 뷰 높이 변경 보고 */
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
