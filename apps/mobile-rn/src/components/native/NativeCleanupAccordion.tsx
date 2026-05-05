/**
 * NativeCleanupAccordion — iOS 26+ 네이티브 아코디언 TS 래퍼
 * iOS 25-: CleanupScreen의 기존 Reanimated AccordionGroup 폴백 사용
 *
 * requireNativeComponent는 모듈 레벨에서 1회만 호출
 */
import React from 'react';
import {requireNativeComponent} from 'react-native';

interface NativeCleanupAccordionProps {
  accordionData: string;
  primaryColor: string;
  expandedGroups: number[];
  onCategoryPress: (e: {nativeEvent: {categoryKey: string}}) => void;
  onGroupToggle: (e: {nativeEvent: {groupIndex: number}}) => void;
  onHeightChange: (e: {nativeEvent: {height: number}}) => void;
  style?: any;
}

const NativeCleanupAccordionView =
  requireNativeComponent<NativeCleanupAccordionProps>('NativeCleanupAccordion');

export function NativeCleanupAccordionNative(
  props: NativeCleanupAccordionProps,
): React.ReactElement {
  return <NativeCleanupAccordionView {...props} />;
}
