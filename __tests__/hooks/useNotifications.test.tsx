import { renderHook, act, waitFor } from '@testing-library/react';
import { useNotifications } from '@/hooks/useNotifications';

// Mock ServiceWorker APIs
const mockServiceWorker = {
  register: jest.fn(),
  ready: Promise.resolve({
    active: {
      postMessage: jest.fn(),
    },
  }),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};

const mockNotification = {
  requestPermission: jest.fn(),
  permission: 'default',
};

// Mock global objects
Object.defineProperty(global, 'navigator', {
  writable: true,
  value: {
    serviceWorker: mockServiceWorker,
  },
});

Object.defineProperty(global, 'Notification', {
  writable: true,
  value: mockNotification,
});

Object.defineProperty(global, 'window', {
  writable: true,
  value: {
    Notification: mockNotification,
  },
});

describe('useNotifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset mock implementations
    mockServiceWorker.register.mockResolvedValue({
      active: { postMessage: jest.fn() },
    });
    mockNotification.requestPermission.mockResolvedValue('granted');
    mockNotification.permission = 'default';
  });

  it('should initialize with correct default state', () => {
    const { result } = renderHook(() => useNotifications());

    expect(result.current.state).toEqual({
      permission: 'default',
      isSupported: true,
      isServiceWorkerRegistered: false,
    });
    expect(result.current.isEnabled).toBe(false);
    expect(result.current.permissionStatusText).toBe('미설정');
  });

  it('should detect when notifications are not supported', () => {
    // Temporarily remove Notification from window
    const originalNotification = global.window.Notification;
    delete (global.window as any).Notification;

    const { result } = renderHook(() => useNotifications());

    expect(result.current.state.isSupported).toBe(false);
    expect(result.current.isEnabled).toBe(false);

    // Restore
    global.window.Notification = originalNotification;
  });

  it('should register service worker on mount', async () => {
    renderHook(() => useNotifications());

    await waitFor(() => {
      expect(mockServiceWorker.register).toHaveBeenCalledWith('/pomodoro-sw.js', {
        scope: '/',
      });
    });
  });

  it('should handle service worker registration failure', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    mockServiceWorker.register.mockRejectedValue(new Error('Registration failed'));

    renderHook(() => useNotifications());

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to register Pomodoro Service Worker:',
        expect.any(Error)
      );
    });

    consoleErrorSpy.mockRestore();
  });

  it('should request notification permission successfully', async () => {
    const { result } = renderHook(() => useNotifications());

    let permission: string | undefined;

    await act(async () => {
      permission = await result.current.requestPermission();
    });

    expect(permission).toBe('granted');
    expect(mockNotification.requestPermission).toHaveBeenCalled();
  });

  it('should handle permission request failure', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    mockNotification.requestPermission.mockRejectedValue(new Error('Permission failed'));

    const { result } = renderHook(() => useNotifications());

    let permission: string | undefined;

    await act(async () => {
      permission = await result.current.requestPermission();
    });

    expect(permission).toBe('denied');
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to request notification permission:',
      expect.any(Error)
    );

    consoleErrorSpy.mockRestore();
  });

  it('should show notification when permission is granted', async () => {
    mockNotification.permission = 'granted';

    const { result } = renderHook(() => useNotifications());

    // Wait for service worker registration
    await waitFor(() => {
      expect(result.current.state.isServiceWorkerRegistered).toBe(true);
    });

    await act(async () => {
      await result.current.showNotification({
        title: 'Test',
        body: 'Test notification',
      });
    });

    const registration = await mockServiceWorker.ready;
    expect(registration.active.postMessage).toHaveBeenCalledWith({
      type: 'SHOW_NOTIFICATION',
      data: {
        title: 'Test',
        body: 'Test notification',
      },
    });
  });

  it('should not show notification when permission is denied', async () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    mockNotification.permission = 'denied';

    const { result } = renderHook(() => useNotifications());

    await act(async () => {
      await result.current.showNotification({
        title: 'Test',
        body: 'Test notification',
      });
    });

    expect(consoleWarnSpy).toHaveBeenCalledWith('Notification permission not granted');
    
    consoleWarnSpy.mockRestore();
  });

  it('should show timer completed notification', async () => {
    mockNotification.permission = 'granted';

    const { result } = renderHook(() => useNotifications());

    // Wait for service worker registration
    await waitFor(() => {
      expect(result.current.state.isServiceWorkerRegistered).toBe(true);
    });

    await act(async () => {
      await result.current.showTimerCompletedNotification('POMODORO', 1500000, 'session-1');
    });

    const registration = await mockServiceWorker.ready;
    expect(registration.active.postMessage).toHaveBeenCalledWith({
      type: 'TIMER_COMPLETED',
      data: {
        timerType: 'POMODORO',
        duration: 1500000,
        sessionId: 'session-1',
      },
    });
  });

  it('should clear notifications', async () => {
    const { result } = renderHook(() => useNotifications());

    // Wait for service worker registration
    await waitFor(() => {
      expect(result.current.state.isServiceWorkerRegistered).toBe(true);
    });

    await act(async () => {
      await result.current.clearNotifications();
    });

    const registration = await mockServiceWorker.ready;
    expect(registration.active.postMessage).toHaveBeenCalledWith({
      type: 'CLEAR_NOTIFICATIONS',
      data: undefined,
    });
  });

  it('should test notification successfully', async () => {
    mockNotification.permission = 'granted';

    const { result } = renderHook(() => useNotifications());

    // Wait for service worker registration
    await waitFor(() => {
      expect(result.current.state.isServiceWorkerRegistered).toBe(true);
    });

    let testResult: boolean | undefined;

    await act(async () => {
      testResult = await result.current.testNotification();
    });

    expect(testResult).toBe(true);
  });

  it('should request permission before testing notification if not granted', async () => {
    mockNotification.permission = 'default';

    const { result } = renderHook(() => useNotifications());

    // Wait for service worker registration
    await waitFor(() => {
      expect(result.current.state.isServiceWorkerRegistered).toBe(true);
    });

    let testResult: boolean | undefined;

    await act(async () => {
      testResult = await result.current.testNotification();
    });

    expect(mockNotification.requestPermission).toHaveBeenCalled();
    expect(testResult).toBe(true);
  });

  it('should return correct permission status text', () => {
    const { result, rerender } = renderHook(() => useNotifications());

    // Default
    expect(result.current.permissionStatusText).toBe('미설정');

    // Granted
    mockNotification.permission = 'granted';
    rerender();
    expect(result.current.permissionStatusText).toBe('허용됨');

    // Denied
    mockNotification.permission = 'denied';
    rerender();
    expect(result.current.permissionStatusText).toBe('차단됨');
  });

  it('should handle service worker messages', async () => {
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    
    renderHook(() => useNotifications());

    // Simulate service worker message
    const messageEvent = {
      data: {
        type: 'START_BREAK_TIMER',
        data: { sessionId: 'test' },
      },
    };

    // Find the message event listener and call it
    const messageListener = mockServiceWorker.addEventListener.mock.calls.find(
      call => call[0] === 'message'
    )?.[1];

    if (messageListener) {
      messageListener(messageEvent);
    }

    expect(consoleLogSpy).toHaveBeenCalledWith('Start break timer requested from notification');

    consoleLogSpy.mockRestore();
  });

  it('should handle unknown service worker messages', async () => {
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    
    renderHook(() => useNotifications());

    // Simulate unknown message
    const messageEvent = {
      data: {
        type: 'UNKNOWN_MESSAGE',
        data: {},
      },
    };

    // Find the message event listener and call it
    const messageListener = mockServiceWorker.addEventListener.mock.calls.find(
      call => call[0] === 'message'
    )?.[1];

    if (messageListener) {
      messageListener(messageEvent);
    }

    expect(consoleLogSpy).toHaveBeenCalledWith('Unknown service worker message:', 'UNKNOWN_MESSAGE');

    consoleLogSpy.mockRestore();
  });
});