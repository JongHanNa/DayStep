/**
 * useBedtimeMonitor — 포그라운드 취침 시간 감지 훅
 * 30초 간격으로 현재 시간 vs sleepGoalTime 비교 → 모달 표시
 * 취침 시간 ~ 기상 시간 윈도우 내 앱 진입 시 BedtimeModal 표시
 */
import {useCallback, useEffect, useRef, useState} from 'react';
import {useSleepStore} from '@/stores/sleepStore';
import {storage} from '@/lib/mmkv';
import {format} from 'date-fns';

const SNOOZE_MINUTES = 10;
const MMKV_SKIP_KEY = 'bedtime-skip-date';

export function useBedtimeMonitor() {
  const {autoSleepEnabled, sleepGoalTime, wakeGoalTime, sessionState} = useSleepStore();
  const [showBedtimeModal, setShowBedtimeModal] = useState(false);
  const [isSkippedTonight, setIsSkippedTonight] = useState(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    return storage.getString(MMKV_SKIP_KEY) === today;
  });
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

      // 취침 시간 이후 ~ 기상 시간까지 윈도우 내에 있으면 모달 표시
      // 자정 넘김(예: 23:30 goal, 0:15 now) 처리 포함
      const [wakeH, wakeM] = wakeGoalTime.split(':').map(Number);
      const wakeMinutes = wakeH * 60 + wakeM;
      const sleepDuration = (wakeMinutes - goalMinutes + 1440) % 1440;
      const diff = (nowMinutes - goalMinutes + 1440) % 1440;
      if (diff >= 0 && diff <= sleepDuration) {
        setShowBedtimeModal(true);
      }
    };

    // 즉시 1회 체크 + 30초 간격
    check();
    const interval = setInterval(check, 30_000);
    return () => clearInterval(interval);
  }, [autoSleepEnabled, sleepGoalTime, wakeGoalTime, sessionState.status]);

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
    setIsSkippedTonight(true);
    setShowBedtimeModal(false);
  }, []);

  const cancelSkipTonight = useCallback(() => {
    storage.remove(MMKV_SKIP_KEY);
    setIsSkippedTonight(false);
  }, []);

  return {showBedtimeModal, isSkippedTonight, onStartSleep, onSnooze, onSkipTonight, cancelSkipTonight};
}
