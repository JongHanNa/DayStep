/**
 * 푸시 알림 관리 훅
 * 초기화, 권한 관리, 알림 전송 기능 제공
 */

import { useEffect, useState, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { 
  initPushNotifications, 
  cleanupPushNotifications,
  getCurrentFCMToken,
  refreshFCMToken
} from '@/features/push-notifications/init';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/state/stores/authStore';

export interface NotificationPreferences {
  todo_reminders: boolean;
  weekly_summaries: boolean;
  daily_digest: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  timezone: string;
}

export interface LocalNotification {
  id: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  received_at: string;
  read: boolean;
}

export const usePushNotifications = () => {
  const { user } = useAuthStore();
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [localNotifications, setLocalNotifications] = useState<LocalNotification[]>([]);

  /**
   * 푸시 알림 초기화
   */
  const initializeNotifications = useCallback(async () => {
    if (!user || !Capacitor.isNativePlatform()) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const success = await initPushNotifications();
      setIsInitialized(success);
      setHasPermission(success);

      if (success) {
        // FCM 토큰 가져오기
        const token = await getCurrentFCMToken();
        setFcmToken(token);
        
        // 알림 설정 로드
        await loadNotificationPreferences();
        
        // 로컬 알림 로드
        loadLocalNotifications();
      }
    } catch (err) {
      console.error('Failed to initialize push notifications:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  /**
   * 알림 설정 로드
   */
  const loadNotificationPreferences = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await (supabase as any)
        .from('notification_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // Not found 오류가 아닌 경우
        throw error;
      }

      setPreferences(data || {
        todo_reminders: true,
        weekly_summaries: true,
        daily_digest: false,
        quiet_hours_start: '22:00',
        quiet_hours_end: '08:00',
        timezone: 'Asia/Seoul'
      });
    } catch (err) {
      console.error('Failed to load notification preferences:', err);
    }
  }, [user]);

  /**
   * 알림 설정 업데이트
   */
  const updateNotificationPreferences = useCallback(async (
    newPreferences: Partial<NotificationPreferences>
  ) => {
    if (!user) return;

    try {
      const { error } = await (supabase as any)
        .from('notification_settings')
        .upsert({
          user_id: user.id,
          ...newPreferences,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      setPreferences(prev => prev ? { ...prev, ...newPreferences } : null);
    } catch (err) {
      console.error('Failed to update notification preferences:', err);
      throw err;
    }
  }, [user]);

  /**
   * 로컬 알림 로드
   */
  const loadLocalNotifications = useCallback(() => {
    try {
      const stored = localStorage.getItem('local_notifications');
      if (stored) {
        const notifications = JSON.parse(stored);
        setLocalNotifications(notifications);
      }
    } catch (err) {
      console.error('Failed to load local notifications:', err);
    }
  }, []);

  /**
   * 알림 읽음 처리
   */
  const markNotificationAsRead = useCallback(async (notificationId: string) => {
    try {
      // Supabase에서 읽음 처리
      const { error } = await (supabase as any)
        .from('notification_logs')
        .update({ 
          read: true, 
          read_at: new Date().toISOString() 
        })
        .eq('id', notificationId);

      if (error) {
        console.error('Failed to mark notification as read in Supabase:', error);
      }

      // 로컬에서도 읽음 처리
      const existingNotifications = JSON.parse(
        localStorage.getItem('local_notifications') || '[]'
      );
      
      const updatedNotifications = existingNotifications.map((notif: LocalNotification) =>
        notif.id === notificationId ? { ...notif, read: true } : notif
      );
      
      localStorage.setItem('local_notifications', JSON.stringify(updatedNotifications));
      setLocalNotifications(updatedNotifications);
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  }, []);

  /**
   * 모든 알림 읽음 처리
   */
  const markAllNotificationsAsRead = useCallback(async () => {
    if (!user) return;

    try {
      // Supabase에서 모든 읽지 않은 알림 읽음 처리
      const { error } = await (supabase as any)
        .from('notification_logs')
        .update({ 
          read: true, 
          read_at: new Date().toISOString() 
        })
        .eq('user_id', user.id)
        .eq('read', false);

      if (error) {
        console.error('Failed to mark all notifications as read:', error);
      }

      // 로컬에서도 모든 알림 읽음 처리
      const existingNotifications = JSON.parse(
        localStorage.getItem('local_notifications') || '[]'
      );
      
      const updatedNotifications = existingNotifications.map((notif: LocalNotification) => ({
        ...notif,
        read: true
      }));
      
      localStorage.setItem('local_notifications', JSON.stringify(updatedNotifications));
      setLocalNotifications(updatedNotifications);
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  }, [user]);

  /**
   * FCM 토큰 새로고침
   */
  const refreshToken = useCallback(async () => {
    setIsLoading(true);
    try {
      const newToken = await refreshFCMToken();
      setFcmToken(newToken);
      return newToken;
    } catch (err) {
      console.error('Failed to refresh FCM token:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh token');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * 테스트 알림 전송
   */
  const sendTestNotification = useCallback(async () => {
    if (!user) return;

    try {
      const response = await fetch('/api/notifications/send-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send test notification');
      }

      return true;
    } catch (err) {
      console.error('Failed to send test notification:', err);
      throw err;
    }
  }, [user]);

  /**
   * 예약 알림 생성
   */
  const scheduleNotification = useCallback(async (
    title: string,
    body: string,
    scheduledFor: Date,
    data?: Record<string, any>,
    repeatPattern: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly' = 'none'
  ) => {
    if (!user) return;

    try {
      const { error } = await (supabase as any)
        .from('scheduled_notifications')
        .insert({
          user_id: user.id,
          title,
          body,
          data: data || {},
          scheduled_for: scheduledFor.toISOString(),
          repeat_pattern: repeatPattern,
          is_active: true
        });

      if (error) throw error;
    } catch (err) {
      console.error('Failed to schedule notification:', err);
      throw err;
    }
  }, [user]);

  // 사용자 로그인 시 자동 초기화
  useEffect(() => {
    if (user && !isInitialized) {
      initializeNotifications();
    }
  }, [user, isInitialized, initializeNotifications]);

  // 사용자 로그아웃 시 정리
  useEffect(() => {
    if (!user && isInitialized) {
      cleanupPushNotifications();
      setIsInitialized(false);
      setHasPermission(false);
      setFcmToken(null);
      setPreferences(null);
      setLocalNotifications([]);
    }
  }, [user, isInitialized]);

  // 읽지 않은 알림 개수 계산
  const unreadCount = localNotifications.filter(notif => !notif.read).length;

  return {
    // 상태
    isInitialized,
    hasPermission,
    isLoading,
    error,
    fcmToken,
    preferences,
    localNotifications,
    unreadCount,

    // 액션
    initializeNotifications,
    updateNotificationPreferences,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    refreshToken,
    sendTestNotification,
    scheduleNotification,
    loadLocalNotifications
  };
};