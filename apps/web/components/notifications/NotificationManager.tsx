'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import {
  NotificationManager, 
  NotificationHelper,
  NotificationStatus,
  type ScheduledNotificationInfo 
} from '@/plugins/notification';

interface CountdownInfo {
  id: string;
  title: string;
  body: string;
  remainingSeconds: number;
  totalSeconds: number;
}

export const NotificationManagerComponent: React.FC = () => {
  const [permissionStatus, setPermissionStatus] = useState<NotificationStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [countdowns, setCountdowns] = useState<CountdownInfo[]>([]);
  

  const { toast } = useToast();

  // 예약된 알림 목록 업데이트
  const updateScheduledNotifications = useCallback(async () => {
    try {
      // 네이티브 플랫폼이 아니므로 항상 리턴
      return;

      const result = await NotificationManager.getPendingNotifications();
      const converted = NotificationHelper.convertToScheduledNotifications(result.notifications);
      
      // 카운트다운 정보 업데이트
      const now = Date.now();
      const newCountdowns = converted.map(notification => {
        const totalSeconds = Math.max(0, Math.floor((notification.scheduledTime.getTime() - now) / 1000));
        return {
          id: notification.id,
          title: notification.title,
          body: notification.body || '',
          remainingSeconds: totalSeconds,
          totalSeconds: totalSeconds > 0 ? totalSeconds : 0
        };
      });
      
      setCountdowns(newCountdowns);
    } catch (error) {
      console.error('예약된 알림 조회 실패:', error);
    }
  }, []);

  // 컴포넌트 마운트 시 초기화
  useEffect(() => {
    const initializeNotificationStatus = async () => {
      try {
        setPermissionStatus('denied');
        return;

        const result = await NotificationManager.checkPermission();
        setPermissionStatus(result.status);
        await updateScheduledNotifications();
      } catch (error) {
        console.error('알림 상태 초기화 실패:', error);
        setPermissionStatus('unknown');
      }
    };

    initializeNotificationStatus();
  }, [updateScheduledNotifications]);

  // 1초마다 카운트다운 업데이트
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdowns(prev => 
        prev.map(countdown => ({
          ...countdown,
          remainingSeconds: Math.max(0, countdown.remainingSeconds - 1)
        })).filter(countdown => countdown.remainingSeconds > 0)
      );
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // 권한 요청
  const handleRequestPermission = async () => {
    setIsLoading(true);
    try {
      const result = await NotificationManager.requestPermission();
      setPermissionStatus(result.status);
      
      if (result.granted) {
        toast({
          title: "알림 권한 허용됨",
          description: "이제 네이티브 알림을 사용할 수 있습니다.",
        });
      } else {
        toast({
          title: "알림 권한 거부됨",
          description: "설정 > 일상투두 > 알림에서 권한을 허용해주세요.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('알림 권한 요청 실패:', error);
      toast({
        title: "권한 요청 실패",
        description: "알림 권한 요청 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };


  // 특정 알림 취소
  const handleCancelNotification = async (notificationId: string) => {
    try {
      await NotificationManager.cancelNotification({ id: notificationId });
      toast({
        title: "알림 취소됨",
        description: `알림 ID: ${notificationId}`,
      });
      await updateScheduledNotifications();
    } catch (error) {
      console.error('알림 취소 실패:', error);
      toast({
        title: "알림 취소 실패",
        description: "알림 취소 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };


  // 모든 알림 취소
  const handleCancelAllNotifications = async () => {
    setIsLoading(true);
    try {
      const result = await NotificationManager.cancelAllNotifications();
      toast({
        title: "모든 알림 취소됨",
        description: result.message,
      });
      await updateScheduledNotifications();
    } catch (error) {
      console.error('모든 알림 취소 실패:', error);
      toast({
        title: "모든 알림 취소 실패",
        description: "모든 알림 취소 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 시간 포맷 함수
  const formatTime = (seconds: number): string => {
    return NotificationHelper.formatTime(seconds);
  };

  const formatRelativeTime = (seconds: number): string => {
    return NotificationHelper.formatRelativeTime(seconds);
  };

  const isNative = false;
  const permissionGranted = permissionStatus === 'granted';

  if (!isNative) {
    return (
      <Card className="w-full max-w-lg mx-auto">
        <CardHeader>
          <CardTitle className="text-center text-yellow-600">
            ⚠️ 네이티브 환경 필요
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-sm text-muted-foreground">
            알림 관리 기능은 모바일 앱에서만 사용할 수 있습니다.
          </p>
        </CardContent>
      </Card>
    );
  }

  const getPermissionBadge = () => {
    if (permissionStatus === null) return <Badge variant="secondary">확인 중</Badge>;
    
    switch (permissionStatus) {
      case 'granted':
        return <Badge variant="default" className="bg-green-500">권한 허용</Badge>;
      case 'denied':
        return <Badge variant="destructive">권한 거부</Badge>;
      case 'prompt':
        return <Badge variant="outline">권한 요청 가능</Badge>;
      default:
        return <Badge variant="secondary">{permissionStatus}</Badge>;
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>📱 알림 관리</span>
          {getPermissionBadge()}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">

        {/* 예약된 알림 카운트다운 */}
        {permissionGranted && countdowns.length > 0 && (
          <>
            <Separator />
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-700">
                예약된 알림 ({countdowns.length}개)
              </h3>
              {countdowns.map((countdown) => (
                <div key={countdown.id} className="space-y-3 p-4 border rounded-lg bg-gray-50">
                  {/* 제목과 남은 시간 */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium truncate flex-1 mr-2">
                      {countdown.title}
                    </span>
                    <span className="text-blue-600 font-mono text-xs bg-blue-50 px-2 py-1 rounded">
                      {formatTime(countdown.remainingSeconds)}
                    </span>
                  </div>
                  
                  {/* 알림 메시지 내용 */}
                  {countdown.body && (
                    <div className="text-sm text-gray-600 bg-white p-2 rounded border-l-2 border-blue-200">
                      <span className="text-xs text-gray-500 font-medium">메시지:</span>
                      <p className="mt-1 leading-relaxed">{countdown.body}</p>
                    </div>
                  )}
                  
                  {/* 진행률과 취소 버튼 */}
                  <div className="flex items-center gap-2">
                    <Progress 
                      value={countdown.totalSeconds > 0 
                        ? ((countdown.totalSeconds - countdown.remainingSeconds) / countdown.totalSeconds) * 100 
                        : 0
                      }
                      className="flex-1 h-1.5"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleCancelNotification(countdown.id)}
                      className="text-xs px-2 py-1 h-6 text-red-600 hover:text-red-700"
                    >
                      취소
                    </Button>
                  </div>
                  
                  {/* 상대적 시간 표시 */}
                  <div className="text-xs text-gray-500">
                    {formatRelativeTime(countdown.remainingSeconds)} 알림 예정
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* 알림 관리 섹션 */}
        {permissionGranted && (
          <>
            <Separator />
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-700">알림 관리</h3>
              <div className="flex gap-2">
                <Button
                  onClick={updateScheduledNotifications}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  새로고침
                </Button>
                <Button
                  onClick={handleCancelAllNotifications}
                  disabled={isLoading || countdowns.length === 0}
                  variant="destructive"
                  size="sm"
                  className="flex-1"
                >
                  모든 알림 취소
                </Button>
              </div>
            </div>
          </>
        )}

        {/* 도움말 */}
        <div className="text-xs text-muted-foreground space-y-1 border-t pt-4">
          <p>
            💡 <strong>사용법:</strong> 알림 권한을 허용한 후 예약된 알림을 관리할 수 있습니다.
          </p>
          <p>
            🔔 <strong>iOS 설정:</strong> 설정 → 일상투두 → 알림에서 세부 설정을 변경할 수 있습니다.
          </p>
          <p>
            ⏱️ <strong>실시간 카운트다운:</strong> 예약된 알림의 남은 시간을 실시간으로 확인할 수 있습니다.
          </p>
          <p>
            🎯 <strong>네이티브 알림:</strong> 실제 iOS/Android 시스템 알림으로 표시됩니다.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};