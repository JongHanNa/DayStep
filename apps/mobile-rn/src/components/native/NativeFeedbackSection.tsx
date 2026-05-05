/**
 * NativeFeedbackSection — iOS 네이티브 DisclosureGroup 래퍼 + 폴백
 *
 * iOS: SwiftUI DisclosureGroup (항상 사용)
 * Android / iOS<15: JS 폴백 (Reanimated LayoutAnimation)
 *
 * requireNativeComponent는 모듈 레벨에서 1회만 호출
 */
import React from 'react';
import {Platform, requireNativeComponent} from 'react-native';

export interface FeedbackItem {
  id: string;
  type: 'bug' | 'feature';
  title: string;
  statusBadge: string;
  hasUnread: boolean;
  versionTag?: string | null;
}

export interface NativeFeedbackSectionProps {
  sectionKey: 'review' | 'in_progress' | 'done' | 'declined';
  title: string;
  statusColor: string;
  primaryColor: string;
  myCount: number;
  privateCount: number;
  items: string; // JSON.stringify(FeedbackItem[])
  collapsible: boolean;
  initiallyExpanded: boolean;
  onItemPress: (e: {nativeEvent: {id: string}}) => void;
  onHeightChange: (e: {nativeEvent: {height: number}}) => void;
  onExpandedChange?: (e: {nativeEvent: {expanded: boolean}}) => void;
  style?: any;
}

const NativeFeedbackSectionView =
  Platform.OS === 'ios'
    ? requireNativeComponent<NativeFeedbackSectionProps>('NativeFeedbackSection')
    : null;

/**
 * iOS에서만 네이티브 컴포넌트 반환.
 * Android/웹에서는 null → 호출자 측에서 폴백 분기 필요.
 */
export function NativeFeedbackSectionNative(
  props: NativeFeedbackSectionProps,
): React.ReactElement | null {
  if (!NativeFeedbackSectionView) return null;
  return <NativeFeedbackSectionView {...props} />;
}

export const isNativeFeedbackSectionAvailable = Platform.OS === 'ios';
