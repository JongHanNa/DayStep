export interface DayStepWidgetPlugin {
  /**
   * 위젯에 할일 데이터를 업데이트합니다
   */
  updateTodoData(options: { todos: TodoWidgetData[] }): Promise<{ success: boolean }>;

  /**
   * 위젯 새로고침을 강제로 실행합니다
   */
  refreshWidget(): Promise<{ success: boolean }>;

  /**
   * 위젯에 표시할 데이터를 모두 업데이트합니다
   */
  updateAllWidgetData(options: { 
    todos: TodoWidgetData[], 
    todayProgress: number 
  }): Promise<{ success: boolean }>;

  /**
   * 스케줄된 알림을 설정합니다
   */
  scheduleNotification(options: NotificationOptions): Promise<{ success: boolean }>;

  /**
   * 알림 권한을 요청합니다
   */
  requestNotificationPermission(): Promise<{ granted: boolean }>;
}

export interface TodoWidgetData {
  id: string;
  title: string;
  completed: boolean;
  scheduledTime?: string;
  priority?: 'low' | 'medium' | 'high';
}

export interface NotificationOptions {
  title: string;
  body: string;
  scheduledTime: string; // ISO string
  todoId?: string;
  type: 'reminder' | 'todo';
}