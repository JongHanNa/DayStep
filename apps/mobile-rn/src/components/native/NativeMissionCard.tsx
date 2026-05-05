/**
 * NativeMissionCard — iOS 26+ 네이티브 미션 카드 TS 래퍼
 */
import React from 'react';
import {requireNativeComponent, type ViewStyle} from 'react-native';

interface NativeMissionCardProps {
  missionData: string;
  primaryColor: string;
  onExecutePress?: (event: {nativeEvent: Record<string, never>}) => void;
  onPlannerPress?: (event: {nativeEvent: Record<string, never>}) => void;
  onHeightChange?: (event: {nativeEvent: {height: number}}) => void;
  style?: ViewStyle | ViewStyle[];
}

const NativeMissionCardView =
  requireNativeComponent<NativeMissionCardProps>('NativeMissionCard');

export function NativeMissionCardNative(
  props: NativeMissionCardProps,
): React.ReactElement {
  return <NativeMissionCardView {...props} />;
}
