/**
 * NativeMotivationCard — Phase 2 TypeScript 래퍼
 * iOS 26+ 네이티브 Liquid Glass MotivationCard morph 컴포넌트
 *
 * requireNativeComponent은 모듈 레벨에서 1회만 호출 (조건부 호출 금지)
 * 네이티브 컴포넌트 등록명: 'NativeMotivationCard' (Swift/ObjC 측과 일치)
 */
import React from 'react';
import {requireNativeComponent, type ViewStyle} from 'react-native';

interface NativeMotivationCardViewProps {
  primaryColor?: string;
  noteTitle?: string;
  noteContent?: string;
  hasNote: boolean;
  isExpanded: boolean;
  onExpand?: (event: {nativeEvent: Record<string, never>}) => void;
  onCollapse?: (event: {nativeEvent: Record<string, never>}) => void;
  onHeightChange?: (event: {nativeEvent: {height: number}}) => void;
  style?: ViewStyle | ViewStyle[];
}

// 모듈 레벨에서 1회 등록
const NativeMotivationCardView =
  requireNativeComponent<NativeMotivationCardViewProps>('NativeMotivationCard');

export function NativeMotivationCardNative(
  props: NativeMotivationCardViewProps,
): React.ReactElement {
  return <NativeMotivationCardView {...props} />;
}
