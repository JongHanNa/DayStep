/**
 * CoachmarkProvider — 코치마크 전역 상태 관리
 *
 * 책임:
 *  - 활성 step 추적 + 다음/이전/건너뛰기/완료
 *  - <CoachmarkTarget>들이 자신의 measure 콜백을 등록하도록 허용
 *  - 종료 시 사용자 정의 콜백 실행 (예: hasSeenHomeOnboarding=true)
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import type {CoachmarkStep, MeasureFn} from './types';
import {CoachmarkOverlay} from './CoachmarkOverlay';

interface CoachmarkContextValue {
  active: boolean;
  currentStep: CoachmarkStep | null;
  currentIndex: number;
  totalSteps: number;
  start: (steps: CoachmarkStep[], onFinish?: () => void) => void;
  next: () => void;
  previous: () => void;
  skip: () => void;
  registerTarget: (id: string, measure: MeasureFn) => () => void;
  getTargetMeasure: (id: string) => MeasureFn | undefined;
}

const CoachmarkContext = createContext<CoachmarkContextValue | null>(null);

export function CoachmarkProvider({children}: {children: React.ReactNode}) {
  const [steps, setSteps] = useState<CoachmarkStep[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [active, setActive] = useState(false);
  const onFinishRef = useRef<(() => void) | null>(null);
  const targetsRef = useRef<Map<string, MeasureFn>>(new Map());

  const registerTarget = useCallback((id: string, measure: MeasureFn) => {
    targetsRef.current.set(id, measure);
    return () => {
      targetsRef.current.delete(id);
    };
  }, []);

  const getTargetMeasure = useCallback((id: string) => {
    return targetsRef.current.get(id);
  }, []);

  const start = useCallback((nextSteps: CoachmarkStep[], onFinish?: () => void) => {
    setSteps(nextSteps);
    setCurrentIndex(0);
    onFinishRef.current = onFinish ?? null;
    setActive(true);
  }, []);

  const finish = useCallback(() => {
    setActive(false);
    setSteps([]);
    setCurrentIndex(0);
    const cb = onFinishRef.current;
    onFinishRef.current = null;
    cb?.();
  }, []);

  const next = useCallback(() => {
    setCurrentIndex(idx => {
      if (idx + 1 >= steps.length) {
        // 마지막 step → 종료
        queueMicrotask(finish);
        return idx;
      }
      return idx + 1;
    });
  }, [steps.length, finish]);

  const previous = useCallback(() => {
    setCurrentIndex(idx => Math.max(0, idx - 1));
  }, []);

  const skip = useCallback(() => {
    finish();
  }, [finish]);

  const value = useMemo<CoachmarkContextValue>(
    () => ({
      active,
      currentStep: active && steps[currentIndex] ? steps[currentIndex] : null,
      currentIndex,
      totalSteps: steps.length,
      start,
      next,
      previous,
      skip,
      registerTarget,
      getTargetMeasure,
    }),
    [
      active,
      currentIndex,
      steps,
      start,
      next,
      previous,
      skip,
      registerTarget,
      getTargetMeasure,
    ],
  );

  return (
    <CoachmarkContext.Provider value={value}>
      {children}
      <CoachmarkOverlay />
    </CoachmarkContext.Provider>
  );
}

export function useCoachmark(): CoachmarkContextValue {
  const ctx = useContext(CoachmarkContext);
  if (!ctx) {
    throw new Error('useCoachmark must be used within CoachmarkProvider');
  }
  return ctx;
}
