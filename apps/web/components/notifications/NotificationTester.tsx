'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { mobileNotificationService } from '@/services/mobile-notification.service';
import { NotificationManagerComponent } from './NotificationManager';

interface ScheduledNotification {
  id: string;
  title: string;
  body: string;
  scheduledTime: Date;
  timeoutId: NodeJS.Timeout;
  type: 'reminder' | 'test';
}

interface CountdownInfo {
  id: string;
  title: string;
  remainingSeconds: number;
  totalSeconds: number;
}

export const NotificationTester: React.FC = () => {
  const [permissionStatus, setPermissionStatus] = useState<boolean | null>(null);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [scheduledNotifications, setScheduledNotifications] = useState<ScheduledNotification[]>([]);
  const [countdowns, setCountdowns] = useState<CountdownInfo[]>([]);

  // 스케줄된 알림 목록 업데이트
  const updateScheduledNotifications = useCallback(() => {
    const notifications = mobileNotificationService.getScheduledNotifications();
    setScheduledNotifications(notifications);
    setPendingCount(notifications.length);

    // 카운트다운 정보 업데이트
    const now = Date.now();
    const newCountdowns = notifications.map(notification => {
      const totalSeconds = Math.max(0, Math.floor((notification.scheduledTime.getTime() - now) / 1000));
      return {
        id: notification.id,
        title: notification.title,
        remainingSeconds: totalSeconds,
        totalSeconds: totalSeconds > 0 ? totalSeconds : 0
      };
    });
    
    setCountdowns(newCountdowns);
  }, []);

  // 컴포넌트 마운트 시 리스너 등록 및 초기 데이터 로드
  useEffect(() => {
    updateScheduledNotifications();
    mobileNotificationService.addChangeListener(updateScheduledNotifications);

    return () => {
      mobileNotificationService.removeChangeListener(updateScheduledNotifications);
    };
  }, [updateScheduledNotifications]);

  // 1초마다 카운트다운 업데이트
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdowns(prev => prev.map(countdown => ({
        ...countdown,
        remainingSeconds: Math.max(0, countdown.remainingSeconds - 1)
      })).filter(countdown => countdown.remainingSeconds > 0));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // 권한 요청
  const handleRequestPermission = async () => {
    setIsLoading(true);
    try {
      const granted = await mobileNotificationService.requestPermission();
      setPermissionStatus(granted);
      
      if (granted) {
        console.log('✅ 알림 권한 허용됨');
      } else {
        console.log('❌ 알림 권한 거부됨');
      }
    } catch (error) {
      console.error('권한 요청 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 즉시 알림 테스트
  const handleTestImmediateNotification = async () => {
    setIsLoading(true);
    try {
      await mobileNotificationService.testNotification();
      console.log('✅ 즉시 알림 발송 완료');
    } catch (error) {
      console.error('즉시 알림 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 5분 후 알림 스케줄링 테스트
  const handleTest5MinuteNotification = async () => {
    setIsLoading(true);
    try {
      const notificationId = await mobileNotificationService.scheduleTestNotification(5);

      if (notificationId) {
        console.log('✅ 5분 후 테스트 알림 스케줄됨');
      } else {
        console.log('❌ 5분 후 테스트 알림 스케줄링 실패');
      }
    } catch (error) {
      console.error('5분 후 테스트 알림 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 1분 후 알림 스케줄링 테스트
  const handleTest1MinuteNotification = async () => {
    setIsLoading(true);
    try {
      const notificationId = await mobileNotificationService.scheduleTestNotification(1);

      if (notificationId) {
        console.log('✅ 1분 후 테스트 알림 스케줄됨');
      } else {
        console.log('❌ 1분 후 테스트 알림 스케줄링 실패');
      }
    } catch (error) {
      console.error('1분 후 테스트 알림 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 특정 알림 취소
  const handleCancelNotification = async (notificationId: string) => {
    try {
      await mobileNotificationService.cancelNotification(notificationId);
      console.log(`✅ 알림 취소됨: ${notificationId}`);
    } catch (error) {
      console.error('알림 취소 실패:', error);
    }
  };

  // 모든 알림 취소
  const handleCancelAll = async () => {
    setIsLoading(true);
    try {
      await mobileNotificationService.cancelAllNotifications();
      console.log('✅ 모든 알림 취소됨');
    } catch (error) {
      console.error('모든 알림 취소 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 현재 상태 새로고침
  const handleRefreshStatus = () => {
    updateScheduledNotifications();
  };

  // 시간 포맷 함수
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const isNative = false;

  if (!isNative) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>알림 테스터</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-500">
            이 기능은 네이티브 앱에서만 작동합니다.
          </div>
        </CardContent>
      </Card>
    );
  }

  const permissionVariant = permissionStatus === null ? "secondary" : permissionStatus ? "default" : "destructive";
  const permissionText = permissionStatus === null ? "확인 중" : permissionStatus ? "권한 허용" : "권한 거부";

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          알림 테스터
          <div className="flex gap-2">
            <Badge variant={permissionVariant}>
              {permissionText}
            </Badge>
            <Badge variant="outline">
              예약: {pendingCount}
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 권한 요청 */}
        <Button 
          onClick={handleRequestPermission} 
          className="w-full"
          disabled={isLoading}
        >
          {isLoading ? '요청 중...' : '알림 권한 요청'}
        </Button>

        <div className="border-t pt-4 space-y-2">
          {/* 즉시 알림 */}
          <Button 
            onClick={handleTestImmediateNotification} 
            variant="outline" 
            className="w-full"
            disabled={isLoading || !permissionStatus}
          >
            {isLoading ? '발송 중...' : '즉시 알림 테스트'}
          </Button>

          {/* 1분 후 알림 */}
          <Button 
            onClick={handleTest1MinuteNotification} 
            variant="outline" 
            className="w-full"
            disabled={isLoading || !permissionStatus}
          >
            {isLoading ? '스케줄링 중...' : '1분 후 알림 테스트'}
          </Button>

          {/* 5분 후 알림 */}
          <Button 
            onClick={handleTest5MinuteNotification} 
            variant="outline" 
            className="w-full"
            disabled={isLoading || !permissionStatus}
          >
            {isLoading ? '스케줄링 중...' : '5분 후 알림 테스트'}
          </Button>
        </div>

        {/* 예약된 알림 카운트다운 */}
        {countdowns.length > 0 && (
          <div className="border-t pt-4 space-y-3">
            <h4 className="text-sm font-medium text-gray-700">예약된 알림</h4>
            {countdowns.map((countdown) => (
              <div key={countdown.id} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{countdown.title}</span>
                  <span className="text-blue-600 font-mono">
                    {formatTime(countdown.remainingSeconds)}
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Progress 
                    value={countdown.totalSeconds > 0 
                      ? ((countdown.totalSeconds - countdown.remainingSeconds) / countdown.totalSeconds) * 100 
                      : 0
                    }
                    className="flex-1 h-2"
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleCancelNotification(countdown.id)}
                    className="text-xs px-2 py-1 h-6"
                  >
                    취소
                  </Button>
                </div>
                
                <div className="text-xs text-gray-500">
                  {countdown.remainingSeconds > 60 
                    ? `약 ${Math.ceil(countdown.remainingSeconds / 60)}분 후` 
                    : `${countdown.remainingSeconds}초 후`
                  } 알림 예정
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="border-t pt-4 space-y-2">
          {/* 상태 새로고침 */}
          <Button 
            onClick={handleRefreshStatus} 
            variant="secondary" 
            size="sm" 
            className="w-full"
          >
            상태 새로고침
          </Button>

          {/* 모든 알림 취소 */}
          <Button 
            onClick={handleCancelAll} 
            variant="destructive" 
            size="sm" 
            className="w-full"
            disabled={isLoading || pendingCount === 0}
          >
            {isLoading ? '취소 중...' : `모든 알림 취소 (${pendingCount}개)`}
          </Button>
        </div>

        <div className="text-xs text-gray-500 pt-4">
          💡 <strong>웹뷰 알림:</strong> JavaScript Notification API 기반 (개발용)
          <br />
          ⏱️ 실시간 카운트다운으로 남은 시간을 확인할 수 있습니다.
          <br />
          🔔 실제 네이티브 알림은 아래 테스터를 사용하세요.
        </div>
      </CardContent>
    </Card>
  );
};

export const CombinedNotificationTester: React.FC = () => {
  const isNative = false;

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-4">
      {/* 헤더 */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">알림 시스템 테스터</h1>
        <p className="text-sm text-muted-foreground">
          {isNative 
            ? "네이티브 환경에서 웹뷰 알림과 네이티브 알림을 모두 테스트할 수 있습니다."
            : "웹 환경에서는 웹뷰 알림만 테스트할 수 있습니다."
          }
        </p>
      </div>

      {/* 웹뷰 알림 테스터 */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          🌐 웹뷰 알림 테스터
          <Badge variant="outline" className="text-xs">JavaScript API</Badge>
        </h2>
        <NotificationTester />
      </div>

      {/* 구분선 */}
      {isNative && <Separator className="my-8" />}

      {/* 네이티브 알림 테스터 */}
      {isNative && (
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            📱 네이티브 알림 테스터
            <Badge className="text-xs bg-blue-500">iOS/Android</Badge>
          </h2>
          <NotificationManagerComponent />
        </div>
      )}

      {/* 비교 가이드 */}
      {isNative && (
        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold mb-3">📋 알림 시스템 비교</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <h4 className="font-medium text-blue-600">🌐 웹뷰 알림</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• JavaScript Notification API 기반</li>
                <li>• 개발 및 테스트용으로 적합</li>
                <li>• 웹 브라우저 알림 형태로 표시</li>
                <li>• 실시간 카운트다운 지원</li>
                <li>• setTimeout 기반 스케줄링</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-green-600">📱 네이티브 알림</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• iOS/Android 시스템 알림</li>
                <li>• 실제 사용자용 알림</li>
                <li>• 백그라운드에서도 동작</li>
                <li>• 시스템 알림 센터에 표시</li>
                <li>• UserNotifications 프레임워크</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};