/**
 * NativeSleepActionButton — 기상하기 네이티브 글라스 버튼 TS 래퍼
 * iOS 26+: 네이티브 SwiftUI glassEffect 캡슐 버튼
 * iOS 25-: AnimatedPressable 폴백
 */
import React from 'react';
import {requireNativeComponent, StyleSheet} from 'react-native';
import {AnimatedPressable} from '@/components/core';
import {isIOS26Plus} from './utils';
import {Text} from 'react-native';

interface NativeProps {
  title: string;
  buttonColor?: string;
  titleColor?: string;
  onButtonPress?: () => void;
  style?: any;
}

const NativeButton = requireNativeComponent<NativeProps>('NativeSleepActionButton');

interface Props {
  title?: string;
  backgroundColor?: string;
  onPress?: () => void;
}

export function NativeSleepActionButton({
  title = '기상하기',
  backgroundColor = '#22C55E',
  onPress,
}: Props): React.ReactElement {
  if (isIOS26Plus) {
    return (
      <NativeButton
        title={title}
        buttonColor={backgroundColor}
        titleColor="#FFFFFF"
        onButtonPress={onPress}
        style={styles.nativeBtn}
      />
    );
  }

  // iOS 25- 폴백
  return (
    <AnimatedPressable
      onPress={onPress}
      hapticType="medium"
      scaleValue={0.95}
      style={[styles.fallbackBtn, {backgroundColor}]}>
      <Text style={styles.fallbackText}>{title}</Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  nativeBtn: {
    height: 52,
    alignSelf: 'center',
    minWidth: 200,
  },
  fallbackBtn: {
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  fallbackText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
});
