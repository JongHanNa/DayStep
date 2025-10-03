// hooks/usePullToRefresh.ts - Pull to Refresh 기능 훅
import { useState, useRef, useCallback, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { useTodoStore } from '@/state/stores/todoStore';
import { useTimelineViewStore } from '@/state/stores/timelineViewStore';
import { useServerSentEvents } from './useServerSentEvents';

interface PullToRefreshState {
  isPulling: boolean;
  isRefreshing: boolean;
  pullDistance: number;
  canRefresh: boolean;
}

interface UsePullToRefreshOptions {
  threshold?: number; // 새로고침 트리거 거리 (기본: 80px)
  maxDistance?: number; // 최대 당기기 거리 (기본: 120px)
  disabled?: boolean; // Pull to Refresh 비활성화
  onRefresh?: () => Promise<void>; // 커스텀 새로고침 함수
}

export function usePullToRefresh(options: UsePullToRefreshOptions = {}) {
  const {
    threshold = 80,
    maxDistance = 120,
    disabled = false,
    onRefresh
  } = options;

  // 상태 관리
  const [state, setState] = useState<PullToRefreshState>({
    isPulling: false,
    isRefreshing: false,
    pullDistance: 0,
    canRefresh: false
  });

  // 터치 상태 추적
  const touchStartY = useRef<number>(0);
  const isTouch = useRef<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 스토어 참조
  const todoStore = useTodoStore();
  const timelineViewStore = useTimelineViewStore();

  // SSE 상태 감지
  const sseState = useServerSentEvents();

  // 실시간 동기화가 실제로 활성화되어 있는지 감지
  const isRealtimeActive = useRef<boolean>(false);
  // Pull to Refresh 비활성화 여부 (실시간 동기화 또는 연결 오류)
  const shouldDisablePullToRefresh = useRef<boolean>(false);

  // 실시간 동기화 상태 감지 (Broadcast, PostgreSQL Changes, SSE 활성)
  useEffect(() => {
    // 웹 환경에서는 Supabase Realtime이 활성화되어 있음
    if (!Capacitor.isNativePlatform()) {
      isRealtimeActive.current = true;
      shouldDisablePullToRefresh.current = true;
      return;
    }

    // 모바일에서는 SSE 연결 상태에 따라 결정
    const hasConnectionError = Boolean(sseState.error);
    
    // 실제 실시간 동기화는 SSE가 활성화된 경우만
    isRealtimeActive.current = Boolean(sseState.isActive);
    
    // Pull to Refresh는 SSE 활성화되었거나 연결 에러가 있으면 비활성화
    shouldDisablePullToRefresh.current = Boolean(sseState.isActive) || hasConnectionError;
    
    if (sseState.isActive) {
      console.log('📱 Pull to Refresh - SSE 실시간 동기화 활성 → Pull to Refresh 비활성화');
    } else if (hasConnectionError) {
      console.log('📱 Pull to Refresh - SSE 서버 연결 실패 → Pull to Refresh 비활성화 (기본 저장만 가능)');
    } else {
      console.log('📱 Pull to Refresh - 실시간 동기화 비활성 → Pull to Refresh 활성화');
    }
  }, [sseState.isActive, sseState.error]);

  // 데이터 새로고침 함수
  const performRefresh = useCallback(async () => {
    if (disabled || shouldDisablePullToRefresh.current) return;

    setState(prev => ({ ...prev, isRefreshing: true }));
    
    try {
      console.log('📱 Pull to Refresh - 수동 동기화 시작');
      
      if (onRefresh) {
        // 커스텀 새로고침 함수 사용
        await onRefresh();
      } else {
        // 기본 할일 데이터 새로고침
        const currentDate = timelineViewStore.currentDate;
        const { convertKstDateToUtcRange } = await import('@/lib/date-utils');
        const { utcStart, utcEnd } = convertKstDateToUtcRange(currentDate);
        
        await todoStore.fetchTodosForDate(utcStart, utcEnd);
        console.log('📱 Pull to Refresh - 동기화 완료');
      }
    } catch (error) {
      console.error('📱 Pull to Refresh - 동기화 오류:', error);
    } finally {
      setState(prev => ({ 
        ...prev, 
        isRefreshing: false,
        isPulling: false,
        pullDistance: 0,
        canRefresh: false
      }));
    }
  }, [disabled, onRefresh, todoStore, timelineViewStore]);

  // 터치 시작
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (disabled || shouldDisablePullToRefresh.current) return;
    
    // 페이지가 최상단에 있을 때만 활성화
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    if (scrollTop > 0) return;

    isTouch.current = true;
    touchStartY.current = e.touches[0].clientY;
  }, [disabled]);

  // 터치 이동
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (disabled || shouldDisablePullToRefresh.current || !isTouch.current) return;

    const currentY = e.touches[0].clientY;
    const deltaY = currentY - touchStartY.current;

    // 아래쪽으로 당길 때만 처리
    if (deltaY > 0) {
      // 최대 거리 제한
      const pullDistance = Math.min(deltaY, maxDistance);
      const canRefresh = pullDistance >= threshold;

      setState(prev => ({
        ...prev,
        isPulling: true,
        pullDistance,
        canRefresh
      }));

      // 🎈 고무줄 효과를 위해 preventDefault 제거
      // Pull to Refresh 활성화 시에만 기본 스크롤 방지
      // if (pullDistance > 10) {
      //   e.preventDefault();
      // }
    }
  }, [disabled, threshold, maxDistance]);

  // 터치 종료
  const handleTouchEnd = useCallback(() => {
    if (disabled || shouldDisablePullToRefresh.current || !isTouch.current) return;

    isTouch.current = false;

    if (state.canRefresh && !state.isRefreshing) {
      // 새로고침 실행
      performRefresh();
    } else {
      // 상태 리셋
      setState(prev => ({
        ...prev,
        isPulling: false,
        pullDistance: 0,
        canRefresh: false
      }));
    }
  }, [disabled, state.canRefresh, state.isRefreshing, performRefresh]);

  // 이벤트 리스너 등록
  useEffect(() => {
    const container = containerRef.current;
    if (!container || disabled || shouldDisablePullToRefresh.current) return;

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [disabled, handleTouchStart, handleTouchMove, handleTouchEnd]);

  // 수동 새로고침 함수 (버튼 클릭 등)
  const manualRefresh = useCallback(() => {
    if (!disabled && !shouldDisablePullToRefresh.current && !state.isRefreshing) {
      performRefresh();
    }
  }, [disabled, state.isRefreshing, performRefresh]);

  // Pull to Refresh 활성 상태 (실시간 동기화가 비활성일 때만)
  const isActive = !disabled && !shouldDisablePullToRefresh.current;

  return {
    // 상태
    ...state,
    isActive, // Pull to Refresh 활성 여부
    isRealtimeActive: isRealtimeActive.current, // 실시간 동기화 활성 여부
    
    // SSE 상태
    sseState,
    
    // 함수
    manualRefresh,
    
    // 컨테이너 ref
    containerRef,
    
    // CSS 스타일을 위한 값들
    pullProgress: Math.min(state.pullDistance / threshold, 1), // 0~1 진행률
    rotationAngle: Math.min(state.pullDistance * 2, 360), // 회전 각도 (아이콘용)
  };
}