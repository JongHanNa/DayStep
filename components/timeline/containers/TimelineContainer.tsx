'use client';

import React, { useEffect, useRef, useMemo, useDeferredValue, memo, Suspense, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useTimelineViewStore } from '@/state/stores/timelineViewStore';
import { cn } from '@/lib/utils';
import TimelineWeekView from './TimelineWeekView';
import TimelineMonthView from './TimelineMonthView';
import { BubbleTimelineView } from './BubbleTimelineView';
import { TimelineDndProvider } from '../dnd';
import { useTodoStore } from '@/state/stores/todoStore';
import { OptimisticIndicator } from '@/components/ui/optimistic-indicator';
import { useToast } from '@/hooks/use-toast';
import { ToastProvider } from '@/components/providers/ToastProvider';
import { FloatingActionButton } from '../controls';
import { useNoteStore } from '@/state/stores/noteStore';
import FloatingNoteCard from '@/components/notes/FloatingNoteCard';
// 남은시간 위젯 비활성화
// import { SimpleRemainingTime } from '../indicators';
import { useSwipeGesture } from '@/hooks/use-swipe-gesture';
import { useAuth } from '@/app/context/AuthContext';
// import { PullToRefresh } from '@/components/ui/pull-to-refresh'; // 🎈 고무줄 효과를 위해 제거
import { TimelineHeader } from '../controls';
import { PERFORMANCE, UI_LAYOUT } from '@/lib/constants';
import { logger } from '@/lib/logger';

interface TimelineContainerProps {
  className?: string;
}

// Loading component for Suspense
const TimelineLoadingFallback = memo(() => (
  <div className="flex items-center justify-center h-full">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
  </div>
));
TimelineLoadingFallback.displayName = 'TimelineLoadingFallback';

// Error boundary component
const TimelineError = memo(({ error }: { error: string }) => (
  <div className="flex items-center justify-center h-full">
    <div className="text-center">
      <p className="text-red-500 dark:text-red-400 mb-2">오류가 발생했습니다</p>
      <p className="text-sm text-muted-foreground">{error}</p>
    </div>
  </div>
));
TimelineError.displayName = 'TimelineError';

// All day items section component
const AllDayItemsSection = memo(() => {
  const { getFilteredAndSortedItems } = useTimelineViewStore();
  const items = getFilteredAndSortedItems();
  const allDayItems = items.filter(item => item.isAllDay);
  
  if (allDayItems.length === 0) {
    return null;
  }
  
  return (
    <div className="flex-shrink-0 bg-background border-b p-4">
      <h3 className="text-sm font-semibold text-muted-foreground mb-2">
        종일 일정
      </h3>
      <div className="grid grid-cols-1 gap-2">
        {allDayItems.map((item) => (
          <div
            key={item.id}
            className={cn(
              'p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md',
              'bg-background hover:bg-accent'
            )}
            style={{
              borderLeftWidth: '4px',
              borderLeftColor: item.color || 'hsl(var(--status-pending))'
            }}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-medium text-sm">{item.title}</h4>
              </div>
              <span className="text-xs text-muted-foreground ml-2">
                {item.type === 'todo' && '할 일'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});
AllDayItemsSection.displayName = 'AllDayItemsSection';

// v7: memo 제거 - Zustand store 변경 시 리렌더링 필요
const TimelineContainer: React.FC<TimelineContainerProps> = ({ className }) => {
  if (process.env.NODE_ENV === 'development') {
    logger.timeline('TimelineContainer 컴포넌트 렌더링 시작', { timestamp: new Date().toISOString() });
  }
  
  const containerRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const { isAuthenticated, loading: authLoading, appUser } = useAuth();

  // Note Store hooks
  const { pinnedNotes, getNotes } = useNoteStore();

  // Capacitor/WebView 환경에서 스크롤 최적화 (스크롤 기능 유지)
  useEffect(() => {
    const applyScrollOptimization = () => {
      // main 컨테이너에 scrollbar-hide 보장 (스크롤 기능은 유지)
      const mainElement = document.querySelector('main');
      if (mainElement && !mainElement.classList.contains('scrollbar-hide')) {
        mainElement.classList.add('scrollbar-hide');
        mainElement.style.overflowY = 'auto'; // 스크롤 기능 명시적 활성화
        (mainElement.style as any).webkitOverflowScrolling = 'touch'; // iOS 스크롤 최적화
      }

      // WebView 환경에서 추가 최적화
      const isWebView = window.navigator.userAgent.includes('wv') ||
                        window.navigator.userAgent.includes('Mobile') ||
                        (window as any).Capacitor;

      if (isWebView) {
        const existingStyle = document.getElementById('scrollbar-hide-override');
        if (!existingStyle) {
          const style = document.createElement('style');
          style.id = 'scrollbar-hide-override';
          style.textContent = `
            /* 스크롤바만 숨기고 스크롤 기능은 유지 */
            * {
              scrollbar-width: none !important;
              -ms-overflow-style: none !important;
            }
            *::-webkit-scrollbar {
              display: none !important;
              width: 0 !important;
              height: 0 !important;
            }
            /* html, body는 overflow hidden 제거 - 스크롤 허용 */
            main {
              overflow-y: auto !important;
              -webkit-overflow-scrolling: touch !important;
            }
          `;
          document.head.appendChild(style);
        }
      }
    };

    applyScrollOptimization();

    // 페이지 로드 완료 후 한번 더 적용
    const timer = setTimeout(applyScrollOptimization, 100);

    return () => {
      clearTimeout(timer);
      // 동적으로 추가한 스타일 제거 (Capacitor 환경에서 다른 페이지로 이동 시 스타일 잔류 방지)
      const styleElement = document.getElementById('scrollbar-hide-override');
      if (styleElement) {
        styleElement.remove();
      }
    };
  }, [pathname]); // pathname 변경시마다 실행
  
  // 렌더링마다 인증 상태를 즉시 로그
  // console.log('🔍 TimelineContainer - 렌더링 시 인증 상태:', {
  //   isAuthenticated,
  //   authLoading, 
  //   hasAppUser: !!appUser,
  //   appUserData: appUser ? { id: appUser.id, name: appUser.name } : null,
  //   timestamp: new Date().toISOString()
  // });
  
  const {
    viewMode,
    currentDate,
    isLoading,
    error,
    restoreScrollPosition,
    saveScrollPosition,
    navigatePrevious,
    navigateNext
  } = useTimelineViewStore();

  // currentDate를 문자열로 변환 (useEffect 의존성용)
  const currentDateString = currentDate.toISOString();

  // 🔍 v6: 렌더링 시점 확인 로그
  console.log('🔄 TimelineContainer 리렌더링:', {
    currentDateString: currentDateString.slice(0, 10),
    isAuthenticated,
    authLoading
  });

  // Load data from all sources - memoized selectors for performance
  const todos = useTodoStore(state => state.todos);
  const fetchTodosForDate = useTodoStore(state => state.fetchTodosForDate);

  // Timeline View Store에서 items 가져오기
  const timelineItemsRaw = useTimelineViewStore(state => state.items);
  
  // timelineItems를 useMemo로 메모이제이션하여 불필요한 참조 변경 방지
  const timelineItems = useMemo(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🧩 timelineItems useMemo 재계산:', {
        itemsLength: timelineItemsRaw.length,
        설명: '실제 아이템 내용이 변경되어 참조 업데이트'
      });
    }
    return timelineItemsRaw;
  }, [timelineItemsRaw]);  // 실제 배열 내용 변경 시에만 업데이트
  
  // 📦 전역 로드 상태 사용 (로컬 상태 제거)
  // const { loadState } = useTodoStore(); // 현재 사용되지 않음
  
  // computeViewData 중복 호출 방지 플래그
  const [hasComputedViewData, setHasComputedViewData] = useState(false);

  // 중복 호출 방지를 위해 제거됨 - loadItemsFromSources에서 모든 데이터 처리
  // const stableFetchTodosForDate = useCallback((utcStart: Date, utcEnd: Date) => {
  //   return fetchTodosForDate(utcStart, utcEnd);
  // }, [fetchTodosForDate]);
  
  // 현재 날짜 기반 최적화된 데이터 로드 - 인증 완료 후에만 실행
  useEffect(() => {
    // 📦 전역 상태를 사용한 조건부 데이터 로드 (AppUser는 선택적)
    if (isAuthenticated && !authLoading) {
      logger.timeline('현재 날짜 기반 최적화된 데이터 로드 시작', {
        currentDate: currentDate.toISOString().split('T')[0]
      });

      // NoteStore 재조회 (appUser 있을 때) - 캐시 우회하여 항상 최신 데이터 가져오기
      if (appUser?.id) {
        getNotes(appUser.id);
      }
      
      // 현재 날짜의 KST 범위를 UTC로 변환
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const date = currentDate.getDate();
      
      // KST → UTC 변환 (현재 날짜만)
      const utcStart = new Date(Date.UTC(year, month, date, 0, 0, 0, 0) - 9 * 60 * 60 * 1000);
      const utcEnd = new Date(Date.UTC(year, month, date, 23, 59, 59, 999) - 9 * 60 * 60 * 1000);
      
      // 날짜별 최적화된 할일 조회 (현재 날짜만)
      fetchTodosForDate(utcStart, utcEnd).then((result) => {
        console.log('✅ 날짜별 할일 조회 완료:', { 
          date: currentDate.toISOString().split('T')[0],
          resultLength: Array.isArray(result) ? result.length : 'N/A',
          utcRange: `${utcStart.toISOString()} ~ ${utcEnd.toISOString()}`
        });
      }).catch((error) => {
        console.error('❌ 날짜별 할일 조회 실패:', {
          date: currentDate.toISOString().split('T')[0],
          errorMessage: error?.message || 'No message'
        });
      });
    }
  }, [isAuthenticated, authLoading, currentDate, currentDateString, fetchTodosForDate, appUser?.id, getNotes]);

  // 실제 데이터가 로드된 후에만 타임라인 아이템 생성
  useEffect(() => {
    // 디버깅을 위한 TodoStore 전체 상태 확인
    const todoStoreState = useTodoStore.getState();
    console.log('🔍 TimelineContainer TodoStore 상태 확인:', {
      todosLength: todos.length,
      todoStoreStateLength: todoStoreState.todos.length,
      firstTodoId: todos[0]?.id || 'N/A',
      todoStoreStateFirstId: todoStoreState.todos[0]?.id || 'N/A'
    });
    
    // 인증 완료되고 실제 할일 데이터가 있을 때만 실행 (AppUser는 선택적)
    if (!isAuthenticated || authLoading) {
      console.log('🚫 TimelineContainer - 인증 미완료 상태로 타임라인 아이템 로드 스킵:', {
        isAuthenticated,
        authLoading,
        hasAppUser: !!appUser,
        todosCount: todos.length,
        todoStoreStateCount: todoStoreState.todos.length
      });
      return;
    }

    console.log('🎯 인증 완료 - 타임라인 컴포넌트 초기화 완료');
    
  }, [isAuthenticated, authLoading, appUser, todos]);

  // 데이터 변경 시 타임라인 업데이트 (todos 변경만 debounce)
  useEffect(() => {
    if (!isAuthenticated || authLoading) {
      return;
    }

    console.log('📊 데이터 변경 감지 - 타임라인 업데이트:', {
      todosCount: todos.length
    });

    // ✅ 300ms debounce로 빠른 연속 업데이트 방지 (불필요한 fetch 요청 제거)
    const debounceTimeoutId = setTimeout(() => {
      const { loadItemsFromSources } = useTimelineViewStore.getState();
      loadItemsFromSources(todos, []).catch(error => {
        console.error('❌ loadItemsFromSources 실행 중 오류:', error);
      });
    }, 300);

    return () => {
      clearTimeout(debounceTimeoutId);
    };
  }, [todos, isAuthenticated, authLoading]);

  // 🔧 v6: 날짜 변경 시 즉시 반복 할일 인스턴스 재생성 (디버깅 로그 추가)
  useEffect(() => {
    console.log('🔍 v6 useEffect 트리거됨:', {
      currentDateString: currentDateString.slice(0, 10),
      isAuthenticated,
      authLoading
    });

    if (!isAuthenticated || authLoading) {
      console.log('⚠️ early return - 인증 상태:', { isAuthenticated, authLoading });
      return;
    }

    console.log('📅 날짜 변경 감지 - 반복 할일 인스턴스 재생성:', {
      currentDateString: currentDateString.slice(0, 10)
    });

    const { loadItemsFromSources } = useTimelineViewStore.getState();
    loadItemsFromSources(useTodoStore.getState().todos, []).catch(error => {
      console.error('❌ loadItemsFromSources 실행 중 오류:', error);
    });
  }, [currentDateString, isAuthenticated, authLoading]);

  // 이전 중복 날짜별 로드 로직 제거됨 - 위의 최적화된 로직으로 통합
  
  // Optimistic UI state from todoStore
  const optimisticState = useTodoStore(state => state.optimisticState);
  const todoError = useTodoStore(state => state.error);
  const retryFailedOperation = useTodoStore(state => state.retryFailedOperation);
  const clearFailedOperations = useTodoStore(state => state.clearFailedOperations);
  
  // Realtime sync state from todoStore - 임시 비활성화
  // const realtimeConnection = useTodoStore(state => state.realtimeConnection);
  // const realtimeSync = useTodoStore(state => state.realtimeSync);
  // const forceReconnect = useTodoStore(state => state.forceReconnect);
  
  const { toast } = useToast();

  // 스와이프 제스처 설정 - 달력 영역과 충돌 방지를 위해 수직 제한 강화
  const swipeGesture = useSwipeGesture({
    onSwipeLeft: navigateNext,   // 왼쪽 스와이프 → 다음 날짜
    onSwipeRight: navigatePrevious, // 오른쪽 스와이프 → 이전 날짜
    minSwipeDistance: 100,       // 최소 스와이프 거리 증가 (더 정확한 가로 스와이프)
    maxVerticalDistance: 80,     // 최대 수직 이동 거리 감소 (달력 세로 스와이프와 구분)
    touchOnly: true              // 터치만 활성화 (마우스 드래그 비활성화)
  });

  // Use useDeferredValue for less urgent state updates
  const deferredViewMode = useDeferredValue(viewMode);
  const deferredCurrentDate = useDeferredValue(currentDate);

  // 중복 호출 방지: storeData와 관련 useEffect는 제거됨 
  // 144-167줄의 최적화된 useEffect에서 loadItemsFromSources를 1번만 호출함

  // 날짜나 뷰모드 변경 시 computeViewData 플래그 리셋
  useEffect(() => {
    if (hasComputedViewData) {
      console.log('🔄 날짜/뷰모드 변경 감지 - computeViewData 플래그 리셋:', {
        currentDate: currentDate instanceof Date ? currentDate.toISOString() : currentDate,
        viewMode,
        이전플래그: hasComputedViewData,
        설명: '날짜 변경 시 필터링 다시 실행하기 위해 플래그 리셋'
      });
      setHasComputedViewData(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDateString, viewMode]); // Date 객체 → ISO 문자열로 변경 감지, hasComputedViewData 제외하여 무한 루프 방지

  // TimelineViewStore의 items가 변경되면 computeViewData 호출 (날짜 변경 시마다)
  useEffect(() => {
    if (!isAuthenticated || authLoading || !appUser) {
      return;
    }

    // timelineItems가 변경되고 비어있지 않고, 아직 계산하지 않았을 때만 호출
    if (timelineItems.length > 0 && !hasComputedViewData) {
      const { computeViewData } = useTimelineViewStore.getState();
      console.log('🔄 Timeline items 변경 감지 - computeViewData 호출:', {
        itemsLength: timelineItems.length,
        timestamp: new Date().toISOString(),
        currentDate: currentDate instanceof Date ? currentDate.toISOString() : currentDate,
        viewMode,
        설명: '날짜 변경마다 필터링 재실행'
      });
      computeViewData();
      setHasComputedViewData(true); // 플래그 설정으로 중복 호출 차단
      console.log('🔒 computeViewData 완료 - 현재 날짜/뷰모드 기준 필터링 적용');
    } else if (timelineItems.length > 0 && hasComputedViewData) {
      console.log('🚫 computeViewData 호출 스킵 - 이미 계산됨:', {
        itemsLength: timelineItems.length,
        hasComputedViewData: true,
        스킵사유: '현재 날짜/뷰모드는 이미 계산됨'
      });
    }
  }, [timelineItems, isAuthenticated, authLoading, appUser, hasComputedViewData, currentDate, currentDateString, viewMode]); // Date 객체 → ISO 문자열로 변경 감지

  // Memoized scroll handler with throttling
  const scrollHandler = useMemo(() => {
    let timeoutId: NodeJS.Timeout;
    const handler = (scrollTop: number) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        saveScrollPosition(scrollTop);
      }, PERFORMANCE.SCROLL_THROTTLE_DELAY);
    };
    // Return both handler and cleanup function
    return {
      handler,
      cleanup: () => clearTimeout(timeoutId)
    };
  }, [saveScrollPosition]);

  // Handle scroll position restoration and initial current time scroll
  useEffect(() => {
    // 인증 완료 후에만 스크롤 처리 실행
    if (!isAuthenticated || authLoading || !appUser) {
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    try {
      // 현재 날짜가 오늘인 경우 현재 시간으로 스크롤
      const today = new Date();
      const isToday = today.toDateString() === new Date(deferredCurrentDate).toDateString();

      if (isToday && deferredViewMode === 'daily') {
      // 현재 시간 기준으로 스크롤 위치 계산
      const currentHour = today.getHours();
      const currentMinute = today.getMinutes();

      // 각 시간 슬롯의 높이
      const scrollPosition = currentHour * UI_LAYOUT.SLOT_HEIGHT + (currentMinute / 60) * UI_LAYOUT.SLOT_HEIGHT;
      
      // 현재 시간 라벨을 찾아서 스크롤
      const timer = setTimeout(() => {
        // 현재 시간을 HH:00 형식으로 포맷 (예: "13:00", "09:00")
        const currentTimeLabel = `${currentHour.toString().padStart(2, '0')}:00`;
        
        // 방법 1: 현재 시간 텍스트를 찾기
        const timeLabels = Array.from(document.querySelectorAll('*')).find(el => 
          el.textContent === currentTimeLabel
        );
        
        console.log('TimelineContainer - 현재 시간 라벨 찾기:', {
          currentTimeLabel,
          timeLabelsFound: !!timeLabels,
          containerScrollHeight: container.scrollHeight,
          containerClientHeight: container.clientHeight
        });
        
        if (timeLabels) {
          // 현재 시간 라벨이 화면 중앙에 오도록 스크롤
          timeLabels.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'nearest'
          });
          
        } else {
          // 방법 2: 직접 DOM에서 사이드바의 스크롤 가능한 영역을 찾아서 스크롤
          const sidebar = document.querySelector('.w-16');
          if (sidebar) {
            const scrollableArea = sidebar.querySelector('[class*="min-h"]');
            if (scrollableArea) {
              scrollableArea.scrollTop = scrollPosition;
            }
          }

          // 메인 컨테이너도 강제로 스크롤
          Object.defineProperty(container, 'scrollTop', {
            writable: true,
            value: scrollPosition - 200
          });
        }
      }, 1000); // 더 늦게 실행
      
      const handleScroll = () => {
        scrollHandler.handler(container.scrollTop);
      };

      container.addEventListener('scroll', handleScroll, { passive: true });
      
      return () => {
        clearTimeout(timer);
        container.removeEventListener('scroll', handleScroll);
        scrollHandler.cleanup();
      };
    } else {
      // 기존 스크롤 위치 복원
      const scrollPosition = restoreScrollPosition();
      if (scrollPosition > 0) {
        container.scrollTop = scrollPosition;
      }

      const handleScroll = () => {
        scrollHandler.handler(container.scrollTop);
      };

      container.addEventListener('scroll', handleScroll, { passive: true });
      return () => {
        container.removeEventListener('scroll', handleScroll);
        scrollHandler.cleanup();
      };
    }
    } catch (error) {
      console.error('❌ TimelineContainer - 스크롤 처리 중 에러:', error);
    }
    
    // 정상적으로 완료되었을 때는 cleanup 없음
    return;
  }, [deferredViewMode, deferredCurrentDate, restoreScrollPosition, scrollHandler, isAuthenticated, authLoading, appUser]);

  // Memoized view renderer with Suspense boundaries
  const renderView = useMemo(() => {
    switch (deferredViewMode) {
      case 'daily':
        return (
          <Suspense fallback={<TimelineLoadingFallback />}>
            <BubbleTimelineView />
          </Suspense>
        );
      case 'weekly':
        return (
          <Suspense fallback={<TimelineLoadingFallback />}>
            <TimelineWeekView />
          </Suspense>
        );
      case 'monthly':
        return (
          <Suspense fallback={<TimelineLoadingFallback />}>
            <TimelineMonthView />
          </Suspense>
        );
      default:
        return null;
    }
  }, [deferredViewMode]);

  // Optimistic UI handlers
  const handleRetry = () => {
    // 모든 실패한 작업을 재시도
    optimisticState.pendingOperations.forEach(op => {
      retryFailedOperation(op.id);
    });
    toast({
      description: '작업을 다시 시도하고 있습니다.',
    });
  };

  const handleClear = () => {
    clearFailedOperations();
    toast({
      description: '모든 실패한 작업을 지웠습니다.',
    });
  };

  // 🎈 Pull to Refresh 제거됨 - 고무줄 효과를 위해 비활성화
  // const handlePullRefresh = useCallback(async () => {
  //   try {
  //     // 현재 보고 있는 날짜의 할일들을 다시 로드
  //     const currentDate = viewMode === 'daily' ? 
  //       useTimelineViewStore.getState().currentDate : 
  //       new Date();
  //     
  //     const { convertKstDateToUtcRange } = await import('@/lib/date-utils');
  //     const { utcStart, utcEnd } = convertKstDateToUtcRange(currentDate);
  //     
  //     // 할일 데이터 새로고침
  //     await useTodoStore.getState().fetchTodosForDate(utcStart, utcEnd);
  //     
  //     // 성공 토스트
  //     toast({
  //       description: '데이터가 동기화되었습니다.',
  //       duration: 2000,
  //     });
  //   } catch (error) {
  //     // 오류 토스트
  //     toast({
  //       title: '동기화 실패',
  //       description: '데이터 동기화 중 오류가 발생했습니다.',
  //       variant: 'destructive',
  //     });
  //     throw error; // Pull to Refresh에 오류 전달
  //   }
  // }, [viewMode, toast]);

  // const handleReconnect = () => {
  //   forceReconnect();
  //   toast({
  //     description: '실시간 동기화 재연결을 시도하고 있습니다.',
  //   });
  // };

  if (error) {
    return <TimelineError error={error} />;
  }

  // 인증이 완료되지 않았거나 아직 로딩 중인 경우만 로딩 표시 (AppUser는 선택적)
  if (!isAuthenticated || authLoading) {
    console.log('🔄 TimelineContainer - 인증 대기 중:', {
      isAuthenticated,
      authLoading,
      hasAppUser: !!appUser,
      timestamp: new Date().toISOString()
    });
    return (
      <div
        className={cn("flex items-center justify-center h-full scrollbar-hide timeline-background")}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 dark:border-gray-700 dark:border-t-blue-400 mx-auto mb-6" />
          <p className="text-lg text-gray-600 dark:text-gray-300 font-medium">인증 정보를 확인하고 있습니다...</p>
        </div>
      </div>
    );
  }

  return (
    <ToastProvider>
      <TimelineDndProvider>
        <div
          className={cn('flex flex-col scrollbar-hide timeline-background', className)}
        >

          {/* Timeline Header - 스크롤과 함께 움직임 */}
          <div
            className={cn("scrollbar-hide timeline-background")}
          >
            <TimelineHeader />
          </div>

          {/* Main timeline content - full width without sidebar */}
          <div className="flex flex-1 pb-20 scrollbar-hide" {...swipeGesture}>
            {/* Timeline view content - main 컨테이너 스크롤 사용으로 고무줄 효과 활성화 */}
            <div
              ref={containerRef}
              className="w-full relative pb-4 scrollbar-hide"
            >
              {isLoading ? (
                <TimelineLoadingFallback />
              ) : (
                renderView
              )}
            </div>
          </div>
          
          {/* Optimistic UI Indicator */}
          <OptimisticIndicator
            isProcessing={optimisticState.isProcessing}
            hasError={!!todoError}
            pendingCount={optimisticState.pendingOperations.length}
            retryingCount={optimisticState.retryingOperations.size}
            onRetry={handleRetry}
            onClear={handleClear}
          />
          
          {/* Realtime Status Indicator - 임시 비활성화 */}
          {/* <RealtimeStatus
            connectionState={realtimeConnection}
            syncState={realtimeSync}
            onReconnect={handleReconnect}
            compact
            className="fixed top-16 right-4 z-40"
          /> */}
          
          {/* Floating Action Button */}
          <FloatingActionButton />
          
          {/* Floating Note Cards - 고정된 노트들 */}
          {pinnedNotes.map((note, index) => (
            <FloatingNoteCard
              key={note.id}
              note={note}
              className={`top-20 right-6`}
              style={{
                transform: `translateY(${index * 180}px)`,
              }}
            />
          ))}
          
          {/* 남은시간 위젯 비활성화 */}
          {/* <SimpleRemainingTime /> */}
        </div>
      </TimelineDndProvider>
    </ToastProvider>
  );
};

TimelineContainer.displayName = 'TimelineContainer';

export default TimelineContainer;