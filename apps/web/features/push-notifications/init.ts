/**
 * Push Notifications 초기화 및 관리 모듈
 * FCM 토큰 관리, 권한 요청, 알림 수신 처리를 담당
 */

import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/lib/supabase';

export interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
}

export interface DeviceToken {
  user_id: string;
  fcm_token: string;
  platform: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * 푸시 알림 초기화 및 설정
 */
export const initPushNotifications = async (): Promise<boolean> => {
  try {
    // 네이티브 플랫폼에서만 실행
    if (!Capacitor.isNativePlatform()) {
      console.log('Push notifications are only available on native platforms');
      return false;
    }

    // 권한 요청
    const permission = await PushNotifications.requestPermissions();
    
    if (permission.receive !== 'granted') {
      console.warn('Push notification permission not granted');
      return false;
    }

    // FCM 등록
    await PushNotifications.register();

    // 토큰 수신 리스너
    PushNotifications.addListener('registration', async (token) => {
      console.log('FCM Token received:', token.value.substring(0, 20) + '...');
      await saveFCMToken(token.value);
    });

    // 토큰 등록 실패 리스너
    PushNotifications.addListener('registrationError', (error) => {
      console.error('FCM Token registration error:', error);
    });

    // 알림 수신 리스너 (앱이 포그라운드일 때)
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('Push notification received in foreground:', notification);
      handleForegroundNotification(notification);
    });

    // 알림 클릭 리스너 (앱이 백그라운드/종료 상태일 때)
    PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      console.log('Push notification action performed:', notification);
      handleNotificationAction(notification);
    });

    console.log('Push notifications initialized successfully');
    return true;
  } catch (error) {
    console.error('Failed to initialize push notifications:', error);
    return false;
  }
};

/**
 * FCM 토큰을 Supabase에 저장
 */
const saveFCMToken = async (fcmToken: string): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.warn('No authenticated user found for FCM token save');
      return;
    }

    const deviceData: Omit<DeviceToken, 'created_at' | 'updated_at'> = {
      user_id: user.id,
      fcm_token: fcmToken,
      platform: Capacitor.getPlatform(),
    };

    const { error } = await (supabase as any)
      .from('user_devices')
      .upsert(deviceData, {
        onConflict: 'user_id,platform',
        ignoreDuplicates: false
      });

    if (error) {
      console.error('Failed to save FCM token:', error);
    } else {
      console.log('FCM token saved successfully');
    }
  } catch (error) {
    console.error('Error saving FCM token:', error);
  }
};

/**
 * 포그라운드에서 받은 알림 처리
 */
const handleForegroundNotification = (notification: any): void => {
  // 커스텀 알림 UI 표시 또는 기본 처리
  console.log('Handling foreground notification:', notification);
  
  // 알림 센터에 저장
  saveNotificationLocally(notification);
  
  // 필요시 앱 내 알림 표시
  // showInAppNotification(notification);
};

/**
 * 알림 클릭 액션 처리
 */
const handleNotificationAction = (notificationAction: any): void => {
  const { notification } = notificationAction;
  console.log('Handling notification action:', notification);
  
  // 딥링크 처리
  if (notification.data?.route) {
    navigateToRoute(notification.data.route);
  }
  
  // 알림 읽음 처리
  markNotificationAsRead(notification.data?.notificationId);
};

/**
 * 로컬 알림 저장
 */
const saveNotificationLocally = async (notification: any): Promise<void> => {
  try {
    // SQLite나 로컬 스토리지에 알림 저장
    const notificationData = {
      id: notification.data?.notificationId || Date.now().toString(),
      title: notification.title,
      body: notification.body,
      data: notification.data,
      received_at: new Date().toISOString(),
      read: false,
    };

    // 로컬 스토리지에 저장 (향후 SQLite로 교체 가능)
    const existingNotifications = JSON.parse(
      localStorage.getItem('local_notifications') || '[]'
    );
    existingNotifications.unshift(notificationData);
    
    // 최근 100개만 유지
    if (existingNotifications.length > 100) {
      existingNotifications.splice(100);
    }
    
    localStorage.setItem('local_notifications', JSON.stringify(existingNotifications));
  } catch (error) {
    console.error('Error saving notification locally:', error);
  }
};

/**
 * 딥링크 네비게이션 처리
 */
const navigateToRoute = (route: string): void => {
  try {
    // Next.js 라우터를 통한 네비게이션
    if (typeof window !== 'undefined') {
      window.location.href = route;
    }
  } catch (error) {
    console.error('Error navigating to route:', error);
  }
};

/**
 * 알림 읽음 처리
 */
const markNotificationAsRead = async (notificationId: string): Promise<void> => {
  if (!notificationId) return;

  try {
    // Supabase에서 읽음 처리
    const { error } = await (supabase as any)
      .from('notification_logs')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('id', notificationId);

    if (error) {
      console.error('Failed to mark notification as read:', error);
    }

    // 로컬에서도 읽음 처리
    const existingNotifications = JSON.parse(
      localStorage.getItem('local_notifications') || '[]'
    );
    
    const updatedNotifications = existingNotifications.map((notif: any) => 
      notif.id === notificationId ? { ...notif, read: true } : notif
    );
    
    localStorage.setItem('local_notifications', JSON.stringify(updatedNotifications));
  } catch (error) {
    console.error('Error marking notification as read:', error);
  }
};

/**
 * FCM 토큰 갱신 처리
 */
export const refreshFCMToken = async (): Promise<string | null> => {
  try {
    if (!Capacitor.isNativePlatform()) {
      return null;
    }

    // 기존 토큰 삭제
    await PushNotifications.removeAllListeners();
    
    // 새 토큰 등록
    await PushNotifications.register();
    
    return new Promise((resolve) => {
      PushNotifications.addListener('registration', (token) => {
        resolve(token.value);
      });
      
      PushNotifications.addListener('registrationError', () => {
        resolve(null);
      });
    });
  } catch (error) {
    console.error('Error refreshing FCM token:', error);
    return null;
  }
};

/**
 * 현재 FCM 토큰 가져오기
 */
export const getCurrentFCMToken = async (): Promise<string | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return null;

    const { data, error } = await (supabase as any)
      .from('user_devices')
      .select('fcm_token')
      .eq('user_id', user.id)
      .eq('platform', Capacitor.getPlatform())
      .single();

    if (error || !data) {
      return null;
    }

    return data.fcm_token;
  } catch (error) {
    console.error('Error getting current FCM token:', error);
    return null;
  }
};

/**
 * 푸시 알림 정리 (로그아웃 시 호출)
 */
export const cleanupPushNotifications = async (): Promise<void> => {
  try {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    // 모든 리스너 제거
    await PushNotifications.removeAllListeners();
    
    // 로컬 알림 데이터 정리
    localStorage.removeItem('local_notifications');
    
    console.log('Push notifications cleaned up');
  } catch (error) {
    console.error('Error cleaning up push notifications:', error);
  }
};