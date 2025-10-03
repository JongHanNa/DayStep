import { WebPlugin } from '@capacitor/core';
/**
 * Widget Bridge Web 구현체
 * 웹 환경에서는 localStorage를 사용하여 Widget 기능을 시뮬레이션
 */
export class WidgetBridgeWeb extends WebPlugin {
    constructor() {
        super();
        this.STORAGE_KEY = 'daystep_widget_todos';
        this.STATUS_KEY = 'daystep_widget_status';
        // WidgetBridge Web implementation initialized
    }
    async syncTodos(options) {
        try {
            const { todos, maxItems = 100 } = options;
            // 최대 항목 수 제한
            const limitedTodos = todos.slice(0, maxItems);
            // localStorage에 저장
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(limitedTodos));
            // 상태 업데이트
            await this.updateStatus(limitedTodos.length);
            // Web: Synced todos to localStorage
            return {
                success: true,
                message: `Successfully synced ${limitedTodos.length} todos`,
                data: { count: limitedTodos.length }
            };
        }
        catch (error) {
            console.error('Web: Failed to sync todos:', error);
            return {
                success: false,
                message: 'Failed to sync todos in web environment'
            };
        }
    }
    async getTodos() {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            const todos = stored ? JSON.parse(stored) : [];
            // Web: Retrieved todos from localStorage
            return {
                todos,
                count: todos.length
            };
        }
        catch (error) {
            console.error('Web: Failed to get todos:', error);
            return {
                todos: [],
                count: 0
            };
        }
    }
    async clearTodos() {
        try {
            localStorage.removeItem(this.STORAGE_KEY);
            await this.updateStatus(0);
            // Web: Cleared all todos from localStorage
            return {
                success: true,
                message: 'All todos cleared from web storage'
            };
        }
        catch (error) {
            console.error('Web: Failed to clear todos:', error);
            return {
                success: false,
                message: 'Failed to clear todos in web environment'
            };
        }
    }
    async reloadWidget() {
        // Web: Widget reload requested (no-op in web environment)
        // 웹에서는 실제 Widget이 없으므로 성공으로 처리
        return {
            success: true,
            message: 'Widget reload requested (web environment)'
        };
    }
    async scheduleUpdate(options) {
        // Web: Widget update scheduled (no-op in web environment)
        return {
            success: true,
            message: 'Widget update scheduled (web environment)'
        };
    }
    async getWidgetStatus() {
        try {
            const stored = localStorage.getItem(this.STATUS_KEY);
            const defaultStatus = {
                isInstalled: false, // 웹에서는 Widget이 설치되지 않음
                syncedTodosCount: 0,
                backgroundUpdateEnabled: false
            };
            if (stored) {
                const status = JSON.parse(stored);
                return Object.assign(Object.assign({}, defaultStatus), status);
            }
            return defaultStatus;
        }
        catch (error) {
            console.error('Web: Failed to get widget status:', error);
            return {
                isInstalled: false,
                syncedTodosCount: 0,
                backgroundUpdateEnabled: false
            };
        }
    }
    async openApp(options) {
        const { section = 'todos', todoId } = options;
        try {
            // 웹에서는 현재 페이지 내에서 네비게이션 처리
            let path = `/${section}`;
            if (todoId) {
                path += `?id=${todoId}`;
            }
            // 브라우저 히스토리 업데이트 (실제 네비게이션은 라우터가 처리)
            if (typeof window !== 'undefined' && window.history) {
                window.history.pushState({}, '', path);
                // 커스텀 이벤트 발생으로 라우터에 알림
                window.dispatchEvent(new CustomEvent('daystepNavigate', {
                    detail: { section, todoId, path }
                }));
            }
            // Web: Navigation requested
            return {
                success: true,
                message: `Navigated to ${path}`,
                data: { path, section, todoId }
            };
        }
        catch (error) {
            console.error('Web: Failed to navigate:', error);
            return {
                success: false,
                message: 'Failed to navigate in web environment'
            };
        }
    }
    /**
     * Widget 상태 업데이트 (내부 헬퍼 메서드)
     */
    async updateStatus(todosCount) {
        try {
            const status = {
                lastUpdate: new Date().toISOString(),
                syncedTodosCount: todosCount
            };
            localStorage.setItem(this.STATUS_KEY, JSON.stringify(status));
        }
        catch (error) {
            console.error('Web: Failed to update status:', error);
        }
    }
    addListener(eventName, listenerFunc) {
        // Web: Event listener registered
        const handle = {
            remove: async () => {
                // Web: Event listener removed
            }
        };
        // Promise와 PluginListenerHandle 둘 다 반환하는 특수한 객체
        return Object.assign(Promise.resolve(handle), handle);
    }
    /**
     * 모든 이벤트 리스너 제거
     */
    async removeAllListeners() {
        // Web: All event listeners removed
    }
    /**
     * 웹 환경에서의 모의 데이터 생성 (개발/테스트용)
     */
    async generateMockData() {
        const mockTodos = [
            {
                id: '1',
                title: '프로젝트 마무리',
                completed: false,
                priority: 'high',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                category: '업무'
            },
            {
                id: '2',
                title: '운동하기',
                completed: true,
                priority: 'medium',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                category: '건강'
            },
            {
                id: '3',
                title: '책 읽기',
                completed: false,
                priority: 'low',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                category: '자기계발'
            }
        ];
        return this.syncTodos({ todos: mockTodos });
    }
}
