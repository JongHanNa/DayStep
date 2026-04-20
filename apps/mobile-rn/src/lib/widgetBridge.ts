/**
 * widgetBridge.ts — iOS WidgetKit / Android AppWidget 연동 RN 브리지
 * DayStepWidgetModule (Swift/Kotlin Native Module) 래퍼
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
 * 월간 데이터를 위젯에 동기화 (iOS + Android)
 */
export async function syncWidgetData(
  payload: WidgetCalendarPayload,
): Promise<void> {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return;
  if (!DayStepWidgetModule) return;

  try {
    const jsonString = JSON.stringify(payload);
    await DayStepWidgetModule.updateWidgetData(jsonString);
  } catch (err) {
    console.warn('[widgetBridge] syncWidgetData failed:', err);
  }
}

/**
 * 위젯 타임라인 강제 갱신 (앱 포그라운드 복귀 시) (iOS + Android)
 */
export async function reloadWidgetTimelines(): Promise<void> {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return;
  if (!DayStepWidgetModule) return;

  try {
    await DayStepWidgetModule.reloadWidgetTimelines();
  } catch (err) {
    console.warn('[widgetBridge] reloadWidgetTimelines failed:', err);
  }
}
