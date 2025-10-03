// hooks/useServerSentEvents.ts - Server-Sent Events 클라이언트 훅
import { useEffect, useRef, useCallback, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { useTodoStore } from '@/state/stores/todoStore';
import { useTimelineViewStore } from '@/state/stores/timelineViewStore';
import { getDynamicServerUrl } from '@/lib/network-utils';

interface SSEState {
  isConnected: boolean;
  isConnecting: boolean;
  lastHeartbeat: Date | null;
  reconnectAttempts: number;
  error: string | null;
  serverAvailable: boolean; // 서버 가용성 상태
  isServerChecking: boolean; // 서버 체크 중 상태
}

interface SSEMessage {
  type: 'connection' | 'subscription' | 'todos_change' | 'heartbeat' | 'timeout';
  message?: string;
  event?: string;
  table?: string;
  data?: any;
  timestamp: string;
}

const MAX_RECONNECT_ATTEMPTS = 3; // 5회 → 3회로 줄임
const RECONNECT_DELAY = 3000; // 2초 → 3초로 늘림
const HEARTBEAT_TIMEOUT = 45000; // 45초 (서버 30초 + 여유시간)
const SERVER_CHECK_TIMEOUT = 5000; // 서버 체크 타임아웃 5초

export function useServerSentEvents() {
  // 상태 관리
  const [state, setState] = useState<SSEState>({
    isConnected: false,
    isConnecting: false,
    lastHeartbeat: null,
    reconnectAttempts: 0,
    error: null,
    serverAvailable: true, // 초기에는 true로 시작 (첫 연결 시도 허용)
    isServerChecking: false
  });

  // EventSource 참조
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isAppInForegroundRef = useRef<boolean>(true);

  // 스토어 참조
  const todoStore = useTodoStore();
  const timelineViewStore = useTimelineViewStore();

  // SSE 지원 여부 체크
  const isSSESupported = useCallback(() => {
    return typeof EventSource !== 'undefined';
  }, []);

  // 서버 가용성 체크
  const checkServerAvailability = useCallback(async (): Promise<boolean> => {
    if (state.isServerChecking) return state.serverAvailable;
    
    setState(prev => ({ ...prev, isServerChecking: true }));
    
    try {
      const baseUrl = Capacitor.isNativePlatform() 
        ? getDynamicServerUrl()
        : (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000');
      
      // Health check 엔드포인트로 빠른 연결 테스트
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), SERVER_CHECK_TIMEOUT);
      
      const response = await fetch(`${baseUrl}/api/health`, {
        method: 'GET',
        signal: controller.signal,
        headers: { 'Accept': 'application/json' }
      });
      
      clearTimeout(timeoutId);
      const isAvailable = response.ok;
      
      setState(prev => ({ 
        ...prev, 
        serverAvailable: isAvailable,
        isServerChecking: false 
      }));
      
      if (!isAvailable) {
        console.log('🌊 서버 응답 없음 - SSE 연결 시도 중단');
      }
      
      return isAvailable;
      
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        serverAvailable: false,
        isServerChecking: false 
      }));
      console.log('🌊 서버 접근 불가 - SSE 연결 시도 중단');
      return false;
    }
  }, [state.isServerChecking, state.serverAvailable]);

  // 앱 생명주기 관리
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      App.addListener('appStateChange', ({ isActive }) => {
        isAppInForegroundRef.current = isActive;
        
        if (isActive) {
          console.log('🌊 앱 포그라운드 복귀 - SSE 재연결 시도');
          connect();
        } else {
          console.log('🌊 앱 백그라운드 진입 - SSE 연결 해제');
          disconnect();
        }
      });

      return () => {
        App.removeAllListeners();
      };
    }
    
    // 네이티브 플랫폼이 아닐 때는 cleanup 함수 반환하지 않음
    return;
  }, []);

  // Heartbeat 타임아웃 체크
  const checkHeartbeatTimeout = useCallback(() => {
    if (heartbeatTimerRef.current) {
      clearTimeout(heartbeatTimerRef.current);
    }

    heartbeatTimerRef.current = setTimeout(() => {
      console.log('🌊 SSE Heartbeat 타임아웃 - 재연결 시도');
      setState(prev => ({ ...prev, error: 'Heartbeat timeout' }));
      reconnect();
    }, HEARTBEAT_TIMEOUT);
  }, []);

  // SSE 메시지 처리
  const handleMessage = useCallback(async (event: MessageEvent) => {
    try {
      const message: SSEMessage = JSON.parse(event.data);
      console.log('🌊 SSE 메시지 수신:', message);

      switch (message.type) {
        case 'connection':
          setState(prev => ({ 
            ...prev, 
            isConnected: true, 
            isConnecting: false,
            reconnectAttempts: 0,
            error: null 
          }));
          break;

        case 'subscription':
          console.log('🌊 SSE - PostgreSQL Changes 구독 성공');
          break;

        case 'todos_change':
          console.log('🌊 SSE - 할일 변경 감지:', {
            event: message.event,
            table: message.table,
            data: message.data
          });

          // 현재 보고 있는 날짜의 할일만 새로고침
          const currentDate = timelineViewStore.currentDate;
          const { convertKstDateToUtcRange } = await import('@/lib/date-utils');
          const { utcStart, utcEnd } = convertKstDateToUtcRange(currentDate);
          
          // 조용한 모드로 데이터 새로고침
          (globalThis as any).__SSE_MODE__ = true;
          await todoStore.fetchTodosForDate(utcStart, utcEnd);
          (globalThis as any).__SSE_MODE__ = false;
          
          console.log('🌊 SSE로 할일 데이터 동기화 완료');
          break;

        case 'heartbeat':
          setState(prev => ({ ...prev, lastHeartbeat: new Date() }));
          checkHeartbeatTimeout(); // 다음 heartbeat 타이머 설정
          break;

        case 'timeout':
          console.log('🌊 SSE 서버 타임아웃 - 재연결 시도');
          reconnect();
          break;
      }
    } catch (error) {
      console.error('🌊 SSE 메시지 파싱 오류:', error);
    }
  }, [todoStore, timelineViewStore, checkHeartbeatTimeout]);

  // SSE 연결
  const connect = useCallback(async () => {
    // 웹 환경에서만 SSE 사용 (모바일은 Pull to Refresh 사용)
    if (!Capacitor.isNativePlatform()) {
      console.log('🌊 웹 환경 - Supabase Realtime 사용, SSE 불필요');
      return;
    }

    if (!isSSESupported()) {
      console.error('🌊 SSE 지원되지 않는 환경');
      setState(prev => ({ ...prev, error: 'EventSource not supported' }));
      return;
    }

    if (!isAppInForegroundRef.current) {
      console.log('🌊 앱 백그라운드 상태 - SSE 연결 생략');
      return;
    }

    if (eventSourceRef.current?.readyState === EventSource.OPEN) {
      console.log('🌊 SSE 이미 연결됨');
      return;
    }

    // 서버 가용성 체크 먼저 수행
    const serverAvailable = await checkServerAvailability();
    if (!serverAvailable) {
      setState(prev => ({ ...prev, error: 'Server not available' }));
      return;
    }

    setState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      // 동적 IP 주소 사용 - 자동으로 현재 네트워크 환경에 맞춰 설정됨
      const baseUrl = Capacitor.isNativePlatform() 
        ? getDynamicServerUrl()
        : (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000');
      const sseUrl = `${baseUrl}/api/sse`;
      console.log('🌊 SSE 연결 시도 (동적 IP):', sseUrl);

      const eventSource = new EventSource(sseUrl);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log('🌊 SSE 연결 성공');
        setState(prev => ({ 
          ...prev, 
          isConnected: true, 
          isConnecting: false,
          reconnectAttempts: 0,
          error: null 
        }));
        checkHeartbeatTimeout(); // Heartbeat 타이머 시작
      };

      eventSource.onmessage = handleMessage;

      eventSource.onerror = (error) => {
        console.error('🌊 SSE 연결 오류:', error);
        setState(prev => ({ 
          ...prev, 
          isConnected: false, 
          isConnecting: false,
          error: 'Connection error' 
        }));
        
        // 자동 재연결 시도
        if (state.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          reconnect();
        }
      };

    } catch (error) {
      console.error('🌊 SSE 초기화 오류:', error);
      setState(prev => ({ 
        ...prev, 
        isConnecting: false, 
        error: 'Initialization error' 
      }));
    }
  }, [isSSESupported, handleMessage, state.reconnectAttempts, checkHeartbeatTimeout]);

  // SSE 연결 해제
  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    if (heartbeatTimerRef.current) {
      clearTimeout(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }

    setState(prev => ({ 
      ...prev, 
      isConnected: false, 
      isConnecting: false 
    }));
  }, []);

  // SSE 재연결
  const reconnect = useCallback(async () => {
    disconnect();

    setState(prev => ({ ...prev, reconnectAttempts: prev.reconnectAttempts + 1 }));

    if (state.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.log('🌊 SSE 최대 재연결 시도 횟수 초과 - 오프라인 모드');
      setState(prev => ({ 
        ...prev, 
        error: 'Max reconnection attempts exceeded',
        serverAvailable: false 
      }));
      return;
    }

    // 재연결 전 서버 가용성 다시 체크
    const serverAvailable = await checkServerAvailability();
    if (!serverAvailable) {
      console.log('🌊 서버 여전히 접근 불가 - 재연결 중단');
      setState(prev => ({ 
        ...prev, 
        error: 'Server still not available',
        serverAvailable: false 
      }));
      return;
    }

    console.log(`🌊 SSE 재연결 시도 (${state.reconnectAttempts + 1}/${MAX_RECONNECT_ATTEMPTS})`);

    reconnectTimerRef.current = setTimeout(() => {
      connect();
    }, RECONNECT_DELAY * Math.pow(2, state.reconnectAttempts)); // 지수 백오프
  }, [disconnect, connect, state.reconnectAttempts, checkServerAvailability]);

  // 수동 재연결
  const manualReconnect = useCallback(() => {
    setState(prev => ({ 
      ...prev, 
      reconnectAttempts: 0, 
      error: null,
      serverAvailable: true // 수동 재시도 시 서버 체크 다시 허용
    }));
    connect();
  }, [connect]);

  // 컴포넌트 마운트 시 자동 연결
  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, []);

  // SSE 활성 상태 (연결됨 AND 모바일 환경)
  const isActive = Capacitor.isNativePlatform() && state.isConnected;

  return {
    // 상태
    ...state,
    isActive,
    isSupported: isSSESupported(),
    
    // 함수
    connect,
    disconnect,
    reconnect: manualReconnect,
    checkServerAvailability,
  };
}