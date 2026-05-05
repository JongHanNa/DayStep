/**
 * NativeBackground — Phase 3 TypeScript 래퍼
 * iOS 26+: 네이티브 UIGlassEffect 배경
 * iOS 25-: 기존 BlurView (GlassBackground.tsx에서 폴백 처리)
 *
 * requireNativeComponent은 모듈 레벨에서 1회만 호출 (조건부 호출 금지)
 */
import React from 'react';
import {requireNativeComponent, StyleSheet, type StyleProp, type ViewStyle} from 'react-native';

interface NativeBackgroundViewProps {
  style?: StyleProp<ViewStyle>;
}

// 모듈 레벨에서 1회 등록
const NativeBackgroundView =
  requireNativeComponent<NativeBackgroundViewProps>(
    'NativeBackground',
  );

export function NativeBackgroundNative({
  style,
}: NativeBackgroundViewProps): React.ReactElement {
  return (
    <NativeBackgroundView style={[StyleSheet.absoluteFill, style]} />
  );
}
