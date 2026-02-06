/**
 * Capacitor 플러그인 래퍼 - 네이티브 통신 로그 최소화
 */

import { LocalNotifications as CapacitorLocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

// 원본 console 함수들 백업
const originalLog = console.log;
const originalInfo = console.info;
const originalWarn = console.warn;

/**
 * Capacitor 네이티브 통신 로그를 임시로 억제하는 함수
 */
function suppressCapacitorLogs() {
  // Capacitor 관련 로그만 필터링
  console.log = (...args: any[]) => {
    const message = args.join(' ');
    if (
      message.includes('⚡️  To Native') ||
      message.includes('⚡️  TO JS') ||
      message.includes('num of pending notifications') ||
      message.includes('LocalNotifications')
    ) {
      // Capacitor 네이티브 통신 로그는 출력하지 않음
      return;
    }
    originalLog.apply(console, args);
  };
  
  console.info = (...args: any[]) => {
    const message = args.join(' ');
    if (
      message.includes('⚡️') ||
      message.includes('LocalNotifications') ||
      message.includes('UNNotificationRequest')
    ) {
      return;
    }
    originalInfo.apply(console, args);
  };
}

/**
 * 원본 console 함수들 복원
 */
function restoreConsoleLogs() {
  console.log = originalLog;
  console.info = originalInfo;
  console.warn = originalWarn;
}

/**
 * 조용한 LocalNotifications 래퍼
 */
export const QuietLocalNotifications = {
  /**
   * getPending을 조용하게 호출
   */
  async getPending() {
    if (!Capacitor.isNativePlatform()) {
      return await CapacitorLocalNotifications.getPending();
    }
    
    // 네이티브에서는 로그 억제 후 호출
    suppressCapacitorLogs();
    
    try {
      const result = await CapacitorLocalNotifications.getPending();
      return result;
    } finally {
      // 500ms 후 로그 복원 (네이티브 응답 완료 후)
      setTimeout(restoreConsoleLogs, 500);
    }
  },

  /**
   * schedule을 조용하게 호출
   */
  async schedule(options: Parameters<typeof CapacitorLocalNotifications.schedule>[0]) {
    if (!Capacitor.isNativePlatform()) {
      return await CapacitorLocalNotifications.schedule(options);
    }
    
    suppressCapacitorLogs();
    
    try {
      const result = await CapacitorLocalNotifications.schedule(options);
      return result;
    } finally {
      setTimeout(restoreConsoleLogs, 500);
    }
  },

  /**
   * cancel을 조용하게 호출
   */
  async cancel(options: Parameters<typeof CapacitorLocalNotifications.cancel>[0]) {
    if (!Capacitor.isNativePlatform()) {
      return await CapacitorLocalNotifications.cancel(options);
    }
    
    suppressCapacitorLogs();
    
    try {
      const result = await CapacitorLocalNotifications.cancel(options);
      return result;
    } finally {
      setTimeout(restoreConsoleLogs, 500);
    }
  },

  /**
   * 다른 메소드들은 그대로 전달
   */
  requestPermissions: CapacitorLocalNotifications.requestPermissions,
  checkPermissions: CapacitorLocalNotifications.checkPermissions,
  addListener: CapacitorLocalNotifications.addListener,
  removeAllListeners: CapacitorLocalNotifications.removeAllListeners,
};

/**
 * 개발자 도구에서 로그 제어
 */
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).capacitorLogging = {
    suppress: suppressCapacitorLogs,
    restore: restoreConsoleLogs,
    info: () => console.log('Capacitor logging controls available'),
  };
}