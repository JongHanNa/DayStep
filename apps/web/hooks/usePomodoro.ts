import { useEffect, useRef, useState, useCallback } from 'react';
import type {
  TimerState,
  TimerType,
  WorkerMessage,
  TimerStartPayload,
  TimerTickPayload,
  TimerStatusPayload,
  WorkerErrorPayload,
} from '@/types/pomodoro';

const DEFAULT_TIMER_STATE: TimerState = {
  isRunning: false,
  isPaused: false,
  remainingTime: 0,
  elapsed: 0,
  progress: 0,
  duration: 0,
  timerType: 'POMODORO',
  sessionId: null,
  status: 'idle',
};

export function usePomodoro() {
  const workerRef = useRef<Worker | null>(null);
  const [timerState, setTimerState] = useState<TimerState>(DEFAULT_TIMER_STATE);
  const [isWorkerReady, setIsWorkerReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize Web Worker
  useEffect(() => {
    // Check if Web Workers are supported
    if (typeof Worker === 'undefined') {
      setError('Web Workers are not supported in this browser');
      return;
    }

    try {
      workerRef.current = new Worker('/pomodoroWorker.js');

      // Handle messages from worker
      workerRef.current.onmessage = (event: MessageEvent<WorkerMessage>) => {
        const { type, payload } = event.data;

        switch (type) {
          case 'WORKER_READY':
            setIsWorkerReady(true);
            setError(null);
            break;

          case 'TIMER_STARTED':
            setTimerState(prev => ({
              ...prev,
              isRunning: true,
              isPaused: false,
              status: 'running',
              duration: payload.duration,
              timerType: payload.timerType,
              sessionId: payload.sessionId,
            }));
            break;

          case 'TIMER_TICK':
            const tickPayload = payload as TimerTickPayload;
            setTimerState(prev => ({
              ...prev,
              remainingTime: tickPayload.remainingTime,
              elapsed: tickPayload.elapsed,
              progress: Math.min(tickPayload.progress, 1),
              duration: tickPayload.duration,  // DB 기준 총 시간 동기화
            }));
            break;

          case 'TIMER_PAUSED':
            setTimerState(prev => ({
              ...prev,
              isPaused: true,
              status: 'paused',
              remainingTime: payload.remainingTime,
              elapsed: payload.elapsed,
              duration: payload.duration,
            }));
            break;

          case 'TIMER_RESUMED':
            setTimerState(prev => ({
              ...prev,
              isPaused: false,
              status: 'running',
              remainingTime: payload.remainingTime,
              elapsed: payload.elapsed,
              duration: payload.duration,
            }));
            break;

          case 'TIMER_STOPPED':
            setTimerState(DEFAULT_TIMER_STATE);
            break;

          case 'TIMER_COMPLETED':
            setTimerState(prev => ({
              ...prev,
              isRunning: false,
              isPaused: false,
              status: 'completed',
              progress: 1,
              remainingTime: 0,
            }));
            break;

          case 'TIMER_STATUS':
            const statusPayload = payload as TimerStatusPayload;
            setTimerState(prev => ({
              ...prev,
              ...statusPayload,
              status: statusPayload.isRunning
                ? (statusPayload.isPaused ? 'paused' : 'running')
                : 'idle',
            }));
            break;

          case 'TIME_ADJUSTED':
            setTimerState(prev => ({
              ...prev,
              duration: payload.duration,
              remainingTime: payload.remainingTime,
              elapsed: payload.elapsed,
            }));
            break;

          case 'WORKER_ERROR':
            const errorPayload = payload as WorkerErrorPayload;
            setError(`Worker error: ${errorPayload.message}`);
            break;

          default:
            // Unknown worker message type
        }
      };

      // Handle worker errors
      workerRef.current.onerror = (error) => {
        setError(`Worker error: ${error.message}`);
        setIsWorkerReady(false);
      };

    } catch (err) {
      setError(`Failed to initialize worker: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }

    // Cleanup on unmount
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  // Send message to worker
  const sendWorkerMessage = useCallback((type: string, payload?: any) => {
    if (!workerRef.current || !isWorkerReady) {
      // Worker not ready
      return;
    }

    workerRef.current.postMessage({ type, payload });
  }, [isWorkerReady]);

  // Timer control functions
  const startTimer = useCallback((
    duration: number,
    timerType: TimerType = 'POMODORO',
    sessionId?: string,
    dbStartTime?: number  // 세션 복원용 DB 시작 시간 (ms timestamp)
  ) => {
    const payload: TimerStartPayload = {
      duration,
      timerType,
      sessionId: sessionId || crypto.randomUUID(),
      startTime: dbStartTime,  // 세션 복원 시에만 전달
    };
    sendWorkerMessage('START_TIMER', payload);
  }, [sendWorkerMessage]);

  const pauseTimer = useCallback(() => {
    sendWorkerMessage('PAUSE_TIMER');
  }, [sendWorkerMessage]);

  const resumeTimer = useCallback(() => {
    sendWorkerMessage('RESUME_TIMER');
  }, [sendWorkerMessage]);

  const stopTimer = useCallback(() => {
    sendWorkerMessage('STOP_TIMER');
  }, [sendWorkerMessage]);

  const getStatus = useCallback(() => {
    sendWorkerMessage('GET_STATUS');
  }, [sendWorkerMessage]);

  const adjustTime = useCallback((deltaMs: number) => {
    sendWorkerMessage('ADJUST_TIME', { delta: deltaMs });
  }, [sendWorkerMessage]);

  // Helper functions
  const formatTime = useCallback((timeInMs: number): string => {
    const minutes = Math.floor(timeInMs / 60000);
    const seconds = Math.floor((timeInMs % 60000) / 1000);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  const isActive = timerState.isRunning && !timerState.isPaused;

  return {
    // State
    timerState,
    isWorkerReady,
    error,
    isActive,

    // Actions
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    getStatus,
    adjustTime,

    // Utilities
    formatTime,
  };
}