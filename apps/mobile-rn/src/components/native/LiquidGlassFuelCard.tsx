/**
 * LiquidGlassFuelCard — Phase 2 TypeScript 래퍼
 * iOS 26+ 네이티브 Liquid Glass FuelCard morph 컴포넌트
 *
 * requireNativeComponent은 모듈 레벨에서 1회만 호출 (조건부 호출 금지)
 */
import React from 'react';
import {requireNativeComponent, type ViewStyle} from 'react-native';

interface NativeLiquidGlassFuelCardProps {
  noteTitle?: string;
  noteContent?: string;
  hasNote: boolean;
  isExpanded: boolean;
  onExpand?: (event: {nativeEvent: Record<string, never>}) => void;
  onCollapse?: (event: {nativeEvent: Record<string, never>}) => void;
  style?: ViewStyle;
}

// 모듈 레벨에서 1회 등록
const NativeLiquidGlassFuelCard =
  requireNativeComponent<NativeLiquidGlassFuelCardProps>('LiquidGlassFuelCard');

export function LiquidGlassFuelCardNative(
  props: NativeLiquidGlassFuelCardProps,
): React.ReactElement {
  return <NativeLiquidGlassFuelCard {...props} />;
}
