'use client';

import { useState, useEffect } from 'react';

/**
 * 전역 현재 시간 관리 훅
 * 모든 컴포넌트에서 동일한 시간 상태를 공유하여 중복을 제거
 */
export const useCurrentTime = () => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    // 1초마다 현재 시간 업데이트
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return currentTime;
};