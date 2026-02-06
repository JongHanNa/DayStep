import type { PluginListenerHandle } from '@capacitor/core';

/**
 * Widget 표시용 할일 데이터 구조
 */
export interface WidgetTodo {
  /** 고유 식별자 */
  id: string;
  /** 할일 제목 */
  title: string;
  /** 완료 상태 */
  completed: boolean;
  /** 우선순위 (high, medium, low) */
  priority: 'high' | 'medium' | 'low';
  /** 마감일 (ISO 8601 형식) */
  dueDate?: string;
  /** 생성일 (ISO 8601 형식) */
  createdAt: string;
  /** 수정일 (ISO 8601 형식) */
  updatedAt: string;
  /** 카테고리 */
  category?: string;
  /** 태그 목록 */
  tags?: string[];
}

/**
 * Widget 동기화 옵션
 */
export interface SyncOptions {
  /** 할일 목록 */
  todos: WidgetTodo[];
  /** 강제 업데이트 여부 */
  force?: boolean;
  /** 동기화할 최대 항목 수 */
  maxItems?: number;
}

/**
 * Widget 업데이트 스케줄 옵션
 */
export interface ScheduleOptions {
  /** 업데이트 간격 (분 단위) */
  intervalMinutes?: number;
  /** 백그라운드 업데이트 허용 여부 */
  allowBackgroundUpdate?: boolean;
}

/**
 * Widget 상태 정보
 */
export interface WidgetStatus {
  /** Widget이 설치되어 있는지 여부 */
  isInstalled: boolean;
  /** 마지막 업데이트 시간 */
  lastUpdate?: string;
  /** 동기화된 할일 개수 */
  syncedTodosCount: number;
  /** 백그라운드 업데이트 가능 여부 */
  backgroundUpdateEnabled: boolean;
}

/**
 * 플러그인 응답 타입
 */
export interface PluginResponse {
  /** 작업 성공 여부 */
  success: boolean;
  /** 응답 메시지 */
  message?: string;
  /** 응답 데이터 */
  data?: any;
}

/**
 * Widget Bridge 플러그인 인터페이스
 */
export interface WidgetBridgePlugin {
  /**
   * 할일 데이터를 Widget과 동기화
   * @param options 동기화 옵션
   * @returns 동기화 결과
   */
  syncTodos(options: SyncOptions): Promise<PluginResponse>;

  /**
   * Widget에서 현재 저장된 할일 데이터를 가져옴
   * @returns 저장된 할일 목록
   */
  getTodos(): Promise<{ todos: WidgetTodo[]; count: number }>;

  /**
   * Widget의 모든 데이터를 삭제
   * @returns 삭제 결과
   */
  clearTodos(): Promise<PluginResponse>;

  /**
   * Widget 새로고침을 요청
   * @returns 새로고침 결과
   */
  reloadWidget(): Promise<PluginResponse>;

  /**
   * Widget 업데이트 스케줄 설정
   * @param options 스케줄 옵션
   * @returns 설정 결과
   */
  scheduleUpdate(options?: ScheduleOptions): Promise<PluginResponse>;

  /**
   * Widget 상태 정보 조회
   * @returns Widget 상태
   */
  getWidgetStatus(): Promise<WidgetStatus>;

  /**
   * 앱을 특정 섹션으로 열기 (딥링킹)
   * @param options 딥링크 옵션
   * @returns 열기 결과
   */
  openApp(options: { section?: string; todoId?: string }): Promise<PluginResponse>;

  /**
   * Widget 데이터 변경 이벤트 리스너 등록
   * @param eventName 이벤트 이름
   * @param listenerFunc 리스너 함수
   * @returns 리스너 핸들
   */
  addListener(
    eventName: 'widgetDataChanged',
    listenerFunc: (data: { todos: WidgetTodo[]; timestamp: string }) => void,
  ): Promise<PluginListenerHandle> & PluginListenerHandle;

  /**
   * Widget 터치 이벤트 리스너 등록
   * @param eventName 이벤트 이름
   * @param listenerFunc 리스너 함수
   * @returns 리스너 핸들
   */
  addListener(
    eventName: 'widgetTapped',
    listenerFunc: (data: { section: string; todoId?: string }) => void,
  ): Promise<PluginListenerHandle> & PluginListenerHandle;

  /**
   * 모든 이벤트 리스너 제거
   */
  removeAllListeners(): Promise<void>;
}

/**
 * Widget 설정 상수
 */
export const WIDGET_CONFIG = {
  /** App Groups 식별자 */
  APP_GROUP_ID: 'group.com.daystep.app',
  /** UserDefaults 키 */
  TODOS_KEY: 'widget_todos',
  /** 최대 동기화 할일 개수 */
  MAX_TODOS: 100,
  /** 기본 업데이트 간격 (분) */
  DEFAULT_UPDATE_INTERVAL: 30,
  /** Widget 식별자 */
  WIDGET_KIND: 'DayStepWidget'
} as const;