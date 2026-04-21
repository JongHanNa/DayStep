/**
 * NativeFocusGarden — iOS 네이티브 집중 정원 래퍼
 * SwiftUI 4-뷰 (일: 5×5 아이소메트릭 / 주 / 월 / 년) 렌더링
 *
 * 청소 정원과 동일 프로토콜. tab 필드는 없음.
 */
import {requireNativeComponent} from 'react-native';
import type {ViewStyle} from 'react-native';

interface NativeFocusGardenProps {
  viewMode: 'day' | 'week' | 'month' | 'year';
  selectedDate: string; // yyyy-MM-dd
  primaryColor: string;
  gardenData: string; // JSON FocusGardenPayload
  onDateSelect?: (e: {nativeEvent: {date: string}}) => void;
  onHeightChange?: (e: {nativeEvent: {height: number}}) => void;
  onViewModeChange?: (e: {nativeEvent: {mode: string}}) => void;
  onMonthChange?: (e: {nativeEvent: {year: number; month: number}}) => void;
  style?: ViewStyle;
}

export const NativeFocusGardenNative =
  requireNativeComponent<NativeFocusGardenProps>('NativeFocusGarden');
