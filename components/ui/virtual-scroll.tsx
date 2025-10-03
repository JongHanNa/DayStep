'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useVirtualWindow } from '@/state/utils/memoryUtils';
import { cn } from '@/lib/utils';

interface VirtualScrollProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
  overscan?: number;
  onScroll?: (scrollTop: number) => void;
  loading?: boolean;
  error?: string | null;
}

/**
 * 메모리 효율적인 가상 스크롤링 컴포넌트
 * 대량의 데이터를 처리하면서도 DOM 노드를 최소한으로 유지
 */
export function VirtualScroll<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  className,
  overscan = 5,
  onScroll,
  loading = false,
  error = null
}: VirtualScrollProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollElementRef = useRef<HTMLDivElement>(null);

  const { visibleItems, totalHeight, getVisibleRange } = useVirtualWindow(
    items.length,
    itemHeight,
    containerHeight,
    overscan
  );

  const visibleRange = useMemo(() => 
    getVisibleRange(scrollTop), 
    [getVisibleRange, scrollTop]
  );

  const visibleItems_data = useMemo(() => 
    items.slice(visibleRange.start, visibleRange.end),
    [items, visibleRange.start, visibleRange.end]
  );

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = e.currentTarget.scrollTop;
    setScrollTop(newScrollTop);
    onScroll?.(newScrollTop);
  }, [onScroll]);

  // 스크롤 위치 복원 (예: 페이지 이동 후 돌아왔을 때)
  useEffect(() => {
    if (scrollElementRef.current && scrollTop > 0) {
      scrollElementRef.current.scrollTop = scrollTop;
    }
  }, [items.length, scrollTop]);

  if (error) {
    return (
      <div className={cn(
        'flex items-center justify-center text-red-600 p-4',
        className
      )}>
        <div className="text-center">
          <p className="font-semibold">오류가 발생했습니다</p>
          <p className="text-sm text-gray-600 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn('relative overflow-hidden', className)}
      style={{ height: containerHeight }}
    >
      <div
        ref={scrollElementRef}
        className="h-full overflow-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
        onScroll={handleScroll}
      >
        <div style={{ height: totalHeight, position: 'relative' }}>
          <div
            style={{
              transform: `translateY(${visibleRange.offsetY}px)`,
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
            }}
          >
            {loading && visibleItems_data.length === 0 ? (
              // 로딩 상태 스켈레톤
              <div className="space-y-2">
                {Array.from({ length: Math.min(10, visibleItems) }, (_, i) => (
                  <div
                    key={i}
                    className="animate-pulse bg-gray-200 rounded"
                    style={{ height: itemHeight }}
                  />
                ))}
              </div>
            ) : (
              // 실제 아이템들
              visibleItems_data.map((item, index) => (
                <div
                  key={visibleRange.start + index}
                  style={{ height: itemHeight }}
                  className="w-full"
                >
                  {renderItem(item, visibleRange.start + index)}
                </div>
              ))
            )}
            
            {loading && visibleItems_data.length > 0 && (
              <div className="flex justify-center p-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 동적 높이를 지원하는 가상 스크롤링 컴포넌트
 */
interface VariableVirtualScrollProps<T> extends Omit<VirtualScrollProps<T>, 'itemHeight'> {
  estimatedItemHeight: number;
  getItemHeight: (item: T, index: number) => number;
}

export function VariableVirtualScroll<T>({
  items,
  estimatedItemHeight,
  getItemHeight,
  containerHeight,
  renderItem,
  className,
  overscan = 5,
  onScroll,
  loading = false,
  error = null
}: VariableVirtualScrollProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const [itemHeights, setItemHeights] = useState<number[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollElementRef = useRef<HTMLDivElement>(null);

  // 아이템 높이 캐시 업데이트
  useEffect(() => {
    const heights = items.map((item, index) => getItemHeight(item, index));
    setItemHeights(heights);
  }, [items, getItemHeight]);

  const { totalHeight, visibleRange } = useMemo(() => {
    const heights = itemHeights.length > 0 ? itemHeights : 
                   items.map(() => estimatedItemHeight);
    
    const total = heights.reduce((sum, height) => sum + height, 0);
    
    // 현재 스크롤 위치에서 보이는 아이템 범위 계산
    let currentHeight = 0;
    let start = 0;
    let end = items.length;

    for (let i = 0; i < heights.length; i++) {
      if (currentHeight >= scrollTop - overscan * estimatedItemHeight) {
        start = Math.max(0, i - overscan);
        break;
      }
      currentHeight += heights[i];
    }

    currentHeight = 0;
    for (let i = 0; i < heights.length; i++) {
      currentHeight += heights[i];
      if (currentHeight >= scrollTop + containerHeight + overscan * estimatedItemHeight) {
        end = Math.min(items.length, i + overscan);
        break;
      }
    }

    const offsetY = heights.slice(0, start).reduce((sum, height) => sum + height, 0);

    return {
      totalHeight: total,
      visibleRange: { start, end, offsetY }
    };
  }, [itemHeights, scrollTop, containerHeight, overscan, estimatedItemHeight, items]);

  const visibleItems_data = useMemo(() => 
    items.slice(visibleRange.start, visibleRange.end),
    [items, visibleRange.start, visibleRange.end]
  );

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = e.currentTarget.scrollTop;
    setScrollTop(newScrollTop);
    onScroll?.(newScrollTop);
  }, [onScroll]);

  if (error) {
    return (
      <div className={cn(
        'flex items-center justify-center text-red-600 p-4',
        className
      )}>
        <div className="text-center">
          <p className="font-semibold">오류가 발생했습니다</p>
          <p className="text-sm text-gray-600 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn('relative overflow-hidden', className)}
      style={{ height: containerHeight }}
    >
      <div
        ref={scrollElementRef}
        className="h-full overflow-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
        onScroll={handleScroll}
      >
        <div style={{ height: totalHeight, position: 'relative' }}>
          <div
            style={{
              transform: `translateY(${visibleRange.offsetY}px)`,
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
            }}
          >
            {loading && visibleItems_data.length === 0 ? (
              <div className="space-y-2">
                {Array.from({ length: Math.min(10, Math.ceil(containerHeight / estimatedItemHeight)) }, (_, i) => (
                  <div
                    key={i}
                    className="animate-pulse bg-gray-200 rounded"
                    style={{ height: estimatedItemHeight }}
                  />
                ))}
              </div>
            ) : (
              visibleItems_data.map((item, index) => {
                const actualIndex = visibleRange.start + index;
                const height = itemHeights[actualIndex] || estimatedItemHeight;
                
                return (
                  <div
                    key={actualIndex}
                    style={{ height }}
                    className="w-full"
                  >
                    {renderItem(item, actualIndex)}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}