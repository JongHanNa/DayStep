/**
 * NativeContactNudge — iOS 26+ 네이티브 연락 추천 리스트 TS 래퍼
 */
import React from 'react';
import {requireNativeComponent, type ViewStyle} from 'react-native';

interface NativeContactNudgeProps {
  primaryColor?: string;
  contactsData: string;
  onContactPress?: (event: {nativeEvent: {personName: string}}) => void;
  onHeightChange?: (event: {nativeEvent: {height: number}}) => void;
  style?: ViewStyle | ViewStyle[];
}

const NativeContactNudgeView =
  requireNativeComponent<NativeContactNudgeProps>('NativeContactNudge');

export function NativeContactNudgeNative(
  props: NativeContactNudgeProps,
): React.ReactElement {
  return <NativeContactNudgeView {...props} />;
}
