/**
 * NativeGroupSection — iOS 26+ 네이티브 그룹 섹션 TS 래퍼
 */
import React from 'react';
import {requireNativeComponent, type ViewStyle} from 'react-native';

interface NativeGroupSectionProps {
  sectionData: string;
  title: string;
  dotColor: string;
  primaryColor: string;
  onItemPress?: (event: {nativeEvent: {itemId: string}}) => void;
  onHeightChange?: (event: {nativeEvent: {height: number}}) => void;
  style?: ViewStyle | ViewStyle[];
}

const NativeGroupSectionView =
  requireNativeComponent<NativeGroupSectionProps>('NativeGroupSection');

export function NativeGroupSectionNative(
  props: NativeGroupSectionProps,
): React.ReactElement {
  return <NativeGroupSectionView {...props} />;
}
