import { Todo } from "@/entities/todo/Todo";
import { fetchTodosForDateRange } from "@/lib/supabaseWebViewHelper";
import { useTimelineViewStore } from "@/state/stores/timelineViewStore";
import {
  createAsyncAction,
  logStoreAction,
} from "../../utils/storeUtils";

/**
 * 캐시 및 로드 상태 관리 액션들
 */

/**
 * 현재 뷰의 할일 목록 로드 (캐시 고려)
 */
export const fetchTodosForCurrentViewAction = createAsyncAction(async (userId: string) => {
  logStoreAction("TodoStore", "fetchTodosForCurrentView");

  // 현재 뷰의 날짜 범위 계산 (최적화: 선택된 날짜 기준 일일 로딩)
  const timelineStore = useTimelineViewStore.getState();
  const currentDate = timelineStore.currentDate || new Date();
  
  // UTC 기준으로 날짜 범위 계산 (KST +9시간 보정)
  const utcStart = new Date(currentDate);
  utcStart.setUTCHours(0, 0, 0, 0);
  utcStart.setUTCHours(utcStart.getUTCHours() - 9); // KST to UTC

  const utcEnd = new Date(currentDate);
  utcEnd.setUTCHours(23, 59, 59, 999);
  utcEnd.setUTCHours(utcEnd.getUTCHours() - 9); // KST to UTC

  console.log("📅 할일 목록 조회 날짜 범위:", {
    selectedDate: currentDate.toISOString().split('T')[0],
    utcStart: utcStart.toISOString(),
    utcEnd: utcEnd.toISOString(),
  });

  try {
    const todos = await fetchTodosForDateRange(userId, utcStart, utcEnd);
    
    console.log("✅ fetchTodosForCurrentView 완료:", {
      todosCount: todos.length,
      hasInitiallyLoaded: true,
    });

    return todos;
  } catch (error) {
    console.error("📅 할일 목록 조회 실패:", error);
    throw error;
  }
});

/**
 * 특정 날짜 범위의 할일 목록 로드
 */
export const fetchTodosForDateAction = async (userId: string, utcStart: Date, utcEnd: Date): Promise<Todo[]> => {
  logStoreAction("TodoStore", "fetchTodosForDate", {
    utcStart: utcStart.toISOString(),
    utcEnd: utcEnd.toISOString(),
  });

  try {
    const todos = await fetchTodosForDateRange(userId, utcStart, utcEnd);
    
    console.log("✅ fetchTodosForDate 완료:", {
      dateRange: `${utcStart.toISOString().split('T')[0]} ~ ${utcEnd.toISOString().split('T')[0]}`,
      todosCount: todos.length,
    });

    return todos;
  } catch (error) {
    console.error("📅 특정 날짜 할일 목록 조회 실패:", error);
    throw error;
  }
};

/**
 * 데이터가 만료되었는지 확인
 */
export const isDataStale = (loadState: {
  lastFetchTime: number;
  cacheValidityPeriod: number;
}): boolean => {
  const now = Date.now();
  return now - loadState.lastFetchTime > loadState.cacheValidityPeriod;
};

/**
 * 데이터 새로고침이 필요한지 확인
 */
export const shouldRefreshData = (
  loadState: {
    hasInitiallyLoaded: boolean;
    lastFetchTime: number;
    cacheValidityPeriod: number;
    currentDateKey: string;
  },
  dateKey?: string
): boolean => {
  // 날짜 키가 다르면 새로고침 필요
  if (dateKey && loadState.currentDateKey !== dateKey) {
    console.log("📅 날짜 키 변경으로 새로고침 필요:", {
      currentKey: loadState.currentDateKey,
      newKey: dateKey,
    });
    return true;
  }

  // 초기 로드가 안된 경우
  if (!loadState.hasInitiallyLoaded) {
    console.log("📦 초기 로드 안됨 - 새로고침 필요");
    return true;
  }

  // 캐시 만료 체크
  const isStale = isDataStale(loadState);
  if (isStale) {
    console.log("📦 캐시 만료 - 새로고침 필요");
  }

  return isStale;
};

/**
 * 로드 상태 초기화
 */
export const resetLoadState = (
  getCurrentState: () => any,
  onStateUpdate: (updater: (state: any) => void) => void,
  reason: "navigation" | "date" | "crud" | "manual" = "manual"
) => {
  console.log("🔄 로드 상태 초기화:", { reason });

  const { loadState } = getCurrentState();

  onStateUpdate((state: any) => {
    state.loadState = {
      ...loadState,
      hasInitiallyLoaded: false,
      lastFetchTime: 0,
      // currentDateKey는 유지 (날짜 변경이 아닌 경우)
      currentDateKey: reason === "date" ? "" : loadState.currentDateKey,
    };
  });
};

/**
 * 필요시에만 할일 목록 로드
 */
export const fetchTodosIfNeeded = async (
  getCurrentState: () => any,
  onStateUpdate: (updater: (state: any) => void) => void,
  fetchTodosForCurrentView: () => Promise<void>,
  forceRefresh: boolean = false
): Promise<void> => {
  const { loadState, loading } = getCurrentState();

  // 🔒 이미 로딩 중이면 스킵 (동시 호출 방지)
  if (loading) {
    console.log("⚠️ 이미 로딩 중 - fetchTodosIfNeeded 스킵");
    return;
  }

  const needsRefresh = forceRefresh || shouldRefreshData(loadState);

  if (needsRefresh) {
    console.log("📦 데이터 로드 필요 - fetchTodosForCurrentView 호출");
    await fetchTodosForCurrentView();
  } else {
    console.log("📦 캐시된 데이터 사용 - 로드 스킵");
  }
};

/**
 * 캐시 키 업데이트
 */
export const updateCacheKey = (
  onStateUpdate: (updater: (state: any) => void) => void,
  dateKey: string
) => {
  onStateUpdate((state: any) => {
    state.loadState.currentDateKey = dateKey;
    console.log("📅 캐시 키 업데이트:", { dateKey });
  });
};

/**
 * 로드 상태 초기값 생성
 */
export const createInitialLoadState = () => {
  return {
    hasInitiallyLoaded: false,
    lastFetchTime: 0,
    cacheValidityPeriod: 5 * 60 * 1000, // 5분
    currentDateKey: "",
  };
};

/**
 * 로드 상태 업데이트 (성공시)
 */
export const updateLoadStateOnSuccess = (
  onStateUpdate: (updater: (state: any) => void) => void,
  dateKey?: string
) => {
  onStateUpdate((state: any) => {
    const now = Date.now();
    state.loadState = {
      ...state.loadState,
      hasInitiallyLoaded: true,
      lastFetchTime: now,
      currentDateKey: dateKey || state.loadState.currentDateKey,
    };

    console.log("📦 로드 상태 업데이트:", {
      hasInitiallyLoaded: true,
      lastFetchTime: new Date(now).toISOString(),
      currentDateKey: state.loadState.currentDateKey,
    });
  });
};