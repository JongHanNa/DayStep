'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Smartphone, Settings, RefreshCw } from 'lucide-react';
import { widgetSyncService } from '@/services/widget-sync.service';
import { useToast } from '@/hooks/use-toast';
import { Capacitor } from '@capacitor/core';

interface WidgetSettingsProps {
  className?: string;
}

export const WidgetSettings: React.FC<WidgetSettingsProps> = ({ 
  className = '' 
}) => {
  const { toast } = useToast();
  const [widgetEnabled, setWidgetEnabled] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [lastWidgetSync, setLastWidgetSync] = useState<Date | null>(null);

  useEffect(() => {
    loadSettings();
    updateLastSyncTime();
  }, []);

  /**
   * 설정 로드
   */
  const loadSettings = () => {
    try {
      const enabled = localStorage.getItem('widget_enabled') !== 'false';
      setWidgetEnabled(enabled);
    } catch (error) {
      console.error('위젯 설정 로드 실패:', error);
    }
  };

  /**
   * 마지막 위젯 동기화 시간 업데이트
   */
  const updateLastSyncTime = () => {
    const lastSync = widgetSyncService.getLastSyncTime();
    setLastWidgetSync(lastSync);
  };

  /**
   * 위젯 수동 동기화
   */
  const syncWidget = async () => {
    setIsLoading(true);
    try {
      await widgetSyncService.refreshWidget();
      updateLastSyncTime();
      toast({
        title: '위젯 동기화 완료',
        description: '홈 화면 위젯이 최신 데이터로 업데이트되었습니다.',
      });
    } catch (error) {
      console.error('위젯 동기화 실패:', error);
      toast({
        title: '위젯 동기화 실패',
        description: '잠시 후 다시 시도해주세요.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 위젯 설정 변경 처리
   */
  const handleWidgetToggle = (enabled: boolean) => {
    try {
      localStorage.setItem('widget_enabled', enabled.toString());
      setWidgetEnabled(enabled);
      
      toast({
        title: enabled ? '위젯 활성화됨' : '위젯 비활성화됨',
        description: enabled 
          ? '홈 화면 위젯이 활성화되었습니다.' 
          : '홈 화면 위젯이 비활성화되었습니다.',
      });
    } catch (error) {
      console.error('위젯 설정 저장 실패:', error);
    }
  };

  const isPlatformSupported = Capacitor.isNativePlatform();

  return (
    <div className={className}>
      {/* 위젯 설정 (iOS만) */}
      {isPlatformSupported ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              홈 화면 위젯
            </CardTitle>
            <CardDescription>
              iPhone 홈 화면에서 할일과 다짐을 빠르게 확인하세요
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 위젯 활성화 */}
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="widget-enabled">위젯 동기화</Label>
                <p className="text-sm text-muted-foreground">홈 화면 위젯에 최신 데이터를 제공합니다</p>
              </div>
              <Switch
                id="widget-enabled"
                checked={widgetEnabled}
                onCheckedChange={handleWidgetToggle}
              />
            </div>

            {widgetEnabled && (
              <>
                <Separator />
                
                {/* 위젯 동기화 */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">수동 동기화</p>
                    <p className="text-xs text-muted-foreground">
                      마지막: {lastWidgetSync ? lastWidgetSync.toLocaleTimeString() : '없음'}
                    </p>
                  </div>
                  <Button 
                    onClick={syncWidget}
                    disabled={isLoading}
                    size="sm"
                    variant="outline"
                    className="flex items-center gap-1"
                  >
                    <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
                    {isLoading ? '동기화 중' : '지금 동기화'}
                  </Button>
                </div>

                {/* 위젯 추가 안내 */}
                <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <Settings className="h-4 w-4 text-blue-600 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-blue-900 dark:text-blue-100 mb-2">위젯 추가 방법</p>
                      <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                        <p>• 홈 화면 빈 공간 길게 누르기</p>
                        <p>• 왼쪽 상단 + 버튼 → DayStep 검색</p>
                        <p>• 원하는 크기 선택 후 위젯 추가</p>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-muted-foreground" />
              홈 화면 위젯
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center py-8">
            <Smartphone className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              홈 화면 위젯은 iOS 앱에서만 사용할 수 있습니다
            </p>
            <Button variant="outline" disabled>
              iOS 앱에서 사용 가능
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};