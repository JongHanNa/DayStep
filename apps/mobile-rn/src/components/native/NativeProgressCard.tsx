/**
 * NativeProgressCard — iOS 26+ 네이티브 진행률 카드 TS 래퍼
 */
import React from 'react';
import {requireNativeComponent, type ViewStyle} from 'react-native';

interface NativeProgressCardProps {
  completed: number;
  total: number;
  progress: number;
  primaryColor: string;
  progressText?: string;
  onHeightChange?: (event: {nativeEvent: {height: number}}) => void;
  style?: ViewStyle | ViewStyle[];
}

const NativeProgressCardView =
  requireNativeComponent<NativeProgressCardProps>('NativeProgressCard');

export function NativeProgressCardNative(
  props: NativeProgressCardProps,
): React.ReactElement {
  return <NativeProgressCardView {...props} />;
}
