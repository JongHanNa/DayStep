'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { usePageVisibility, useScreenBrightness, useResourceMonitor } from '@/lib/battery-optimization';
import { cn } from '@/lib/utils';

interface OptimizedMotionProps {
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  reducedMotion?: boolean;
}

/**
 * 배터리와 성능을 고려한 최적화된 모션 컴포넌트
 */
export function OptimizedMotion({ 
  children, 
  className, 
  disabled = false,
  reducedMotion 
}: OptimizedMotionProps) {
  const { isBackground } = usePageVisibility();
  const { shouldUseMinimalAnimations } = useScreenBrightness();
  const { shouldReducePerformance } = useResourceMonitor();
  
  const shouldDisableMotion = disabled || 
    reducedMotion || 
    shouldUseMinimalAnimations || 
    shouldReducePerformance || 
    isBackground;

  return (
    <div 
      className={cn(
        'transition-optimized',
        shouldDisableMotion && 'no-animation battery-save-mode',
        className
      )}
    >
      {children}
    </div>
  );
}

interface AnimatedListProps {
  children: React.ReactNode[];
  className?: string;
  itemClassName?: string;
  stagger?: number;
}

/**
 * 성능 최적화된 리스트 애니메이션
 */
export function AnimatedList({ 
  children, 
  className, 
  itemClassName,
  stagger = 50 
}: AnimatedListProps) {
  const [visibleItems, setVisibleItems] = useState<number[]>([]);
  const { isBackground } = usePageVisibility();
  const { shouldReducePerformance } = useResourceMonitor();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isBackground || shouldReducePerformance) {
      // 배경/절전 모드에서는 즉시 모든 아이템 표시
      setVisibleItems(children.map((_, index) => index));
      return;
    }

    // 스태거 애니메이션
    const timeouts: NodeJS.Timeout[] = [];
    
    children.forEach((_, index) => {
      const timeout = setTimeout(() => {
        setVisibleItems(prev => [...prev, index]);
      }, index * stagger);
      
      timeouts.push(timeout);
    });

    return () => {
      timeouts.forEach(timeout => clearTimeout(timeout));
    };
  }, [children, stagger, isBackground, shouldReducePerformance]);

  return (
    <div ref={containerRef} className={cn('space-y-2', className)}>
      {children.map((child, index) => (
        <OptimizedMotion
          key={index}
          className={cn(
            'lazy-animate',
            visibleItems.includes(index) && 'in-view',
            itemClassName
          )}
        >
          {child}
        </OptimizedMotion>
      ))}
    </div>
  );
}

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  threshold?: number;
  maxPull?: number;
}

/**
 * 최적화된 풀 투 리프레시 컴포넌트
 */
export function PullToRefresh({ 
  onRefresh, 
  children, 
  threshold = 60,
  maxPull = 120 
}: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isReady, setIsReady] = useState(false);
  
  const startY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const { shouldReducePerformance } = useResourceMonitor();

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (shouldReducePerformance || isRefreshing) return;
    
    const touch = e.touches[0];
    startY.current = touch.clientY;
  }, [shouldReducePerformance, isRefreshing]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (shouldReducePerformance || isRefreshing || !containerRef.current) return;
    
    const touch = e.touches[0];
    const currentY = touch.clientY;
    const diff = currentY - startY.current;
    
    // 스크롤이 맨 위에 있을 때만 풀 투 리프레시 활성화
    const scrollTop = containerRef.current.scrollTop;
    if (scrollTop > 0 || diff <= 0) {
      setPullDistance(0);
      setIsReady(false);
      return;
    }

    e.preventDefault();
    const distance = Math.min(diff * 0.6, maxPull);
    setPullDistance(distance);
    setIsReady(distance >= threshold);
  }, [shouldReducePerformance, isRefreshing, threshold, maxPull]);

  const handleTouchEnd = useCallback(async () => {
    if (shouldReducePerformance || isRefreshing) return;
    
    if (isReady) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }
    
    setPullDistance(0);
    setIsReady(false);
  }, [shouldReducePerformance, isRefreshing, isReady, onRefresh]);

  return (
    <div
      ref={containerRef}
      className="relative overflow-auto h-full scroll-optimized"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* 풀 투 리프레시 인디케이터 */}
      <div
        className={cn(
          'absolute top-0 left-0 right-0 flex items-center justify-center',
          'pull-to-refresh',
          (pullDistance > 0 || isRefreshing) && 'pulling',
          isRefreshing && 'refreshing'
        )}
        style={{
          transform: `translateY(${isRefreshing ? 0 : pullDistance - 60}px)`,
          height: '60px'
        }}
      >
        <div className={cn(
          'w-8 h-8 rounded-full border-2 border-gray-300',
          isRefreshing && 'loading-spinner border-blue-500',
          isReady && !isRefreshing && 'border-blue-500'
        )}>
          {!isRefreshing && (
            <div 
              className="w-full h-full rounded-full border-2 border-transparent border-t-blue-500"
              style={{
                transform: `rotate(${(pullDistance / threshold) * 180}deg)`
              }}
            />
          )}
        </div>
      </div>
      
      {/* 메인 콘텐츠 */}
      <div
        style={{
          transform: `translateY(${isRefreshing ? 60 : pullDistance}px)`,
          transition: isRefreshing ? 'transform 0.2s ease-out' : 'none'
        }}
      >
        {children}
      </div>
    </div>
  );
}

interface SwipeActionProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number;
  className?: string;
}

/**
 * 최적화된 스와이프 액션 컴포넌트
 */
export function SwipeAction({ 
  children, 
  onSwipeLeft, 
  onSwipeRight, 
  threshold = 80,
  className 
}: SwipeActionProps) {
  const [swipeDistance, setSwipeDistance] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  
  const startX = useRef(0);
  const { shouldReducePerformance } = useResourceMonitor();

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (shouldReducePerformance) return;
    
    const touch = e.touches[0];
    startX.current = touch.clientX;
    setIsSwiping(true);
  }, [shouldReducePerformance]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (shouldReducePerformance || !isSwiping) return;
    
    const touch = e.touches[0];
    const diff = touch.clientX - startX.current;
    
    // 스와이프 거리 제한
    const maxDistance = 120;
    const distance = Math.max(-maxDistance, Math.min(maxDistance, diff));
    setSwipeDistance(distance);
  }, [shouldReducePerformance, isSwiping]);

  const handleTouchEnd = useCallback(() => {
    if (shouldReducePerformance) return;
    
    const absDistance = Math.abs(swipeDistance);
    
    if (absDistance >= threshold) {
      if (swipeDistance > 0 && onSwipeRight) {
        onSwipeRight();
      } else if (swipeDistance < 0 && onSwipeLeft) {
        onSwipeLeft();
      }
    }
    
    setSwipeDistance(0);
    setIsSwiping(false);
  }, [shouldReducePerformance, swipeDistance, threshold, onSwipeLeft, onSwipeRight]);

  return (
    <div
      className={cn(
        'swipe-feedback touch-optimized',
        isSwiping && 'swiping',
        className
      )}
      style={{
        transform: `translateX(${swipeDistance}px)`
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {children}
    </div>
  );
}

interface HapticButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  hapticType?: 'light' | 'medium' | 'heavy';
}

/**
 * 햅틱 피드백이 있는 최적화된 버튼
 */
export function HapticButton({ 
  children, 
  className, 
  hapticType = 'light',
  onClick,
  ...props 
}: HapticButtonProps) {
  const [isPressed, setIsPressed] = useState(false);
  const { shouldReducePerformance } = useResourceMonitor();

  const triggerHaptic = useCallback(() => {
    if (shouldReducePerformance || !('vibrate' in navigator)) return;
    
    const patterns = {
      light: 10,
      medium: 20,
      heavy: 30
    };
    
    navigator.vibrate(patterns[hapticType]);
  }, [shouldReducePerformance, hapticType]);

  const handleTouchStart = useCallback(() => {
    setIsPressed(true);
    triggerHaptic();
  }, [triggerHaptic]);

  const handleTouchEnd = useCallback(() => {
    setIsPressed(false);
  }, []);

  const handleClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    triggerHaptic();
    onClick?.(e);
  }, [triggerHaptic, onClick]);

  return (
    <button
      {...props}
      className={cn(
        'button-optimized haptic-feedback touch-optimized',
        isPressed && 'active',
        className
      )}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onClick={handleClick}
    >
      {children}
    </button>
  );
}