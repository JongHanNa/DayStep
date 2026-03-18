/**
 * useBedtimeMonitor — 포그라운드 취침 시간 감지 훅
 * 60초 간격으로 현재 시간 vs sleepGoalTime 비교 → 모달 표시
 */
import {useCallback, useEffect, useRef, useState} from 'react';
import {useSleepStore} from '@/stores/sleepStore';
import {storage} from '@/lib/mmkv';
import {format} from 'date-fns';

const SNOOZE_MINUTES = 10;
const MMKV_SKIP_KEY = 'bedtime-skip-date';

export function useBedtimeMonitor() {
  const {autoSleepEnabled, sleepGoalTime, sessionState} = useSleepStore();
  const [showBedtimeModal, setShowBedtimeModal] = useState(false);
  const snoozeUntilRef = useRef<number>(0);

  useEffect(() => {
    if (!autoSleepEnabled) return;

    const check = () => {
      // 이미 세션 진행 중이면 스킵
      if (sessionState.status !== 'idle') return;

      // 오늘 건너뛰기했으면 스킵
      const today = format(new Date(), 'yyyy-MM-dd');
      const skipDate = storage.getString(MMKV_SKIP_KEY);
      if (skipDate === today) return;

      // 스누즈 대기 중이면 스킵
      if (Date.now() < snoozeUntilRef.current) return;

      // 현재 시간과 목표 취침 시간 비교 (분 단위)
      const now = new Date();
      const [goalH, goalM] = sleepGoalTime.split(':').map(Number);
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      const goalMinutes = goalH * 60 + goalM;

      // 정확히 같은 분이거나, 1분 이내 차이면 트리거
      if (Math.abs(nowMinutes - goalMinutes) <= 1) {
        setShowBedtimeModal(true);
      }
    };

    // 즉시 1회 체크 + 60초 간격
    check();
    const interval = setInterval(check, 60_000);
    return () => clearInterval(interval);
  }, [autoSleepEnabled, sleepGoalTime, sessionState.status]);

  const onStartSleep = useCallback(() => {
    setShowBedtimeModal(false);
  }, []);

  const onSnooze = useCallback(() => {
    snoozeUntilRef.current = Date.now() + SNOOZE_MINUTES * 60 * 1000;
    setShowBedtimeModal(false);
  }, []);

  const onSkipTonight = useCallback(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    storage.set(MMKV_SKIP_KEY, today);
    setShowBedtimeModal(false);
  }, []);

  return {showBedtimeModal, onStartSleep, onSnooze, onSkipTonight};
}
