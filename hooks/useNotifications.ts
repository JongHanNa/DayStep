import { useEffect, useState, useCallback } from 'react';
import { TimerType } from '@/types/pomodoro';

export type NotificationPermission = 'default' | 'granted' | 'denied';

interface NotificationState {
  permission: NotificationPermission;
  isSupported: boolean;
  isServiceWorkerRegistered: boolean;
}

interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  requireInteraction?: boolean;
  actions?: any[];
  data?: any;
}

export function useNotifications() {
  const [state, setState] = useState<NotificationState>({
    permission: 'default',
    isSupported: false,
    isServiceWorkerRegistered: false,
  });

  // Check if notifications are supported
  useEffect(() => {
    const isSupported = 'Notification' in window && 'serviceWorker' in navigator;
    const permission = isSupported ? Notification.permission : 'denied';

    setState(prev => ({
      ...prev,
      isSupported,
      permission: permission as NotificationPermission,
    }));
  }, []);

  // Register service worker
  useEffect(() => {
    if (!state.isSupported) return;

    const registerServiceWorker = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/pomodoro-sw.js', {
          scope: '/',
        });

        console.log('Pomodoro Service Worker registered:', registration);

        setState(prev => ({
          ...prev,
          isServiceWorkerRegistered: true,
        }));

        // Listen for messages from service worker
        navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);

        // Check if service worker is ready
        if (registration.active) {
          console.log('Pomodoro Service Worker is active');
        }

      } catch (error) {
        console.error('Failed to register Pomodoro Service Worker:', error);
      }
    };

    registerServiceWorker();

    return () => {
      navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
    };
  }, [state.isSupported]);

  // Handle messages from service worker
  const handleServiceWorkerMessage = useCallback((event: MessageEvent) => {
    const { type, permission } = event.data;

    switch (type) {
      case 'PERMISSION_STATUS':
        setState(prev => ({
          ...prev,
          permission: permission as NotificationPermission,
        }));
        break;
      case 'START_BREAK_TIMER':
        // Handle start break timer from notification action
        // This could trigger a callback to start the break timer
        console.log('Start break timer requested from notification');
        break;
      case 'START_POMODORO_TIMER':
        // Handle start pomodoro timer from notification action
        console.log('Start pomodoro timer requested from notification');
        break;
      case 'SYNC_POMODORO_DATA':
        // Handle data sync request
        console.log('Pomodoro data sync requested');
        break;
      default:
        console.log('Unknown service worker message:', type);
    }
  }, []);

  // Request notification permission
  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!state.isSupported) {
      return 'denied';
    }

    try {
      const permission = await Notification.requestPermission();
      
      setState(prev => ({
        ...prev,
        permission: permission as NotificationPermission,
      }));

      return permission as NotificationPermission;
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      return 'denied';
    }
  }, [state.isSupported]);

  // Send message to service worker
  const sendMessageToServiceWorker = useCallback(async (type: string, data?: any) => {
    if (!state.isServiceWorkerRegistered) {
      console.warn('Service worker not registered');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      
      if (registration.active) {
        registration.active.postMessage({ type, data });
      }
    } catch (error) {
      console.error('Failed to send message to service worker:', error);
    }
  }, [state.isServiceWorkerRegistered]);

  // Show notification through service worker
  const showNotification = useCallback(async (options: NotificationOptions) => {
    if (state.permission !== 'granted') {
      console.warn('Notification permission not granted');
      return;
    }

    await sendMessageToServiceWorker('SHOW_NOTIFICATION', options);
  }, [state.permission, sendMessageToServiceWorker]);

  // Show timer completed notification
  const showTimerCompletedNotification = useCallback(async (
    timerType: TimerType,
    duration: number,
    sessionId: string
  ) => {
    if (state.permission !== 'granted') {
      console.warn('Notification permission not granted');
      return;
    }

    await sendMessageToServiceWorker('TIMER_COMPLETED', {
      timerType,
      duration,
      sessionId,
    });
  }, [state.permission, sendMessageToServiceWorker]);

  // Clear all notifications
  const clearNotifications = useCallback(async () => {
    await sendMessageToServiceWorker('CLEAR_NOTIFICATIONS');
  }, [sendMessageToServiceWorker]);

  // Test notification
  const testNotification = useCallback(async () => {
    if (state.permission !== 'granted') {
      const permission = await requestPermission();
      if (permission !== 'granted') {
        return false;
      }
    }

    try {
      await showNotification({
        title: '🍅 테스트 알림',
        body: '포모도로 알림이 정상적으로 작동합니다!',
        tag: 'test-notification',
        requireInteraction: false,
      });
      return true;
    } catch (error) {
      console.error('Failed to show test notification:', error);
      return false;
    }
  }, [state.permission, requestPermission, showNotification]);

  // Check if notifications are enabled
  const isEnabled = useCallback((): boolean => {
    return state.isSupported && state.permission === 'granted';
  }, [state.isSupported, state.permission]);

  // Get permission status text
  const getPermissionStatusText = useCallback((): string => {
    switch (state.permission) {
      case 'granted':
        return '허용됨';
      case 'denied':
        return '차단됨';
      default:
        return '미설정';
    }
  }, [state.permission]);

  return {
    // State
    state,
    isEnabled: isEnabled(),
    permissionStatusText: getPermissionStatusText(),

    // Actions
    requestPermission,
    showNotification,
    showTimerCompletedNotification,
    clearNotifications,
    testNotification,

    // Utilities
    sendMessageToServiceWorker,
  };
}