'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useADHDStore } from '@/state/stores/adhdStore';
import ADHDInterruptModal from './ADHDInterruptModal';
import GraphView from '@/components/graph/GraphView';

interface OrganizeModeWrapperProps {
  /** 정리 모드 종료 시 콜백 */
  onExit: () => void;
}

/** 기본 정리 모드 시간 (초) - 5분 */
const DEFAULT_ORGANIZE_DURATION = 5 * 60;

/** 인터럽트 트리거 조건 */
const INTERRUPT_TODO_THRESHOLD = 3; // 연속 할일 추가 수

/**
 * 정리 모드 래퍼 컴포넌트
 *
 * - 타이머는 AppHeader에서 표시
 * - 기존 GraphView를 래핑
 * - 인터럽트 조건 감지
 */
export default function OrganizeModeWrapper({ onExit }: OrganizeModeWrapperProps) {
  const { awakeningSentence, organizeMode, resetOrganizeMode } = useADHDStore();

  const [showInterrupt, setShowInterrupt] = useState(false);
  const [interruptDismissCount, setInterruptDismissCount] = useState(0);
  const timerFiredRef = useRef(false);

  // 인터럽트 조건 체크 (연속 할일 추가)
  useEffect(() => {
    if (organizeMode.consecutiveTodoAdds >= INTERRUPT_TODO_THRESHOLD) {
      setShowInterrupt(true);
    }
  }, [organizeMode.consecutiveTodoAdds]);

  // 타이머 종료 감지 (startTime 기반)
  useEffect(() => {
    if (!organizeMode.startTime || timerFiredRef.current) return;

    const checkTimer = () => {
      const elapsed = Math.floor((Date.now() - new Date(organizeMode.startTime!).getTime()) / 1000);
      if (elapsed >= DEFAULT_ORGANIZE_DURATION && !timerFiredRef.current) {
        timerFiredRef.current = true;
        setShowInterrupt(true);
      }
    };

    const interval = setInterval(checkTimer, 1000);
    return () => clearInterval(interval);
  }, [organizeMode.startTime]);

  // 인터럽트 - "하나만 하고 올게"
  const handleInterruptExecute = useCallback(() => {
    setShowInterrupt(false);
    timerFiredRef.current = false;
    resetOrganizeMode();
    onExit();
  }, [resetOrganizeMode, onExit]);

  // 인터럽트 - "조금만 더 정리할게"
  const handleInterruptDismiss = useCallback(() => {
    setShowInterrupt(false);
    setInterruptDismissCount((prev) => prev + 1);
    timerFiredRef.current = false;
    // 연속 할일 추가 카운터 리셋 + 타이머 리셋
    useADHDStore.getState().resetOrganizeMode();
    // startTime 다시 설정 (타이머 재시작)
    useADHDStore.getState().enterOrganizeMode();
  }, []);

  return (
    <div className="relative min-h-screen safe-area-top">
      {/* GraphView (기존 정리 화면) */}
      <GraphView />

      {/* 인터럽트 모달 */}
      <ADHDInterruptModal
        isOpen={showInterrupt}
        awakeningSentence={awakeningSentence}
        dismissCount={interruptDismissCount}
        onExecute={handleInterruptExecute}
        onDismiss={handleInterruptDismiss}
      />
    </div>
  );
}
