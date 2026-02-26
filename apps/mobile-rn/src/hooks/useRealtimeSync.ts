/**
 * useRealtimeSync
 * 글로벌 동기화 훅 — Layer 1 (AppState) + Layer 2 (Supabase Realtime) 통합.
 *
 * - AppState: background → active 전환 시 debounced refetch
 * - Supabase Realtime: todos + todo_completions 테이블 postgres_changes 구독 → debounced refetch
 * - 인증 상태 기반 자동 구독/해제
 * - 에러 시 채널 제거 후 3초 뒤 재구독
 */
import {useEffect, useRef, useCallback} from 'react';
import {AppState, type AppStateStatus} from 'react-native';
import {supabase} from '@/lib/supabase';
import {useAuthStore} from '@/stores/authStore';
import {useTodoStore} from '@/stores/todoStore';
import type {RealtimeChannel} from '@supabase/supabase-js';

const THROTTLE_MS = 2000;
const RECONNECT_DELAY_MS = 3000;

export function useRealtimeSync() {
  const user = useAuthStore(s => s.user);
  const {selectedDate, fetchTodosForDate} = useTodoStore();

  // refs로 최신값 유지 (클로저 stale 방지)
  const selectedDateRef = useRef(selectedDate);
  const fetchRef = useRef(fetchTodosForDate);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const lastFetchRef = useRef(0);
  const lastScheduleDateRef = useRef<string>('');
  const trailingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  // refs 동기화
  useEffect(() => {
    selectedDateRef.current = selectedDate;
  }, [selectedDate]);

  useEffect(() => {
    fetchRef.current = fetchTodosForDate;
  }, [fetchTodosForDate]);

  // 오늘 날짜가 바뀌었을 때만 반복 알람 재스케줄 (date-based throttle)
  const debouncedRescheduleRecurringAlarms = useCallback(async () => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    if (lastScheduleDateRef.current === todayStr) return;
    lastScheduleDateRef.current = todayStr;
    const {scheduleExistingRecurringAlarms} = await import(
      '@/lib/notifications'
    );
    await scheduleExistingRecurringAlarms();
  }, []);

  const debouncedRefetch = useCallback(() => {
    const now = Date.now();
    const elapsed = now - lastFetchRef.current;

    if (elapsed > THROTTLE_MS) {
      // Leading edge: 즉시 실행
      if (trailingTimerRef.current) {
        clearTimeout(trailingTimerRef.current);
        trailingTimerRef.current = null;
      }
      lastFetchRef.current = now;
      fetchRef.current(selectedDateRef.current);
    } else {
      // Trailing edge: 윈도우 종료 후 실행 예약
      if (trailingTimerRef.current) clearTimeout(trailingTimerRef.current);
      trailingTimerRef.current = setTimeout(() => {
        trailingTimerRef.current = null;
        lastFetchRef.current = Date.now();
        fetchRef.current(selectedDateRef.current);
      }, THROTTLE_MS - elapsed);
    }
  }, []);

  // --- Layer 1: AppState 리스너 ---
  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      (nextState: AppStateStatus) => {
        if (
          appStateRef.current.match(/inactive|background/) &&
          nextState === 'active'
        ) {
          debouncedRefetch();
          debouncedRescheduleRecurringAlarms();
        }
        appStateRef.current = nextState;
      },
    );

    return () => {
      subscription.remove();
    };
  }, [debouncedRefetch, debouncedRescheduleRecurringAlarms]);

  // --- Layer 2: Supabase Realtime 구독 ---
  useEffect(() => {
    if (!user?.id) return;

    const setupChannel = () => {
      // 기존 채널 정리
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      const channel = supabase
        .channel(`todos-rn-sync-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'todos',
          },
          (payload) => {
            console.log('[RealtimeSync] todos event:', payload.eventType);
            debouncedRefetch();
          },
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'todo_completions',
          },
          (payload) => {
            console.log('[RealtimeSync] todo_completions event:', payload.eventType);
            debouncedRefetch();
          },
        )
        .subscribe((status, err) => {
          console.log('[RealtimeSync] subscription status:', status, err ?? '');
          if (status === 'SUBSCRIBED') {
            console.log('[RealtimeSync] listening on todos + todo_completions');
          }
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.warn('[RealtimeSync] channel error, reconnecting in', RECONNECT_DELAY_MS, 'ms');
            if (channelRef.current) {
              supabase.removeChannel(channelRef.current);
              channelRef.current = null;
            }
            reconnectTimerRef.current = setTimeout(() => {
              setupChannel();
            }, RECONNECT_DELAY_MS);
          }
        });

      channelRef.current = channel;
    };

    setupChannel();

    return () => {
      // cleanup: 채널 제거 + 타이머 취소
      if (trailingTimerRef.current) {
        clearTimeout(trailingTimerRef.current);
        trailingTimerRef.current = null;
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user?.id, debouncedRefetch]);
}
