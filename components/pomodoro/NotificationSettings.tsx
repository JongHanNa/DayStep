import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Bell, BellOff, TestTube, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { cn } from '@/lib/utils';

interface NotificationSettingsProps {
  className?: string;
}

export const NotificationSettings = React.memo<NotificationSettingsProps>(({ className }) => {
  const {
    state,
    isEnabled,
    permissionStatusText,
    requestPermission,
    testNotification,
    clearNotifications,
  } = useNotifications();

  const handleRequestPermission = async () => {
    await requestPermission();
  };

  const handleTestNotification = async () => {
    const success = await testNotification();
    if (!success) {
      console.warn('Failed to send test notification');
    }
  };

  const handleClearNotifications = async () => {
    await clearNotifications();
  };

  const getPermissionIcon = () => {
    switch (state.permission) {
      case 'granted':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'denied':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getPermissionBadgeVariant = () => {
    switch (state.permission) {
      case 'granted':
        return 'default';
      case 'denied':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  if (!state.isSupported) {
    return (
      <Card className={cn('w-full', className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="h-5 w-5" />
            알림 설정
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            이 브라우저에서는 알림이 지원되지 않습니다.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isEnabled ? (
            <Bell className="h-5 w-5" />
          ) : (
            <BellOff className="h-5 w-5" />
          )}
          알림 설정
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Permission Status */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="notification-permission">알림 권한</Label>
            <div className="flex items-center gap-2">
              {getPermissionIcon()}
              <Badge variant={getPermissionBadgeVariant()}>
                {permissionStatusText}
              </Badge>
            </div>
          </div>
          {state.permission !== 'granted' && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRequestPermission}
            >
              권한 요청
            </Button>
          )}
        </div>

        {/* Service Worker Status */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>서비스 워커</Label>
            <div className="flex items-center gap-2">
              {state.isServiceWorkerRegistered ? (
                <>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <Badge variant="default">등록됨</Badge>
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <Badge variant="secondary">등록 중...</Badge>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Notification Settings */}
        {isEnabled && (
          <div className="space-y-4">
            <div className="space-y-3">
              <Label>알림 설정</Label>
              
              {/* Pomodoro Completion */}
              <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/50">
                <div className="space-y-1">
                  <div className="text-sm font-medium">포모도로 완료</div>
                  <div className="text-xs text-muted-foreground">
                    25분 집중 세션 완료 시 알림
                  </div>
                </div>
                <Switch defaultChecked />
              </div>

              {/* Break Notifications */}
              <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/50">
                <div className="space-y-1">
                  <div className="text-sm font-medium">휴식 완료</div>
                  <div className="text-xs text-muted-foreground">
                    휴식 시간 완료 시 알림
                  </div>
                </div>
                <Switch defaultChecked />
              </div>

              {/* Reminder Notifications */}
              <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/50">
                <div className="space-y-1">
                  <div className="text-sm font-medium">휴식 리마인더</div>
                  <div className="text-xs text-muted-foreground">
                    긴 휴식 없이 연속 포모도로 시 리마인더
                  </div>
                </div>
                <Switch defaultChecked />
              </div>
            </div>

            {/* Test and Clear Actions */}
            <div className="space-y-2">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTestNotification}
                  className="flex-1"
                >
                  <TestTube className="h-3 w-3 mr-1" />
                  테스트 알림
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearNotifications}
                  className="flex-1"
                >
                  모든 알림 지우기
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Permission Denied Help */}
        {state.permission === 'denied' && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <div className="text-sm text-destructive">
              <strong>알림이 차단되었습니다</strong>
            </div>
            <div className="text-xs text-destructive/80 mt-1">
              브라우저 설정에서 이 사이트의 알림을 허용해주세요.
              주소창 왼쪽의 자물쇠 아이콘을 클릭하여 설정할 수 있습니다.
            </div>
          </div>
        )}

        {/* Features List */}
        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground">
            알림 기능
          </Label>
          <div className="grid gap-1 text-xs text-muted-foreground">
            <div>• 포모도로 타이머 완료 알림</div>
            <div>• 휴식 시간 종료 알림</div>
            <div>• 백그라운드에서도 작동</div>
            <div>• 알림에서 바로 다음 타이머 시작</div>
            <div>• 진동 알림 (모바일)</div>
          </div>
        </div>

        {/* Debug Information (Development Only) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="space-y-2 p-3 rounded-lg bg-muted/50 text-xs">
            <div className="font-medium">디버그 정보</div>
            <div>지원됨: {state.isSupported ? '예' : '아니오'}</div>
            <div>권한: {state.permission}</div>
            <div>서비스 워커: {state.isServiceWorkerRegistered ? '등록됨' : '미등록'}</div>
            <div>활성화됨: {isEnabled ? '예' : '아니오'}</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

NotificationSettings.displayName = 'NotificationSettings';

export default NotificationSettings;