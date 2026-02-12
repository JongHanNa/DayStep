import { Capacitor, registerPlugin } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { Todo } from '@/entities/todo/Todo';

// 네이티브 브리지 인터페이스 정의
interface WidgetTodoData {
  id: string;
  title: string;
  completed: boolean;
  priority: 'high' | 'medium' | 'low';
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
  category?: string;
  tags?: string[];
}

interface SyncOptions {
  todos: WidgetTodoData[];
  maxItems?: number;
  force?: boolean;
}

interface PluginResponse {
  success: boolean;
  message?: string;
  data?: any;
}

// WidgetBridge 플러그인 인터페이스 정의
interface WidgetBridgePlugin {
  syncTodos(options: SyncOptions): Promise<PluginResponse>;
  reloadWidget(): Promise<PluginResponse>;
  getTodos(): Promise<{ todos: WidgetTodoData[]; count: number }>;
  clearTodos(): Promise<PluginResponse>;
  getWidgetStatus(): Promise<any>;
}

// Capacitor registerPlugin을 사용한 네이티브 브리지
const WidgetBridge = Capacitor.isNativePlatform() ? 
  registerPlugin<WidgetBridgePlugin>('WidgetBridge') : 
  null;

// 플러그인 로드 확인
if (Capacitor.isNativePlatform()) {
  console.log('🔵 [WidgetSync] Initializing WidgetBridge plugin...');
  if (WidgetBridge) {
    console.log('🟢 [WidgetSync] WidgetBridge plugin registered successfully');
  } else {
    console.error('🔴 [WidgetSync] WidgetBridge plugin registration failed');
  }
}

export class WidgetSyncService {
  private static instance: WidgetSyncService;
  private lastSyncTime: Date | null = null;
  private syncTimeout: NodeJS.Timeout | null = null;

  public static getInstance(): WidgetSyncService {
    if (!WidgetSyncService.instance) {
      WidgetSyncService.instance = new WidgetSyncService();
    }
    return WidgetSyncService.instance;
  }

  /**
   * 할일 데이터를 위젯과 동기화 (현재 시간 이후 할일 우선)
   */
  async syncTodos(todos: Todo[]): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      console.log('🔵 [WidgetSync] 웹 환경에서는 위젯 동기화가 지원되지 않습니다.');
      return;
    }

    console.log('🔵 [WidgetSync] Starting todo sync with', todos.length, 'todos');

    try {
      // 현재 시간 이후의 할일을 우선으로 필터링 및 정렬
      const optimizedTodos = this.getTimeSortedTodos(todos);
      console.log('🟡 [WidgetSync] Optimized to', optimizedTodos.length, 'todos after time-based sorting');

      // 위젯용 데이터로 변환 (WidgetBridge 형식)
      const widgetTodos = optimizedTodos
        .slice(0, 5) // 최대 5개만
        .map(todo => {
          const widgetTodo = {
            id: todo.id,
            title: this.formatTitleWithTime(todo),
            completed: todo.completed,
            priority: 'medium' as const,
            dueDate: todo.startTime?.toISOString(),
            createdAt: todo.createdAt.toISOString(),
            updatedAt: todo.updatedAt.toISOString(),
            tags: undefined
          };
          
          // 🟡 [WidgetSync] Todo 동기화 진행 중 (상세 로그 제거)
          
          return widgetTodo;
        });

      // 직접 네이티브 브리지를 통해 동기화
      const result = await this.syncTodosToNative(widgetTodos);
      
      console.log('🟢 [WidgetSync] Widget sync successful:', result);
      console.log('🟢 [WidgetSync] 할일 위젯 데이터 동기화 완료:', widgetTodos.length, '개 (현재 시간 이후 우선)');
    } catch (error) {
      console.error('🔴 [WidgetSync] 할일 위젯 동기화 실패:', error);
    }
  }


  /**
   * 모든 위젯 데이터를 동기화 (WidgetBridge는 할일만 지원)
   */
  async syncAllWidgetData(todos: Todo[]): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      console.log('🔵 [WidgetSync] 웹 환경에서는 위젯 동기화가 지원되지 않습니다.');
      return;
    }

    console.log('🔵 [WidgetSync] Starting all widget data sync');

    // WidgetBridge는 할일만 지원하므로 할일 동기화만 수행
    await this.syncTodos(todos);
    this.lastSyncTime = new Date();
    
    console.log('🟢 [WidgetSync] All widget data sync completed (todos only)');
  }

  /**
   * 지연된 위젯 동기화 (성능 최적화)
   */
  debouncedSync(todos: Todo[], delay: number = 1000): void {
    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout);
    }

    this.syncTimeout = setTimeout(() => {
      this.syncAllWidgetData(todos);
    }, delay);
  }

  /**
   * 위젯 강제 새로고침
   */
  async refreshWidget(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      console.log('🔵 [WidgetSync] 웹 환경에서는 위젯 새로고침이 지원되지 않습니다.');
      return;
    }

    try {
      const result = await this.reloadWidgetNative();
      console.log('🟢 [WidgetSync] 위젯 강제 새로고침 완료:', result);
    } catch (error) {
      console.error('🔴 [WidgetSync] 위젯 새로고침 실패:', error);
    }
  }

  /**
   * 마지막 동기화 시간 조회
   */
  getLastSyncTime(): Date | null {
    return this.lastSyncTime;
  }

  /**
   * 위젯 동기화가 필요한지 확인
   */
  needsSync(lastUpdateTime: Date): boolean {
    if (!this.lastSyncTime) {
      return true;
    }
    return lastUpdateTime > this.lastSyncTime;
  }

  /**
   * 현재 시간 기준으로 할일을 정렬 (현재 시간 이후 할일 우선)
   */
  private getTimeSortedTodos(todos: Todo[]): Todo[] {
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes();
    
    return todos
      .filter(todo => {
        // 오늘 할일만 포함 (시간 지정이 없는 할일도 포함)
        if (todo.startTime) {
          const todoDate = new Date(todo.startTime);
          return todoDate >= today && todoDate < tomorrow;
        }
        return true; // 시간 지정이 없는 할일도 포함
      })
      .map((todo: any) => {
        // 시간 지정 할일의 우선순위 계산
        let timePriority = 0;
        
        if (todo.startTime) {
          const todoDate = new Date(todo.startTime);
          const todoTimeInMinutes = todoDate.getHours() * 60 + todoDate.getMinutes();
          
          // 오늘 날짜의 시간 지정 할일인지 확인
          const isTodayTodo = todoDate >= today && todoDate < tomorrow;
          
          if (isTodayTodo) {
            if (todoTimeInMinutes > currentTimeInMinutes) {
              // 현재 시간 이후의 할일: 높은 우선순위 (가까운 시간일수록 높음)
              timePriority = 10000 - (todoTimeInMinutes - currentTimeInMinutes);
            } else {
              // 현재 시간 이전의 할일: 낮은 우선순위
              timePriority = 1000;
            }
          } else if (todoDate > today) {
            // 미래 날짜의 할일: 중간 우선순위
            timePriority = 5000;
          } else {
            // 과거 날짜의 할일: 낮은 우선순위
            timePriority = 500;
          }
        } else {
          // 시간 지정이 없는 할일: 기본 우선순위
          timePriority = 3000;
        }

        return { ...todo, timePriority };
      })
      .sort((a: any, b: any) => {
        // 1. 완료 상태 (미완료 우선)
        if (a.completed !== b.completed) {
          return a.completed ? 1 : -1;
        }

        // 2. 시간 우선순위 (높은 숫자가 우선)
        if (a.timePriority !== b.timePriority) {
          return b.timePriority - a.timePriority;
        }

        // 3. 최근 업데이트 순
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
  }

  /**
   * 할일 제목을 시간 정보와 함께 포맷팅
   */
  private formatTitleWithTime(todo: Todo): string {
    let displayTitle = todo.title.length > 30 ? todo.title.substring(0, 30) + '...' : todo.title;
    
    // 시간 지정 할일인 경우 시간 정보 추가
    if (todo.startTime) {
      const startTime = new Date(todo.startTime);
      const timeString = startTime.toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
      displayTitle = `${timeString} ${displayTitle}`;
    }

    return displayTitle;
  }

  /**
   * 네이티브 위젯 브리지를 통한 할일 동기화
   */
  private async syncTodosToNative(widgetTodos: WidgetTodoData[]): Promise<PluginResponse> {
    try {
      console.log('🔵 [WidgetSync] 네이티브 브리지 호출 시작:', widgetTodos.length, '개 할일');
      
      // 1차: Capacitor Preferences에 백업 저장
      const widgetData = {
        todos: widgetTodos,
        syncedAt: new Date().toISOString(),
        count: widgetTodos.length
      };
      
      await Preferences.set({
        key: 'widget_todos_data',
        value: JSON.stringify(widgetData)
      });
      
      console.log('🟡 [WidgetSync] Capacitor Preferences에 위젯 데이터 저장 완료');
      
      // 2차: WidgetBridge 플러그인을 통한 네이티브 호출
      if (!WidgetBridge) {
        console.log('🟡 [WidgetSync] WidgetBridge 플러그인이 사용 불가능, Preferences 방식만 사용');
        return { 
          success: true, 
          message: `Successfully saved ${widgetTodos.length} todos to Preferences only`,
          data: widgetData 
        };
      }
      
      try {
        console.log('🔵 [WidgetSync] WidgetBridge.syncTodos() 호출 중...');
        const nativeResult = await WidgetBridge.syncTodos({
          todos: widgetTodos,
          maxItems: 5,
          force: false
        });
        
        console.log('🟢 [WidgetSync] WidgetBridge.syncTodos() 성공:', nativeResult);
        return nativeResult;
      } catch (nativeError) {
        console.error('🔴 [WidgetSync] WidgetBridge.syncTodos() 실패:', nativeError);
        
        // Preferences 방식으로도 위젯 새로고침 시도
        console.log('🟡 [WidgetSync] Preferences 방식으로 위젯 새로고침 시도...');
        try {
          await this.reloadWidgetNative();
          console.log('🟢 [WidgetSync] Preferences 방식 위젯 새로고침 성공');
        } catch (reloadError) {
          console.log('🟡 [WidgetSync] 위젯 새로고침도 실패, 수동 새로고침 필요:', reloadError);
        }
        
        // Preferences로 폴백 성공 메시지
        return { 
          success: true, 
          message: `Preferences saved successfully, native bridge failed: ${nativeError}`,
          data: widgetData 
        };
      }
    } catch (error) {
      console.error('🔴 [WidgetSync] 전체 동기화 실패:', error);
      throw error;
    }
  }

  /**
   * 네이티브 위젯 새로고침
   */
  private async reloadWidgetNative(): Promise<PluginResponse> {
    try {
      console.log('🔵 [WidgetSync] 위젯 새로고침 시작');
      
      if (!WidgetBridge) {
        console.log('🟡 [WidgetSync] WidgetBridge 플러그인이 사용 불가능');
        return { success: false, message: 'WidgetBridge plugin not available' };
      }
      
      const result = await WidgetBridge.reloadWidget();
      console.log('🟢 [WidgetSync] 위젯 새로고침 성공:', result);
      return result;
    } catch (error) {
      console.error('🔴 [WidgetSync] 위젯 새로고침 실패:', error);
      throw error;
    }
  }

  /**
   * 정리 작업
   */
  dispose(): void {
    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout);
      this.syncTimeout = null;
    }
  }
}

// 싱글톤 인스턴스 내보내기
export const widgetSyncService = WidgetSyncService.getInstance();