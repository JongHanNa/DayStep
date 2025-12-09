'use client';

import { useState, useEffect, useCallback } from 'react';
import { useADHDModeStore } from '@/state/stores/adhdModeStore';
import OrganizeModeTimer from './OrganizeModeTimer';
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
 * - 5분 타이머 자동 시작
 * - 상단에 남은 시간 표시
 * - 기존 GraphView를 래핑
 * - 인터럽트 조건 감지
 */
export default function OrganizeModeWrapper({ onExit }: OrganizeModeWrapperProps) {
  const { awakeningSentence, organizeMode, recordTodoAddition, resetOrganizeMode } = useADHDModeStore();

  const [showInterrupt, setShowInterrupt] = useState(false);
  const [interruptDismissCount, setInterruptDismissCount] = useState(0);

  // 인터럽트 조건 체크
  useEffect(() => {
    // 연속 할일 추가 감지
    if (organizeMode.consecutiveTodoAdds >= INTERRUPT_TODO_THRESHOLD) {
      setShowInterrupt(true);
    }
  }, [organizeMode.consecutiveTodoAdds]);

  // 타이머 종료 시
  const handleTimeUp = useCallback(() => {
    setShowInterrupt(true);
  }, []);

  // 정리 모드 종료 (진입 화면으로)
  const handleExitOrganize = useCallback(() => {
    resetOrganizeMode();
    onExit();
  }, [resetOrganizeMode, onExit]);

  // 인터럽트 - "하나만 하고 올게"
  const handleInterruptExecute = useCallback(() => {
    setShowInterrupt(false);
    resetOrganizeMode();
    onExit(); // 진입 화면으로 가서 실행 모드 선택 가능
  }, [resetOrganizeMode, onExit]);

  // 인터럽트 - "조금만 더 정리할게"
  const handleInterruptDismiss = useCallback(() => {
    setShowInterrupt(false);
    setInterruptDismissCount((prev) => prev + 1);
    // 연속 할일 추가 카운터 리셋
    useADHDModeStore.getState().resetOrganizeMode();
  }, []);

  return (
    <div className="relative min-h-screen">
      {/* 타이머 */}
      <OrganizeModeTimer
        durationSeconds={DEFAULT_ORGANIZE_DURATION}
        onTimeUp={handleTimeUp}
        awakeningSentence={awakeningSentence}
        onClose={handleExitOrganize}
      />

      {/* GraphView (기존 정리 화면) - 타이머 높이만큼 패딩 */}
      <div className="pt-16">
        <GraphView />
      </div>

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
