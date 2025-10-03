import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { VariableSizeList as List } from 'react-window';
import { TimelineItem } from '@/types/timeline-view';
import { useTimelineViewStore } from '@/state/stores/timelineViewStore';

interface CurrentTimeScrollOptions {
  /** 자동 스크롤 활성화 여부 */
  autoScrollEnabled?: boolean;
  /** 스크롤 애니메이션 지속 시간 (ms) */
  scrollDuration?: number;
  /** 현재 시간 업데이트 간격 (ms) */
  updateInterval?: number;
  /** 스크롤 스냅 포인트 설정 */
  snapToCurrentTime?: boolean;
}

interface CurrentTimeScrollState {
  /** 현재 시간 */
  currentTime: Date;
  /** 현재 시간에 해당하는 아이템 인덱스 */
  currentTimeIndex: number;
  /** 현재 시간이 뷰포트에 표시되는지 여부 */
  isCurrentTimeVisible: boolean;
  /** 자동 스크롤 중인지 여부 */
  isAutoScrolling: boolean;
}

export const useCurrentTimeScroll = (
  listRef: React.RefObject<List | null>,
  items: TimelineItem[],
  options: CurrentTimeScrollOptions = {}
) => {
  const {
    autoScrollEnabled = true,
    scrollDuration = 800,
    updateInterval = 60000, // 1분
    snapToCurrentTime = true
  } = options;

  const { viewMode, viewport } = useTimelineViewStore();
  
  const [state, setState] = useState<CurrentTimeScrollState>({
    currentTime: new Date(),
    currentTimeIndex: -1,
    isCurrentTimeVisible: false,
    isAutoScrolling: false
  });

  const intersectionObserverRef = useRef<IntersectionObserver | null>(null);
  const currentTimeElementRef = useRef<HTMLDivElement | null>(null);
  const autoScrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastScrollTimeRef = useRef<number>(0);

  /**
   * 현재 시간에 해당하는 아이템 인덱스 찾기 (Memoized for performance)
   */
  const findCurrentTimeIndex = useCallback((currentTime: Date): number => {
    if (items.length === 0) return -1;

    const currentTimeMs = currentTime.getTime();
    const currentDay = currentTime.toDateString();

    // 일간 뷰에서는 시간 기준으로 정확한 위치 찾기 (binary search for better performance)
    if (viewMode === 'daily') {
      let left = 0, right = items.length - 1;
      while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        const midTime = new Date(items[mid].startTime).getTime();
        
        if (midTime >= currentTimeMs) {
          if (mid === 0 || new Date(items[mid - 1].startTime).getTime() < currentTimeMs) {
            return mid;
          }
          right = mid - 1;
        } else {
          left = mid + 1;
        }
      }
      return left < items.length ? left : -1;
    }

    // 주간/월간 뷰에서는 날짜 기준으로 찾기
    return items.findIndex(item => {
      const itemDay = new Date(item.startTime).toDateString();
      return itemDay === currentDay;
    });
  }, [items, viewMode]);

  /**
   * 현재 시간으로 스크롤
   */
  const scrollToCurrentTime = useCallback((smooth = true) => {
    if (!listRef.current || !autoScrollEnabled) return;

    const currentTime = new Date();
    const currentTimeIndex = findCurrentTimeIndex(currentTime);

    if (currentTimeIndex === -1) return;

    setState(prev => ({ ...prev, isAutoScrolling: true }));

    try {
      if (smooth) {
        // 부드러운 스크롤 애니메이션
        const startTime = performance.now();
        const duration = scrollDuration;
        
        const animate = (currentTimeStamp: number) => {
          const elapsed = currentTimeStamp - startTime;
          const progress = Math.min(elapsed / duration, 1);
          
          // easeInOutCubic 이징 함수
          const easeProgress = progress < 0.5
            ? 4 * progress * progress * progress
            : 1 - Math.pow(-2 * progress + 2, 3) / 2;

          if (progress < 1) {
            requestAnimationFrame(animate);
          } else {
            setState(prev => ({ ...prev, isAutoScrolling: false }));
          }
        };

        requestAnimationFrame(animate);
        listRef.current.scrollToItem(currentTimeIndex, 'center');
      } else {
        listRef.current.scrollToItem(currentTimeIndex, 'center');
        setState(prev => ({ ...prev, isAutoScrolling: false }));
      }

      lastScrollTimeRef.current = Date.now();
    } catch (error) {
      console.error('현재 시간으로 스크롤하는 중 오류 발생:', error);
      setState(prev => ({ ...prev, isAutoScrolling: false }));
    }
  }, [listRef, autoScrollEnabled, scrollDuration, findCurrentTimeIndex]);

  /**
   * IntersectionObserver 설정
   */
  const setupIntersectionObserver = useCallback(() => {
    if (!currentTimeElementRef.current) return;

    // 기존 옵저버 정리
    if (intersectionObserverRef.current) {
      intersectionObserverRef.current.disconnect();
    }

    intersectionObserverRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setState(prev => ({
            ...prev,
            isCurrentTimeVisible: entry.isIntersecting
          }));
        });
      },
      {
        root: null,
        rootMargin: '-50px 0px -50px 0px', // 중앙 영역에서만 가시성 판단
        threshold: [0, 0.5, 1]
      }
    );

    intersectionObserverRef.current.observe(currentTimeElementRef.current);
  }, [listRef]);

  /**
   * 현재 시간 업데이트 (Optimized to prevent unnecessary re-renders)
   */
  const updateCurrentTime = useCallback(() => {
    const now = new Date();
    const currentTimeIndex = findCurrentTimeIndex(now);

    setState(prev => {
      // Only update if time index actually changed or minute changed
      const minutesChanged = Math.floor(now.getTime() / 60000) !== Math.floor(prev.currentTime.getTime() / 60000);
      if (prev.currentTimeIndex === currentTimeIndex && !minutesChanged) {
        return prev; // Prevent unnecessary re-render
      }
      
      return {
        ...prev,
        currentTime: now,
        currentTimeIndex
      };
    });

    // Use ref to avoid stale closure issues
    setState(current => {
      // 자동 스크롤이 활성화되어 있고, 현재 시간이 보이지 않으면 스크롤
      if (autoScrollEnabled && !current.isCurrentTimeVisible && !current.isAutoScrolling) {
        const timeSinceLastScroll = Date.now() - lastScrollTimeRef.current;
        
        // 마지막 스크롤로부터 충분한 시간이 지난 경우에만 자동 스크롤
        if (timeSinceLastScroll > 30000) { // 30초
          scrollToCurrentTime();
        }
      }
      return current;
    });
  }, [findCurrentTimeIndex, autoScrollEnabled, scrollToCurrentTime]);

  /**
   * 스크롤 스냅 포인트 처리
   */
  const handleScrollSnap = useCallback(() => {
    if (!snapToCurrentTime || !listRef.current) return;

    const { startIndex, endIndex } = viewport;
    const currentTimeIndex = state.currentTimeIndex;

    // 현재 시간 인덱스가 뷰포트 근처에 있으면 스냅
    if (currentTimeIndex >= startIndex - 2 && currentTimeIndex <= endIndex + 2) {
      if (autoScrollTimeoutRef.current) {
        clearTimeout(autoScrollTimeoutRef.current);
      }

      autoScrollTimeoutRef.current = setTimeout(() => {
        scrollToCurrentTime(true);
      }, 1000); // 1초 후 스냅
    }
  }, [snapToCurrentTime, viewport, state.currentTimeIndex, scrollToCurrentTime]);

  /**
   * 수동으로 현재 시간으로 스크롤
   */
  const manualScrollToCurrentTime = useCallback(() => {
    scrollToCurrentTime(true);
  }, [scrollToCurrentTime]);

  /**
   * 자동 스크롤 토글
   */
  const toggleAutoScroll = useCallback(() => {
    setState(prev => ({ ...prev, isAutoScrolling: !prev.isAutoScrolling }));
  }, []);

  // 현재 시간 업데이트 타이머 설정
  useEffect(() => {
    updateCurrentTime(); // 초기 실행

    const timer = setInterval(updateCurrentTime, updateInterval);
    return () => clearInterval(timer);
  }, [updateCurrentTime, updateInterval]);

  // IntersectionObserver 설정
  useEffect(() => {
    setupIntersectionObserver();
    
    return () => {
      if (intersectionObserverRef.current) {
        intersectionObserverRef.current.disconnect();
      }
    };
  }, [setupIntersectionObserver]);

  // 스크롤 스냅 처리
  useEffect(() => {
    handleScrollSnap();
    
    return () => {
      if (autoScrollTimeoutRef.current) {
        clearTimeout(autoScrollTimeoutRef.current);
      }
    };
  }, [handleScrollSnap]);

  // 정리
  useEffect(() => {
    return () => {
      if (intersectionObserverRef.current) {
        intersectionObserverRef.current.disconnect();
      }
      if (autoScrollTimeoutRef.current) {
        clearTimeout(autoScrollTimeoutRef.current);
      }
    };
  }, []);

  return {
    ...state,
    currentTimeElementRef,
    scrollToCurrentTime: manualScrollToCurrentTime,
    toggleAutoScroll,
    setupIntersectionObserver
  };
};