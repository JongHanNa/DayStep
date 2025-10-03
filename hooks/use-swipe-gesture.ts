'use client';

import { useRef, useCallback, TouchEventHandler, MouseEventHandler } from 'react';

export interface SwipeGestureOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  minSwipeDistance?: number;
  maxVerticalDistance?: number;
  touchOnly?: boolean;
}

export function useSwipeGesture({
  onSwipeLeft,
  onSwipeRight,
  minSwipeDistance = 50,
  maxVerticalDistance = 100,
  touchOnly = false
}: SwipeGestureOptions) {
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const mouseStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  const handleTouchStart: TouchEventHandler = useCallback((e) => {
    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    };
  }, []);

  const handleTouchEnd: TouchEventHandler = useCallback((e) => {
    if (!touchStartRef.current) return;

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);
    const deltaTime = Date.now() - touchStartRef.current.time;

    // 너무 오래 걸렸거나 수직 이동이 너무 크면 무시
    if (deltaTime > 500 || deltaY > maxVerticalDistance) {
      touchStartRef.current = null;
      return;
    }

    // 최소 스와이프 거리 확인
    if (Math.abs(deltaX) >= minSwipeDistance) {
      if (deltaX > 0 && onSwipeRight) {
        onSwipeRight();
      } else if (deltaX < 0 && onSwipeLeft) {
        onSwipeLeft();
      }
    }

    touchStartRef.current = null;
  }, [onSwipeLeft, onSwipeRight, minSwipeDistance, maxVerticalDistance]);

  const handleMouseDown: MouseEventHandler = useCallback((e) => {
    if (touchOnly) return;
    
    mouseStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      time: Date.now()
    };
  }, [touchOnly]);

  const handleMouseUp: MouseEventHandler = useCallback((e) => {
    if (touchOnly || !mouseStartRef.current) return;

    const deltaX = e.clientX - mouseStartRef.current.x;
    const deltaY = Math.abs(e.clientY - mouseStartRef.current.y);
    const deltaTime = Date.now() - mouseStartRef.current.time;

    // 너무 오래 걸렸거나 수직 이동이 너무 크면 무시
    if (deltaTime > 500 || deltaY > maxVerticalDistance) {
      mouseStartRef.current = null;
      return;
    }

    // 최소 스와이프 거리 확인
    if (Math.abs(deltaX) >= minSwipeDistance) {
      if (deltaX > 0 && onSwipeRight) {
        onSwipeRight();
      } else if (deltaX < 0 && onSwipeLeft) {
        onSwipeLeft();
      }
    }

    mouseStartRef.current = null;
  }, [touchOnly, onSwipeLeft, onSwipeRight, minSwipeDistance, maxVerticalDistance]);

  return {
    onTouchStart: handleTouchStart,
    onTouchEnd: handleTouchEnd,
    onMouseDown: handleMouseDown,
    onMouseUp: handleMouseUp,
  };
}