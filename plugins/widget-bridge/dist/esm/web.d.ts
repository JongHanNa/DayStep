import { WebPlugin } from '@capacitor/core';
import type { PluginListenerHandle } from '@capacitor/core';
import type { WidgetBridgePlugin, SyncOptions, ScheduleOptions, WidgetStatus, PluginResponse, WidgetTodo } from './definitions';
/**
 * Widget Bridge Web 구현체
 * 웹 환경에서는 localStorage를 사용하여 Widget 기능을 시뮬레이션
 */
export declare class WidgetBridgeWeb extends WebPlugin implements WidgetBridgePlugin {
    private readonly STORAGE_KEY;
    private readonly STATUS_KEY;
    constructor();
    syncTodos(options: SyncOptions): Promise<PluginResponse>;
    getTodos(): Promise<{
        todos: WidgetTodo[];
        count: number;
    }>;
    clearTodos(): Promise<PluginResponse>;
    reloadWidget(): Promise<PluginResponse>;
    scheduleUpdate(options?: ScheduleOptions): Promise<PluginResponse>;
    getWidgetStatus(): Promise<WidgetStatus>;
    openApp(options: {
        section?: string;
        todoId?: string;
    }): Promise<PluginResponse>;
    /**
     * Widget 상태 업데이트 (내부 헬퍼 메서드)
     */
    private updateStatus;
    /**
     * 이벤트 리스너 등록 (웹 환경에서는 모의 구현)
     */
    addListener(eventName: 'widgetDataChanged', listenerFunc: (data: {
        todos: WidgetTodo[];
        timestamp: string;
    }) => void): Promise<PluginListenerHandle> & PluginListenerHandle;
    addListener(eventName: 'widgetTapped', listenerFunc: (data: {
        section: string;
        todoId?: string;
    }) => void): Promise<PluginListenerHandle> & PluginListenerHandle;
    /**
     * 모든 이벤트 리스너 제거
     */
    removeAllListeners(): Promise<void>;
    /**
     * 웹 환경에서의 모의 데이터 생성 (개발/테스트용)
     */
    generateMockData(): Promise<PluginResponse>;
}
//# sourceMappingURL=web.d.ts.map