/**
 * NativeTimelineAccordion — iOS 26+ 네이티브 타임라인 TS 래퍼
 * iOS 25-: TimelineSection의 Reanimated 폴백 사용
 *
 * 네이티브 모듈 미등록 시 null export (Xcode 빌드 미포함 대응)
 */
import React from 'react';
import {UIManager, requireNativeComponent} from 'react-native';

interface NativeTimelineAccordionProps {
  timelineData: string;
  primaryColor: string;
  expandedMotivationIds: string[];
  onMotivationToggle: (e: {nativeEvent: {noteId: string}}) => void;
  onMotivationEdit: (e: {nativeEvent: {noteId: string}}) => void;
  onMotivationLongPress: (e: {nativeEvent: {noteId: string; action: string}}) => void;
  onHeightChange: (e: {nativeEvent: {height: number}}) => void;
  style?: any;
}

const hasNativeModule = UIManager.getViewManagerConfig('NativeTimelineAccordion') != null;

const NativeTimelineAccordionView = hasNativeModule
  ? requireNativeComponent<NativeTimelineAccordionProps>('NativeTimelineAccordion')
  : null;

function NativeTimelineAccordionComponent(
  props: NativeTimelineAccordionProps,
): React.ReactElement | null {
  if (!NativeTimelineAccordionView) return null;
  return <NativeTimelineAccordionView {...props} />;
}

/** null when native module not registered (Xcode build not included) */
export const NativeTimelineAccordionNative = hasNativeModule
  ? NativeTimelineAccordionComponent
  : null;
