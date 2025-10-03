import { WebPlugin } from '@capacitor/core';
import type { 
  DayStepWidgetPlugin, 
  TodoWidgetData, 
  NotificationOptions 
} from './definitions';

export class DayStepWidgetWeb extends WebPlugin implements DayStepWidgetPlugin {
  async updateTodoData(options: { todos: TodoWidgetData[] }): Promise<{ success: boolean }> {
    console.log('Web: updateTodoData', options);
    // 웹 환경에서는 위젯이 없으므로 성공으로 처리
    return { success: true };
  }


  async refreshWidget(): Promise<{ success: boolean }> {
    console.log('Web: refreshWidget');
    return { success: true };
  }

  async updateAllWidgetData(options: { 
    todos: TodoWidgetData[], 
    todayProgress: number 
  }): Promise<{ success: boolean }> {
    console.log('Web: updateAllWidgetData', options);
    return { success: true };
  }

  async scheduleNotification(options: NotificationOptions): Promise<{ success: boolean }> {
    console.log('Web: scheduleNotification', options);
    // 웹에서는 Web Push API를 사용할 수 있지만 여기서는 간단히 처리
    return { success: true };
  }

  async requestNotificationPermission(): Promise<{ granted: boolean }> {
    console.log('Web: requestNotificationPermission');
    // 웹에서는 Notification API 사용
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return { granted: permission === 'granted' };
    }
    return { granted: false };
  }
}