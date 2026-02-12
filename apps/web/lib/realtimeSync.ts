// lib/realtimeSync.ts - Supabase Realtime 실시간 동기화 시스템
import { supabase } from './supabase';
import { useTodoStore } from '@/state/stores/todoStore';
import { Todo } from '@/entities/todo/Todo';

let isRealtimeActive = false;
let cleanup: (() => void) | null = null;
let realtimeStatus = 'disconnected'; // 연결 상태 추적

export function setupRealtimeSync() {
  // 이미 활성화된 경우 중복 방지
  if (isRealtimeActive) {
    console.log('🔄 실시간 동기화 이미 활성화됨');
    return cleanup || (() => {});
  }

  console.log('🚀 실시간 동기화 시작');
  isRealtimeActive = true;

  // 스토어 인스턴스 가져오기
  const todoStore = useTodoStore.getState();

  // 할일 테이블 실시간 구독
  const todosChannel = supabase
    .channel('todos-web-sync', {
      config: {
        presence: {
          key: `user-${Date.now()}`
        },
      }
    })
    .on('postgres_changes', {
      event: '*', // INSERT, UPDATE, DELETE 모든 이벤트
      schema: 'public',
      table: 'todos'
    }, (payload: any) => {
      console.log(`📡 할일 변경 감지:`, {
        event: payload.eventType,
        table: payload.table,
        id: payload.new?.id || payload.old?.id,
        timestamp: new Date().toLocaleTimeString()
      });
      
      // 실시간 변경 감지 - 스토어 업데이트로 즉시 동기화
      if (payload.eventType === 'INSERT' && payload.new) {
        // ✅ 반복 할일 인스턴스는 클라이언트에서 가상 생성하므로 Realtime 동기화 스킵
        if (payload.new.parent_todo_id) {
          console.log('🔄 반복 할일 인스턴스 INSERT 감지 - 클라이언트에서 생성하므로 스킵:', {
            id: payload.new.id,
            parentId: payload.new.parent_todo_id,
            title: payload.new.title
          });
          return;
        }

        // Zustand에 직접 추가 (parent todo만)
        const currentState = useTodoStore.getState();
        const newTodo = Todo.fromDatabase(payload.new);
        if (!currentState.todos.find(t => t.id === newTodo.id)) {
          useTodoStore.setState({
            todos: [...currentState.todos, newTodo]
          });
        }
      } else if (payload.eventType === 'UPDATE' && payload.new) {
        // Zustand에서 기존 할일 업데이트
        const currentState = useTodoStore.getState();
        const index = currentState.todos.findIndex(t => t.id === payload.new.id);
        if (index !== -1) {
          const newTodo = Todo.fromDatabase(payload.new);
          const updatedTodos = [...currentState.todos];
          updatedTodos[index] = newTodo;
          useTodoStore.setState({
            todos: updatedTodos
          });
        }
      } else if (payload.eventType === 'DELETE' && payload.old) {
        // Zustand에서 할일 제거
        const currentState = useTodoStore.getState();
        const filteredTodos = currentState.todos.filter(t => t.id !== payload.old.id);
        useTodoStore.setState({
          todos: filteredTodos
        });
      }
    })
    .subscribe((status) => {
      console.log(`📡 할일 채널 상태:`, status);

      if (status === 'SUBSCRIBED') {
        realtimeStatus = 'connected';
      } else if (status === 'CHANNEL_ERROR') {
        realtimeStatus = 'error';
      } else if (status === 'TIMED_OUT') {
        realtimeStatus = 'timeout';
      } else if (status === 'CLOSED') {
        realtimeStatus = 'closed';
      }
    });

  // 정리 함수 생성
  cleanup = () => {
    console.log('🛑 실시간 동기화 정리');
    isRealtimeActive = false;
    realtimeStatus = 'disconnected';

    supabase.removeChannel(todosChannel);
    cleanup = null;
  };

  // 브라우저 탭 닫힐 때 정리
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', cleanup);
  }

  return cleanup;
}

// 수동으로 실시간 동기화 중지
export function stopRealtimeSync() {
  if (cleanup) {
    cleanup();
  }
}

// 실시간 동기화 상태 확인
export function isRealtimeSyncActive() {
  return isRealtimeActive;
}

// Realtime 연결 상태 확인
export function getRealtimeStatus() {
  return {
    realtimeStatus,
    isRealtimeActive
  };
}