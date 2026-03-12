/**
 * LiquidGlassButton — 네이티브 글라스 버튼 TypeScript 래퍼
 * iOS 26+: 네이티브 SwiftUI glassEffect 버튼
 * iOS 25-: 기존 AnimatedPressable + GlassBackground 폴백
 *
 * requireNativeComponent은 모듈 레벨에서 1회만 호출 (조건부 호출 금지)
 */
import React from 'react';
import {requireNativeComponent, View, StyleSheet} from 'react-native';
import {AnimatedPressable, GlassBackground} from '@/components/core';
import {isIOS26Plus} from './utils';

interface NativeLiquidGlassButtonProps {
  systemIconName: string;
  iconColor?: string;
  size?: number;
  onButtonPress?: () => void;
  style?: any;
}

// 모듈 레벨에서 1회 등록
const NativeLiquidGlassButton =
  requireNativeComponent<NativeLiquidGlassButtonProps>('LiquidGlassButton');

interface LiquidGlassButtonProps {
  systemIconName: string;
  iconColor?: string;
  size?: number;
  onPress?: () => void;
  /** iOS 25- 폴백 시 렌더링할 아이콘 */
  fallbackIcon?: React.ReactNode;
}

export function LiquidGlassButton({
  systemIconName,
  iconColor = '#6B7280',
  size = 40,
  onPress,
  fallbackIcon,
}: LiquidGlassButtonProps): React.ReactElement {
  if (isIOS26Plus) {
    return (
      <NativeLiquidGlassButton
        systemIconName={systemIconName}
        iconColor={iconColor}
        size={size}
        onButtonPress={onPress}
        style={{width: size, height: size}}
      />
    );
  }

  // iOS 25- 폴백: 기존 JS 글라스 버튼
  return (
    <AnimatedPressable
      onPress={onPress}
      hapticType="light"
      scaleValue={0.9}
      style={[styles.btn, {width: size, height: size}]}>
      <GlassBackground
        blurAmount={16}
        overlayColor="rgba(255,255,255,0.55)"
        style={styles.btnInner}>
        <View style={styles.btnContent}>
          {fallbackIcon}
        </View>
      </GlassBackground>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  btnInner: {
    flex: 1,
    borderRadius: 20,
  },
  btnContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
