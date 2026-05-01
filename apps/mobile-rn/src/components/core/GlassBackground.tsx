/**
 * GlassBackground
 * 절제된 글래스모피즘 — 탭바, 시트 헤더에만 사용
 *
 * iOS 26+: 네이티브 UIGlassEffect (NativeBackgroundNative)
 * iOS 25-: @react-native-community/blur 기반 (기존 동일)
 * Android:  반투명 배경 폴백
 */
import React from 'react';
import {StyleSheet, ViewStyle, StyleProp, Platform, View} from 'react-native';
import {BlurView} from '@react-native-community/blur';
import {NativeBackgroundNative, isIOS26Plus} from '@/components/native';

interface GlassBackgroundProps {
  /** 블러 강도 (default: 20) */
  blurAmount?: number;
  /** 블러 타입 */
  blurType?: 'light' | 'dark' | 'chromeMaterialLight' | 'chromeMaterialDark';
  /** 오버레이 색상 (반투명) */
  overlayColor?: string;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

export function GlassBackground({
  blurAmount = 20,
  blurType = 'light',
  overlayColor = 'rgba(255, 255, 255, 0.7)',
  style,
  children,
}: GlassBackgroundProps) {
  if (Platform.OS === 'android') {
    // Android fallback — 반투명 배경
    return (
      <View style={[styles.container, {backgroundColor: overlayColor}, style]}>
        {children}
      </View>
    );
  }

  // iOS 26+: 네이티브 UIGlassEffect 배경
  if (isIOS26Plus) {
    return (
      <View style={[styles.container, style]}>
        <NativeBackgroundNative />
        <View style={styles.overlay}>{children}</View>
      </View>
    );
  }

  // iOS 25 이하: 기존 BlurView (변경 없음)
  return (
    <BlurView
      blurType={blurType}
      blurAmount={blurAmount}
      style={[styles.container, style]}
      reducedTransparencyFallbackColor={overlayColor}>
      <View style={[styles.overlay, {backgroundColor: overlayColor}]}>
        {children}
      </View>
    </BlurView>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  overlay: {flex: 1},
});
