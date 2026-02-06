'use client';

import { useCallback, useRef, useEffect } from 'react';

interface UseSwipeUpOptions {
  onSwipeUp: () => void;
  threshold?: number;
  debug?: boolean;
}

export function useSwipeUp({ 
  onSwipeUp, 
  threshold = 30, 
  debug = false 
}: UseSwipeUpOptions) {
  const elementRef = useRef<HTMLDivElement | null>(null);
  const startY = useRef<number>(0);
  const startX = useRef<number>(0);
  const isDragging = useRef<boolean>(false);

  const log = useCallback((message: string, ...args: any[]) => {
    if (debug) {
      console.log(`[SwipeUp] ${message}`, ...args);
    }
  }, [debug]);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const touch = e.touches[0];
    startY.current = touch.clientY;
    startX.current = touch.clientX;
    isDragging.current = true;
    log('Touch start', { y: touch.clientY, x: touch.clientX });
  }, [log]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging.current) return;
    
    // 기본 스크롤 동작 방지
    e.preventDefault();
    e.stopPropagation();
    
    const touch = e.touches[0];
    const deltaY = startY.current - touch.clientY; // 위로 드래그하면 양수
    const deltaX = Math.abs(touch.clientX - startX.current);
    
    log('Touch move', { 
      deltaY, 
      deltaX, 
      threshold,
      isVertical: deltaY > deltaX 
    });
  }, [log, threshold]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (!isDragging.current) return;
    
    const touch = e.changedTouches[0];
    const deltaY = startY.current - touch.clientY; // 위로 드래그하면 양수
    const deltaX = Math.abs(touch.clientX - startX.current);
    
    log('Touch end', { 
      deltaY, 
      deltaX, 
      threshold,
      willTrigger: deltaY > threshold && deltaY > deltaX 
    });
    
    // 위로 드래그했고, 세로 이동이 가로 이동보다 크고, threshold를 넘었을 때
    if (deltaY > threshold && deltaY > deltaX) {
      log('🔥 Swipe up triggered!');
      onSwipeUp();
    }
    
    isDragging.current = false;
  }, [log, threshold, onSwipeUp]);

  // 마우스 이벤트도 추가 (데스크톱 테스트용)
  const handleMouseDown = useCallback((e: MouseEvent) => {
    startY.current = e.clientY;
    startX.current = e.clientX;
    isDragging.current = true;
    log('Mouse down', { y: e.clientY, x: e.clientX });
  }, [log]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current) return;
    
    const deltaY = startY.current - e.clientY;
    const deltaX = Math.abs(e.clientX - startX.current);
    
    log('Mouse move', { deltaY, deltaX });
  }, [log]);

  const handleMouseUp = useCallback((e: MouseEvent) => {
    if (!isDragging.current) return;
    
    const deltaY = startY.current - e.clientY;
    const deltaX = Math.abs(e.clientX - startX.current);
    
    log('Mouse up', { 
      deltaY, 
      deltaX, 
      threshold,
      willTrigger: deltaY > threshold && deltaY > deltaX 
    });
    
    if (deltaY > threshold && deltaY > deltaX) {
      log('🔥 Mouse swipe up triggered!');
      onSwipeUp();
    }
    
    isDragging.current = false;
  }, [log, threshold, onSwipeUp]);

  // 이벤트 리스너 등록
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    log('Registering event listeners on element');

    // 터치 이벤트 (passive: false로 preventDefault 허용)
    element.addEventListener('touchstart', handleTouchStart, { passive: false });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd, { passive: false });
    
    // 마우스 이벤트
    element.addEventListener('mousedown', handleMouseDown);
    element.addEventListener('mousemove', handleMouseMove);
    element.addEventListener('mouseup', handleMouseUp);
    element.addEventListener('mouseleave', handleMouseUp); // 마우스가 영역을 벗어날 때도 처리

    return () => {
      log('Removing event listeners');
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('mousedown', handleMouseDown);
      element.removeEventListener('mousemove', handleMouseMove);
      element.removeEventListener('mouseup', handleMouseUp);
      element.removeEventListener('mouseleave', handleMouseUp);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, handleMouseDown, handleMouseMove, handleMouseUp, log]);

  return {
    elementRef,
    isDragging: isDragging.current,
  };
}