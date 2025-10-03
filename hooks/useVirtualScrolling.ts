import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface UseVirtualScrollingOptions {
  itemCount: number;
  itemHeight: number | ((index: number) => number);
  containerHeight: number;
  overscan?: number;
  scrollingDelay?: number;
}

interface VirtualScrollingResult {
  totalHeight: number;
  startIndex: number;
  endIndex: number;
  visibleItems: Array<{
    index: number;
    offsetTop: number;
    height: number;
  }>;
  scrollElementProps: {
    ref: React.RefObject<HTMLDivElement>;
    onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
    style: React.CSSProperties;
  };
}

export const useVirtualScrolling = (
  options: UseVirtualScrollingOptions
): VirtualScrollingResult => {
  const {
    itemCount,
    itemHeight,
    containerHeight,
    overscan = 3,
    scrollingDelay = 150
  } = options;

  const scrollElementRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollingTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // 아이템 높이 계산 함수
  const getItemHeight = useCallback((index: number): number => {
    return typeof itemHeight === 'function' ? itemHeight(index) : itemHeight;
  }, [itemHeight]);

  // 총 높이 계산
  const totalHeight = useMemo(() => {
    if (typeof itemHeight === 'number') {
      return itemCount * itemHeight;
    }
    
    let height = 0;
    for (let i = 0; i < itemCount; i++) {
      height += getItemHeight(i);
    }
    return height;
  }, [itemCount, itemHeight, getItemHeight]);

  // 아이템 오프셋 계산
  const getItemOffset = useCallback((index: number): number => {
    if (typeof itemHeight === 'number') {
      return index * itemHeight;
    }
    
    let offset = 0;
    for (let i = 0; i < index; i++) {
      offset += getItemHeight(i);
    }
    return offset;
  }, [itemHeight, getItemHeight]);

  // 스크롤 위치에서 시작 인덱스 찾기
  const getStartIndex = useCallback((scrollTop: number): number => {
    if (typeof itemHeight === 'number') {
      return Math.floor(scrollTop / itemHeight);
    }
    
    let totalOffset = 0;
    for (let i = 0; i < itemCount; i++) {
      const itemSize = getItemHeight(i);
      if (totalOffset + itemSize > scrollTop) {
        return i;
      }
      totalOffset += itemSize;
    }
    return itemCount - 1;
  }, [itemHeight, itemCount, getItemHeight]);

  // 표시할 아이템 범위 계산
  const { startIndex, endIndex, visibleItems } = useMemo(() => {
    const start = Math.max(0, getStartIndex(scrollTop) - overscan);
    let end = start;
    let accumulatedHeight = 0;
    
    for (let i = start; i < itemCount && accumulatedHeight < containerHeight + overscan * 2; i++) {
      accumulatedHeight += getItemHeight(i);
      end = i;
    }
    
    end = Math.min(itemCount - 1, end + overscan);
    
    const items = [];
    for (let i = start; i <= end; i++) {
      items.push({
        index: i,
        offsetTop: getItemOffset(i),
        height: getItemHeight(i)
      });
    }
    
    return {
      startIndex: start,
      endIndex: end,
      visibleItems: items
    };
  }, [scrollTop, containerHeight, overscan, itemCount, getStartIndex, getItemHeight, getItemOffset]);

  // 스크롤 이벤트 핸들러
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    setScrollTop(scrollTop);
    
    if (!isScrolling) {
      setIsScrolling(true);
    }
    
    if (scrollingTimeoutRef.current) {
      clearTimeout(scrollingTimeoutRef.current);
    }
    
    scrollingTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
    }, scrollingDelay);
  }, [isScrolling, scrollingDelay]);

  // 스크롤 위치 복원
  const scrollToIndex = useCallback((index: number, align: 'start' | 'center' | 'end' = 'start') => {
    if (!scrollElementRef.current) return;
    
    const itemOffset = getItemOffset(index);
    const itemSize = getItemHeight(index);
    
    let scrollTop = itemOffset;
    
    if (align === 'center') {
      scrollTop = itemOffset - (containerHeight - itemSize) / 2;
    } else if (align === 'end') {
      scrollTop = itemOffset - containerHeight + itemSize;
    }
    
    scrollTop = Math.max(0, Math.min(scrollTop, totalHeight - containerHeight));
    
    scrollElementRef.current.scrollTop = scrollTop;
  }, [getItemOffset, getItemHeight, containerHeight, totalHeight]);

  // 클린업
  useEffect(() => {
    return () => {
      if (scrollingTimeoutRef.current) {
        clearTimeout(scrollingTimeoutRef.current);
      }
    };
  }, []);

  return {
    totalHeight,
    startIndex,
    endIndex,
    visibleItems,
    scrollElementProps: {
      ref: scrollElementRef as React.RefObject<HTMLDivElement>,
      onScroll: handleScroll,
      style: {
        height: containerHeight,
        overflow: 'auto'
      }
    }
  };
};