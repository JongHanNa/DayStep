/**
 * widgetBridge.ts — iOS WidgetKit 연동 RN 브리지
 * DayStepWidgetModule (Swift Native Module) 래퍼
 * Android에서는 no-op으로 처리
 */
import {NativeModules, Platform} from 'react-native';

export interface WidgetTodoItem {
  title: string;
  color: string;
}

export interface WidgetCalendarDay {
  date: string;           // 'YYYY-MM-DD'
  todos: WidgetTodoItem[]; // 할일 목록 (최대 5개)
}

export interface WidgetCalendarPayload {
  year: number;
  month: number;      // 1-12
  days: WidgetCalendarDay[];
}

const {DayStepWidgetModule} = NativeModules;

/**
 * 월간 데이터를 위젯에 동기화
 * iOS 전용: Android는 no-op
 */
export async function syncWidgetData(
  payload: WidgetCalendarPayload,
): Promise<void> {
  if (Platform.OS !== 'ios') return;
  if (!DayStepWidgetModule) return;

  try {
    const jsonString = JSON.stringify(payload);
    await DayStepWidgetModule.updateWidgetData(jsonString);
  } catch (err) {
    console.warn('[widgetBridge] syncWidgetData failed:', err);
  }
}

/**
 * 위젯 타임라인 강제 갱신 (앱 포그라운드 복귀 시)
 * iOS 전용: Android는 no-op
 */
export async function reloadWidgetTimelines(): Promise<void> {
  if (Platform.OS !== 'ios') return;
  if (!DayStepWidgetModule) return;

  try {
    await DayStepWidgetModule.reloadWidgetTimelines();
  } catch (err) {
    console.warn('[widgetBridge] reloadWidgetTimelines failed:', err);
  }
}
