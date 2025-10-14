// lib/realtimeSync.ts - Supabase Realtime 실시간 동기화 시스템 (스마트 폴백 포함)
import { supabase } from './supabase';
import { useTodoStore } from '@/state/stores/todoStore';
import { useTimelineViewStore } from '@/state/stores/timelineViewStore';
import { Todo } from '@/entities/todo/Todo';
import { Capacitor } from '@capacitor/core';
import { startCapacitorPolling, stopCapacitorPolling } from './realtimeSyncFallback';

let isRealtimeActive = false;
let cleanup: (() => void) | null = null;
let realtimeStatus = 'disconnected'; // 연결 상태 추적
let isPollingActive = false; // 폴링 상태 추적

// 스마트 폴백 제어 함수
function activatePollingFallback(reason: string) {
  const isNative = Capacitor.isNativePlatform();
  
  if (isNative && !isPollingActive) {
    console.log(`🔄 Realtime 실패 - 폴링 폴백 시작 (이유: ${reason})`);
    startCapacitorPolling();
    isPollingActive = true;
  }
}

function deactivatePollingFallback() {
  const isNative = Capacitor.isNativePlatform();
  
  if (isNative && isPollingActive) {
    console.log('✅ Realtime 복구 - 폴링 폴백 중지');
    stopCapacitorPolling();
    isPollingActive = false;
  }
}

export function setupRealtimeSync() {
  // 이미 활성화된 경우 중복 방지
  if (isRealtimeActive) {
    console.log('🔄 실시간 동기화 이미 활성화됨');
    return cleanup || (() => {});
  }

  const platform = Capacitor.getPlatform();
  const isNative = Capacitor.isNativePlatform();
  
  console.log('🚀 실시간 동기화 시작', { platform, isNative });
  isRealtimeActive = true;

  // 스토어 인스턴스 가져오기
  const todoStore = useTodoStore.getState();
  const timelineStore = useTimelineViewStore.getState();

  // 할일 테이블 실시간 구독 (Capacitor 환경 최적화)
  const todosChannelName = isNative ? 'todos-mobile-sync' : 'todos-web-sync';
  const todosChannel = supabase
    .channel(todosChannelName, {
      config: {
        presence: {
          key: `user-${Date.now()}`
        },
        // Capacitor 환경에서 연결 안정성 향상
        ...(isNative && {
          broadcast: { self: true },
          postgres_changes: { 
            enabled: true,
            private: false 
          }
        })
      }
    })
    .on('postgres_changes', {
      event: '*', // INSERT, UPDATE, DELETE 모든 이벤트
      schema: 'public',
      table: 'todos'
    }, (payload: any) => {
      console.log(`📡 [${platform}] 할일 변경 감지:`, {
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
    // 🔄 Capacitor 환경을 위한 Broadcast 채널 추가 (postgres_changes 대안)
    .on('broadcast', { event: 'todo_changed' }, (payload: any) => {
      console.log(`📻 [${platform}] Broadcast 할일 변경 감지:`, {
        event: payload.payload?.eventType,
        id: payload.payload?.id,
        title: payload.payload?.title,
        timestamp: new Date().toLocaleTimeString()
      });

      // Broadcast로 받은 변경사항도 동일하게 처리
      const broadcastData = payload.payload;
      if (broadcastData?.eventType === 'UPDATE' && broadcastData?.data) {
        console.log(`✏️ [${platform}] Broadcast 할일 수정됨:`, broadcastData.data.title);
        const currentState = useTodoStore.getState();
        const index = currentState.todos.findIndex(t => t.id === broadcastData.data.id);
        if (index !== -1) {
          const updatedTodos = [...currentState.todos];
          updatedTodos[index] = Todo.fromDatabase(broadcastData.data);
          useTodoStore.setState({
            todos: updatedTodos
          });
          console.log(`✅ [${platform}] Broadcast로 할일이 스토어에서 업데이트됨`);
        }
      }
    })
    .subscribe((status) => {
      console.log(`📡 [${platform}] 할일 채널 상태:`, status);
      
      // 스마트 폴백 제어
      if (status === 'SUBSCRIBED') {
        realtimeStatus = 'connected';
        deactivatePollingFallback(); // Realtime 성공 → 폴링 중지
      } else if (status === 'CHANNEL_ERROR') {
        realtimeStatus = 'error';
        activatePollingFallback('CHANNEL_ERROR'); // 채널 오류 → 폴링 시작
      } else if (status === 'TIMED_OUT') {
        realtimeStatus = 'timeout';
        activatePollingFallback('TIMED_OUT'); // 타임아웃 → 폴링 시작
      } else if (status === 'CLOSED') {
        realtimeStatus = 'closed';
        activatePollingFallback('CLOSED'); // 연결 종료 → 폴링 시작
      }
    });

  // 타임라인 작업 실시간 구독
  const timelineChannel = supabase
    .channel('timeline-realtime-sync')
    .on('postgres_changes', {
      event: '*',
      schema: 'public', 
      table: 'timeline_tasks'
    }, (payload: any) => {
      console.log('📡 타임라인 작업 변경 감지:', {
        event: payload.eventType,
        table: payload.table,
        id: payload.new?.id || payload.old?.id
      });
      
      setTimeout(() => {
        // 타임라인 작업은 별도 테이블이므로 필요 시 추가 처리
        console.log('타임라인 작업 변경됨');
      }, 100);
    })
    .subscribe((status) => {
      console.log('📡 타임라인 채널 상태:', status);
      
      // 타임라인 채널도 동일한 폴백 적용
      if (status === 'SUBSCRIBED') {
        deactivatePollingFallback(); // Realtime 성공 → 폴링 중지
      } else if (['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED'].includes(status)) {
        activatePollingFallback(`Timeline-${status}`); // 실패 → 폴링 시작
      }
    });


  // 정리 함수 생성
  cleanup = () => {
    console.log('🛑 실시간 동기화 정리');
    isRealtimeActive = false;
    realtimeStatus = 'disconnected';
    
    // 폴링도 함께 정리
    if (isPollingActive) {
      deactivatePollingFallback();
    }
    
    supabase.removeChannel(todosChannel);
    supabase.removeChannel(timelineChannel);
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
    isPollingActive,
    isRealtimeActive
  };
}

// 폴링 상태만 확인
export function isPollingFallbackActive() {
  return isPollingActive;
}