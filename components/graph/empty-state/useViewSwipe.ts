/**
 * 뷰 스와이프 제스처 훅
 *
 * 4가지 뷰 형태 간 스와이프 전환을 관리
 */

import { useState, useCallback } from 'react';
import { PanInfo } from 'framer-motion';
import { SWIPE_THRESHOLD, swipePower } from '@/lib/animations/appleMotion';
import type { EmptyStateViewType } from './RecommendationData';

interface UseViewSwipeOptions {
  /** 뷰 목록 */
  views: EmptyStateViewType[];
  /** 초기 뷰 인덱스 */
  initialIndex?: number;
  /** 뷰 변경 콜백 */
  onViewChange?: (view: EmptyStateViewType, index: number) => void;
}

interface UseViewSwipeReturn {
  /** 현재 뷰 인덱스 */
  currentIndex: number;
  /** 현재 뷰 타입 */
  currentView: EmptyStateViewType;
  /** 스와이프 방향 (애니메이션용) */
  direction: number;
  /** 드래그 종료 핸들러 */
  handleDragEnd: (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => void;
  /** 특정 뷰로 이동 */
  goToView: (index: number) => void;
  /** 다음 뷰로 이동 */
  goToNext: () => void;
  /** 이전 뷰로 이동 */
  goToPrev: () => void;
  /** 첫 번째 뷰인지 */
  isFirst: boolean;
  /** 마지막 뷰인지 */
  isLast: boolean;
  /** 총 뷰 개수 */
  totalViews: number;
}

export function useViewSwipe({
  views,
  initialIndex = 0,
  onViewChange,
}: UseViewSwipeOptions): UseViewSwipeReturn {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [direction, setDirection] = useState(0);

  const totalViews = views.length;
  const currentView = views[currentIndex];
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === totalViews - 1;

  const goToView = useCallback(
    (index: number) => {
      if (index < 0 || index >= totalViews) return;

      setDirection(index > currentIndex ? 1 : -1);
      setCurrentIndex(index);
      onViewChange?.(views[index], index);
    },
    [currentIndex, totalViews, views, onViewChange]
  );

  const goToNext = useCallback(() => {
    if (!isLast) {
      goToView(currentIndex + 1);
    }
  }, [currentIndex, isLast, goToView]);

  const goToPrev = useCallback(() => {
    if (!isFirst) {
      goToView(currentIndex - 1);
    }
  }, [currentIndex, isFirst, goToView]);

  const handleDragEnd = useCallback(
    (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const { offset, velocity } = info;
      const power = swipePower(offset.x, velocity.x);

      // 충분한 스와이프 파워가 있을 때만 전환
      if (power > SWIPE_THRESHOLD) {
        if (offset.x < 0 && !isLast) {
          // 왼쪽으로 스와이프 → 다음 뷰
          goToNext();
        } else if (offset.x > 0 && !isFirst) {
          // 오른쪽으로 스와이프 → 이전 뷰
          goToPrev();
        }
      }
    },
    [isFirst, isLast, goToNext, goToPrev]
  );

  return {
    currentIndex,
    currentView,
    direction,
    handleDragEnd,
    goToView,
    goToNext,
    goToPrev,
    isFirst,
    isLast,
    totalViews,
  };
}

export default useViewSwipe;
