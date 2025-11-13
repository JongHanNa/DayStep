'use client';

import { useState, useEffect } from 'react';

type ScrollDirection = 'up' | 'down' | null;

/**
 * 스크롤 방향을 감지하는 Hook
 * @param threshold 방향 변경으로 인식할 최소 스크롤 거리 (기본 10px)
 * @returns 현재 스크롤 방향 ('up' | 'down' | null)
 */
export function useScrollDirection(threshold = 10): ScrollDirection {
  const [scrollDirection, setScrollDirection] = useState<ScrollDirection>(null);

  useEffect(() => {
    let lastScrollY = window.scrollY;
    let ticking = false;

    const updateScrollDirection = () => {
      const scrollY = window.scrollY;
      const diff = scrollY - lastScrollY;

      if (Math.abs(diff) < threshold) {
        ticking = false;
        return;
      }

      setScrollDirection(diff > 0 ? 'down' : 'up');
      lastScrollY = scrollY > 0 ? scrollY : 0;
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(updateScrollDirection);
        ticking = true;
      }
    };

    window.addEventListener('scroll', onScroll);

    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold]);

  return scrollDirection;
}
