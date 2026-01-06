// lib/realtimeSyncFallback.ts - 스마트 폴링 기반 실시간 동기화 시스템
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { useTodoStore } from '@/state/stores/todoStore';

// 스마트 폴링 상태 관리
let pollInterval: NodeJS.Timeout | null = null;
let lastSyncTimestamp: string | null = null; // 해시 대신 타임스탬프 사용
let pollCount = 0;
let currentPollInterval = 10000; // 기본 10초 간격
let isAppInForeground = true; // 앱 포그라운드 상태
let consecutiveErrors = 0; // 연속 오류 횟수
let lastChangeDetectedAt: Date | null = null; // 마지막 변경 감지 시간

// 폴링 간격 설정 (상황별 최적화)
const POLL_INTERVALS = {
  ACTIVE: 10000,      // 10초 - 앱 활성 상태
  BACKGROUND: 60000,  // 60초 - 백그라운드 상태  
  ERROR: 30000,       // 30초 - 오류 발생 시
  RECENTLY_CHANGED: 5000, // 5초 - 최근 변경 감지 시 (1분간)
  MAX_INTERVAL: 300000    // 5분 - 최대 간격
};

// 최근 변경사항 기반 타임스탬프 추출
function getLatestTimestamp(todos: any[]): string | null {
  if (!todos || todos.length === 0) return null;
  
  return todos
    .map(t => t.updated_at || t.created_at)
    .filter(Boolean)
    .sort()
    .pop() || null;
}

// 동적 폴링 간격 계산
function calculatePollInterval(): number {
  // 1. 백그라운드 상태면 긴 간격
  if (!isAppInForeground) {
    return POLL_INTERVALS.BACKGROUND;
  }
  
  // 2. 연속 오류 발생 시 지수 백오프
  if (consecutiveErrors > 0) {
    const backoffInterval = Math.min(
      POLL_INTERVALS.ERROR * Math.pow(2, consecutiveErrors - 1),
      POLL_INTERVALS.MAX_INTERVAL
    );
    return backoffInterval;
  }
  
  // 3. 최근 1분 내 변경사항 있으면 빠른 간격
  if (lastChangeDetectedAt && 
      (Date.now() - lastChangeDetectedAt.getTime()) < 60000) {
    return POLL_INTERVALS.RECENTLY_CHANGED;
  }
  
  // 4. 기본 활성 간격
  return POLL_INTERVALS.ACTIVE;
}

// 앱 상태 감지 리스너 설정
function setupAppStateListener() {
  if (Capacitor.isNativePlatform()) {
    App.addListener('appStateChange', ({ isActive }) => {
      const wasInForeground = isAppInForeground;
      isAppInForeground = isActive;
      
      console.log(`📱 앱 상태 변경: ${isActive ? '포그라운드' : '백그라운드'}`);
      
      // 포그라운드로 복귀 시 즉시 동기화 + 빠른 폴링
      if (isActive && !wasInForeground) {
        console.log('📱 포그라운드 복귀 - 즉시 동기화 시작');
        consecutiveErrors = 0; // 오류 카운터 리셋
        performSyncAndReschedule();
      }
      
      // 백그라운드 진입 시 폴링 간격 연장
      if (!isActive && wasInForeground) {
        console.log('📱 백그라운드 진입 - 폴링 간격 연장');
        reschedulePolling();
      }
    });
  }
}

// 동기화 수행 및 다음 폴링 스케줄링
async function performSyncAndReschedule() {
  try {
    const todoStore = useTodoStore.getState();
    const currentDate = new Date(); // 현재 날짜 사용

    // 조용한 모드로 데이터 조회
    (globalThis as any).__POLLING_MODE__ = true;

    const { convertKstDateToUtcRange } = await import('@/lib/date-utils');
    const { utcStart, utcEnd } = convertKstDateToUtcRange(currentDate);
    
    await todoStore.fetchTodosForDate(utcStart, utcEnd);
    (globalThis as any).__POLLING_MODE__ = false;
    
    const currentTodos = useTodoStore.getState().todos;
    const currentTimestamp = getLatestTimestamp(currentTodos);
    
    // 변경 감지 (타임스탬프 기반)
    if (lastSyncTimestamp && currentTimestamp && 
        currentTimestamp !== lastSyncTimestamp) {
      console.log('📱 스마트 폴링 - 데이터 변경 감지! 🔄', {
        폴링날짜: currentDate.toISOString().slice(0, 10),
        이전타임스탬프: lastSyncTimestamp,
        현재타임스탬프: currentTimestamp,
        데이터수: currentTodos.length
      });
      
      lastChangeDetectedAt = new Date();
      consecutiveErrors = 0; // 성공 시 오류 카운터 리셋
    } else {
      // 20번마다만 로그 출력 (조용한 모드)
      if (pollCount % 20 === 0) {
        console.log(`📱 스마트 폴링 백그라운드 확인 (${pollCount}회)`, {
          현재간격: `${currentPollInterval/1000}초`,
          앱상태: isAppInForeground ? '포그라운드' : '백그라운드',
          데이터수: currentTodos.length
        });
      }
    }
    
    lastSyncTimestamp = currentTimestamp;
    consecutiveErrors = 0; // 성공 시 오류 카운터 리셋
    
  } catch (error) {
    consecutiveErrors++;
    console.error(`📱 스마트 폴링 오류 (${consecutiveErrors}회):`, error);
  } finally {
    pollCount++;
    reschedulePolling(); // 다음 폴링 스케줄링
  }
}

// 동적 폴링 재스케줄링
function reschedulePolling() {
  // 현재 폴링 중지
  if (pollInterval) {
    clearTimeout(pollInterval);
  }
  
  // 새로운 간격 계산
  const newInterval = calculatePollInterval();
  
  // 간격이 변경되었을 때만 로그 출력
  if (newInterval !== currentPollInterval) {
    console.log(`📱 폴링 간격 변경: ${currentPollInterval/1000}초 → ${newInterval/1000}초`, {
      이유: consecutiveErrors > 0 ? '오류백오프' : 
            !isAppInForeground ? '백그라운드' :
            lastChangeDetectedAt && (Date.now() - lastChangeDetectedAt.getTime()) < 60000 ? '최근변경' : '정상',
      앱상태: isAppInForeground ? '포그라운드' : '백그라운드'
    });
  }
  
  currentPollInterval = newInterval;
  
  // 새로운 간격으로 폴링 스케줄링
  pollInterval = setTimeout(() => {
    performSyncAndReschedule();
  }, currentPollInterval);
}

// 스마트 폴링 시작 (임시 비활성화 - 서버 부하 우려)
export function startCapacitorPolling() {
  const isNative = Capacitor.isNativePlatform();
  
  if (!isNative) {
    console.log('🌐 웹 환경 - 스마트 폴링 불필요');
    return;
  }

  console.log('📱 스마트 폴링 시스템 - 임시 비활성화 (서버 부하 고려)');
  console.log('📱 실시간 동기화는 수동 새로고침으로 대체');
  
  // 폴링 비활성화 - SSE나 네이티브 브리지 구현 전까지 대기
  return;
  
  // 아래 코드는 향후 재활성화를 위해 보존
  /*
  console.log('📱 스마트 폴링 시스템 시작', {
    기본간격: `${POLL_INTERVALS.ACTIVE/1000}초`,
    백그라운드간격: `${POLL_INTERVALS.BACKGROUND/1000}초`,
    최근변경간격: `${POLL_INTERVALS.RECENTLY_CHANGED/1000}초`
  });

  // 앱 상태 리스너 설정
  setupAppStateListener();
  
  // 초기 상태 설정
  pollCount = 0;
  consecutiveErrors = 0;
  lastChangeDetectedAt = null;
  currentPollInterval = POLL_INTERVALS.ACTIVE;
  
  // 첫 번째 동기화 즉시 실행
  performSyncAndReschedule();
  */
}

// 스마트 폴링 중지
export function stopCapacitorPolling() {
  if (pollInterval) {
    clearTimeout(pollInterval);
    pollInterval = null;
    lastSyncTimestamp = null;
    pollCount = 0;
    consecutiveErrors = 0;
    lastChangeDetectedAt = null;
    currentPollInterval = POLL_INTERVALS.ACTIVE;
    console.log('📱 스마트 폴링 시스템 중지됨');
  }
  
  // 앱 상태 리스너 제거
  if (Capacitor.isNativePlatform()) {
    App.removeAllListeners();
  }
}

// 수동 즉시 동기화 (포그라운드 복귀 시 등)
export async function forceSync() {
  const isNative = Capacitor.isNativePlatform();
  
  if (isNative) {
    console.log('📱 강제 동기화 시작');
    consecutiveErrors = 0; // 강제 동기화 시 오류 카운터 리셋
    lastChangeDetectedAt = new Date(); // 최근 변경으로 처리하여 빠른 폴링 적용
    await performSyncAndReschedule();
    console.log('📱 강제 동기화 완료');
  }
}

// 폴링 상태 정보
export function getPollingStatus() {
  return {
    isActive: pollInterval !== null,
    currentInterval: currentPollInterval,
    pollCount,
    consecutiveErrors,
    isAppInForeground,
    lastChangeDetectedAt,
    lastSyncTimestamp
  };
}