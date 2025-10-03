'use client';

import React, { useEffect, ReactNode } from 'react';
import { useMotivationStore } from '@/state/stores/motivationStore';

interface MotivationProviderProps {
  children: ReactNode;
}

/**
 * MotivationProvider - 앱 시작 시점에 MotivationStore를 초기화
 *
 * 역할:
 * 1. 앱 로딩 시 동기부여 메시지 템플릿 및 태그 로드
 * 2. DB에서 커스텀 메시지 로드
 * 3. DB에서 todo-동기부여 메시지 연결 데이터 로드
 *
 * 이를 통해 타임라인 화면에서 처음부터 동기부여 메시지가 표시됨
 */
export const MotivationProvider: React.FC<MotivationProviderProps> = ({ children }) => {
  const { initializeStore } = useMotivationStore();

  useEffect(() => {
    // 앱 시작 시 MotivationStore 초기화
    console.log('🎯 MotivationProvider: 앱 초기화 시점에 MotivationStore 초기화 시작');
    initializeStore();
  }, [initializeStore]);

  return <>{children}</>;
};

export default MotivationProvider;