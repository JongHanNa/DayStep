/**
 * 푸시 알림 프로바이더
 * 앱 전체에서 푸시 알림 기능을 제공하는 컨텍스트 프로바이더
 */

'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { useAuth } from '@/app/context/AuthContext';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { NotificationPermissionModal } from '@/components/notifications/NotificationPermissionModal';

interface PushNotificationContextType {
  isInitialized: boolean;
  hasPermission: boolean;
  isLoading: boolean;
  error: string | null;
  unreadCount: number;
  showPermissionModal: () => void;
}

const PushNotificationContext = createContext<PushNotificationContextType | undefined>(undefined);

interface PushNotificationProviderProps {
  children: React.ReactNode;
}

export const PushNotificationProvider: React.FC<PushNotificationProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const {
    isInitialized,
    hasPermission,
    isLoading,
    error,
    unreadCount,
    initializeNotifications
  } = usePushNotifications();

  const [showModal, setShowModal] = useState(false);
  const [hasShownInitialModal, setHasShownInitialModal] = useState(false);

  // 알림 모달을 임시로 비활성화 (하얀 화면 문제 해결을 위해)
  useEffect(() => {
    if (user && 
        Capacitor.isNativePlatform() && 
        !isInitialized && 
        !hasPermission && 
        !isLoading && 
        !hasShownInitialModal) {
      
      // 알림 모달을 자동으로 표시하지 않고 바로 완료 처리
      setHasShownInitialModal(true);
      
      // 사용자가 이전에 알림을 거부했는지 확인
      const hasDeclinedNotifications = localStorage.getItem('notification_permission_declined');
      
      if (!hasDeclinedNotifications) {
        // 임시로 알림 거부 상태로 설정 (사용자가 수동으로 설정에서 활성화 가능)
        localStorage.setItem('notification_permission_declined', 'auto_skipped');
      }
    }
  }, [user, isInitialized, hasPermission, isLoading, hasShownInitialModal]);

  const handleRequestPermission = async (): Promise<boolean> => {
    try {
      await initializeNotifications();
      return hasPermission;
    } catch (error) {
      console.error('Permission request failed:', error);
      return false;
    }
  };

  const handleSkipPermission = () => {
    // 사용자가 알림을 거부했음을 기록
    localStorage.setItem('notification_permission_declined', 'true');
  };

  const showPermissionModal = () => {
    setShowModal(true);
  };

  const contextValue: PushNotificationContextType = {
    isInitialized,
    hasPermission,
    isLoading,
    error,
    unreadCount,
    showPermissionModal
  };

  return (
    <PushNotificationContext.Provider value={contextValue}>
      {children}
      
      {/* 알림 권한 요청 모달 */}
      <NotificationPermissionModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onRequestPermission={handleRequestPermission}
        onSkip={handleSkipPermission}
      />
    </PushNotificationContext.Provider>
  );
};

export const usePushNotificationContext = (): PushNotificationContextType => {
  const context = useContext(PushNotificationContext);
  
  if (context === undefined) {
    throw new Error('usePushNotificationContext must be used within a PushNotificationProvider');
  }
  
  return context;
};