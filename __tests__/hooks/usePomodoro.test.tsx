import { renderHook, act, waitFor } from '@testing-library/react';
import { usePomodoro } from '@/hooks/usePomodoro';

// Mock Worker
class MockWorker {
  private messageHandlers: ((event: MessageEvent) => void)[] = [];
  private errorHandlers: ((error: ErrorEvent) => void)[] = [];

  constructor(public url: string) {
    // Auto-send ready message immediately
    setTimeout(() => {
      this.sendMessage('WORKER_READY', {
        timestamp: Date.now(),
        defaultDurations: {},
        timerTypes: {}
      });
    }, 1);
  }

  postMessage(data: any) {
    // Simulate worker message handling
    setTimeout(() => {
      const { type, payload } = data;
      
      switch (type) {
        case 'START_TIMER':
          this.sendMessage('TIMER_STARTED', {
            duration: payload.duration,
            timerType: payload.timerType,
            sessionId: payload.sessionId,
          });
          break;
        case 'PAUSE_TIMER':
          this.sendMessage('TIMER_PAUSED', {
            remainingTime: 1000,
          });
          break;
        case 'RESUME_TIMER':
          this.sendMessage('TIMER_RESUMED', {
            remainingTime: 1000,
          });
          break;
        case 'STOP_TIMER':
          this.sendMessage('TIMER_STOPPED', {});
          break;
        case 'GET_STATUS':
          this.sendMessage('TIMER_STATUS', {
            isRunning: false,
            isPaused: false,
            remainingTime: 0,
            elapsed: 0,
            progress: 0,
            duration: 0,
          });
          break;
      }
    }, 5);
  }

  private sendMessage(type: string, payload: any) {
    const event = new MessageEvent('message', {
      data: { type, payload }
    });
    this.messageHandlers.forEach(handler => handler(event));
  }

  addEventListener(type: string, handler: any) {
    if (type === 'message') {
      this.messageHandlers.push(handler);
    } else if (type === 'error') {
      this.errorHandlers.push(handler);
    }
  }

  removeEventListener(type: string, handler: any) {
    if (type === 'message') {
      this.messageHandlers = this.messageHandlers.filter(h => h !== handler);
    } else if (type === 'error') {
      this.errorHandlers = this.errorHandlers.filter(h => h !== handler);
    }
  }

  set onmessage(handler: (event: MessageEvent) => void) {
    this.messageHandlers.push(handler);
  }

  set onerror(handler: (error: ErrorEvent) => void) {
    this.errorHandlers.push(handler);
  }

  terminate() {
    this.messageHandlers = [];
    this.errorHandlers = [];
  }
}

// Mock global Worker
Object.defineProperty(global, 'Worker', {
  writable: true,
  value: MockWorker,
});

// Mock crypto.randomUUID
Object.defineProperty(global.crypto, 'randomUUID', {
  writable: true,
  value: () => 'test-uuid-123',
});

describe('usePomodoro', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => usePomodoro());

    expect(result.current.timerState).toEqual({
      isRunning: false,
      isPaused: false,
      remainingTime: 0,
      elapsed: 0,
      progress: 0,
      duration: 0,
      timerType: 'POMODORO',
      sessionId: null,
      status: 'idle',
    });
    expect(result.current.isWorkerReady).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.isActive).toBe(false);
  });

  it('should become ready when worker is initialized', async () => {
    const { result } = renderHook(() => usePomodoro());

    await waitFor(() => {
      expect(result.current.isWorkerReady).toBe(true);
    });
  });

  it('should format time correctly', () => {
    const { result } = renderHook(() => usePomodoro());

    expect(result.current.formatTime(0)).toBe('00:00');
    expect(result.current.formatTime(60000)).toBe('01:00');
    expect(result.current.formatTime(90000)).toBe('01:30');
    expect(result.current.formatTime(25 * 60 * 1000)).toBe('25:00');
    expect(result.current.formatTime(25 * 60 * 1000 + 30000)).toBe('25:30');
  });

  it('should provide timer control functions', async () => {
    const { result } = renderHook(() => usePomodoro());

    await waitFor(() => {
      expect(result.current.isWorkerReady).toBe(true);
    });

    // Check that all control functions are available
    expect(typeof result.current.startTimer).toBe('function');
    expect(typeof result.current.pauseTimer).toBe('function');
    expect(typeof result.current.resumeTimer).toBe('function');
    expect(typeof result.current.stopTimer).toBe('function');
    expect(typeof result.current.getStatus).toBe('function');
  });

  it('should calculate isActive correctly based on state', () => {
    const { result } = renderHook(() => usePomodoro());

    // Initially not active
    expect(result.current.isActive).toBe(false);

    // Mock running state
    act(() => {
      const mockWorker = new MockWorker('/pomodoroWorker.js');
      if (mockWorker.onmessage) {
        mockWorker.onmessage({
          data: {
            type: 'TIMER_STARTED',
            payload: {
              duration: 25 * 60 * 1000,
              timerType: 'POMODORO',
              sessionId: 'test-session',
            }
          }
        } as MessageEvent);
      }
    });

    expect(result.current.isActive).toBe(true);
  });

  it('should handle Web Worker not supported', () => {
    // Temporarily remove Worker
    const originalWorker = global.Worker;
    // @ts-ignore
    delete global.Worker;

    const { result } = renderHook(() => usePomodoro());

    expect(result.current.error).toBe('Web Workers are not supported in this browser');
    expect(result.current.isWorkerReady).toBe(false);

    // Restore Worker
    global.Worker = originalWorker;
  });
});