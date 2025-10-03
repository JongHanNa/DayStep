'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { MinuteSlider } from '@/components/ui/minute-slider';
import { Clock, Bell, PlayCircle, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { integratedNotificationService } from '@/services/integrated-notification.service';

interface NotificationSettings {
  enabled: boolean;
  // 작업 전 리마인더
  beforeWork: {
    enabled: boolean;
    minutes: number; // 1-60분
  };
  // 작업 시작 알림 (시작 시점에 바로)
  workStart: {
    enabled: boolean;
  };
  // 작업 완료 알림 (예정 완료 시점에 바로)
  workComplete: {
    enabled: boolean;
  };
  showTaskCompletion: boolean;
  showAchievements: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  // 호환성을 위한 기존 필드
  beforeMinutes: number;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: true,
  beforeWork: {
    enabled: true,
    minutes: 30
  },
  workStart: {
    enabled: false
  },
  workComplete: {
    enabled: false
  },
  showTaskCompletion: true,
  showAchievements: true,
  soundEnabled: true,
  vibrationEnabled: true,
  // 호환성을 위한 기존 필드
  beforeMinutes: 30,
};

export interface NotificationSettingsProps {
  className?: string;
}

export const NotificationSettings: React.FC<NotificationSettingsProps> = ({ className }) => {
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [permissionStatus, setPermissionStatus] = useState<{ granted: boolean; status: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [systemInfo] = useState(integratedNotificationService.getSystemInfo());

  const { toast } = useToast();

  // 컴포넌트 마운트 시 설정과 권한 상태 로드
  useEffect(() => {
    loadSettings();
    checkPermissionStatus();
  }, []);

  // 로컬 스토리지에서 설정 로드
  const loadSettings = () => {
    try {
      const savedSettings = localStorage.getItem('notification-settings');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        // 기존 설정을 새로운 구조로 마이그레이션
        const migratedSettings: NotificationSettings = {
          ...DEFAULT_SETTINGS,
          ...parsed,
          beforeWork: parsed.beforeWork || {
            enabled: parsed.enabled ?? DEFAULT_SETTINGS.beforeWork.enabled,
            minutes: parsed.beforeMinutes || DEFAULT_SETTINGS.beforeWork.minutes
          },
          workStart: parsed.workStart || DEFAULT_SETTINGS.workStart,
          workComplete: parsed.workComplete || DEFAULT_SETTINGS.workComplete
        };
        setSettings(migratedSettings);
      }
    } catch (error) {
      console.error('알림 설정 로드 실패:', error);
    }
  };

  // 설정을 로컬 스토리지에 저장
  const saveSettings = (newSettings: NotificationSettings) => {
    try {
      localStorage.setItem('notification-settings', JSON.stringify(newSettings));
      setSettings(newSettings);
      
      toast({
        title: "설정 저장됨",
        description: "알림 설정이 저장되었습니다.",
      });
    } catch (error) {
      console.error('알림 설정 저장 실패:', error);
      toast({
        title: "설정 저장 실패",
        description: "알림 설정 저장 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  // 권한 상태 확인
  const checkPermissionStatus = async () => {
    try {
      const status = await integratedNotificationService.checkPermission();
      setPermissionStatus(status);
    } catch (error) {
      console.error('권한 상태 확인 실패:', error);
    }
  };

  // 권한 요청
  const requestPermission = async () => {
    setIsLoading(true);
    try {
      const granted = await integratedNotificationService.requestPermission();
      
      if (granted) {
        await checkPermissionStatus();
        toast({
          title: "알림 권한 허용됨",
          description: "이제 알림을 받을 수 있습니다.",
        });
      } else {
        toast({
          title: "알림 권한 거부됨",
          description: "설정에서 알림 권한을 허용해주세요.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('권한 요청 실패:', error);
      toast({
        title: "권한 요청 실패",
        description: "알림 권한 요청 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 설정 변경 핸들러
  const handleSettingChange = <K extends keyof NotificationSettings>(
    key: K,
    value: NotificationSettings[K]
  ) => {
    const newSettings = { ...settings, [key]: value };
    saveSettings(newSettings);
  };


  return (
    <div className={className}>
      <Card>
        <CardHeader className="pb-4">
          <CardTitle>알림 설정</CardTitle>
        </CardHeader>

        <CardContent className="space-y-8">
          {/* 권한 관리 */}
          {!permissionStatus?.granted && (
            <div className="p-4 border border-yellow-200 rounded-lg bg-yellow-50">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-yellow-800">알림 권한 필요</h4>
                  <p className="text-sm text-yellow-600">
                    알림을 받으려면 권한을 허용해주세요.
                  </p>
                </div>
                <Button
                  onClick={requestPermission}
                  disabled={isLoading}
                  size="sm"
                >
                  {isLoading ? '요청 중...' : '권한 요청'}
                </Button>
              </div>
            </div>
          )}

          {/* 기본 알림 설정 */}
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Bell className="w-5 h-5 text-blue-600" />
                기본 설정
              </h3>
              
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="notifications-enabled" className="text-base font-medium">알림 활성화</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      모든 DayStep 알림 활성화/비활성화
                    </p>
                  </div>
                  <Switch
                    id="notifications-enabled"
                    checked={settings.enabled}
                    onCheckedChange={(checked) => handleSettingChange('enabled', checked)}
                    disabled={!permissionStatus?.granted}
                  />
                </div>
              </div>
            </div>

            {/* 단계별 할일 리마인더 설정 */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-green-600" />
                할일 단계별 리마인더
              </h3>
              
              <div className="grid gap-4">
                {/* 1. 작업 전 리마인더 */}
                <div className="border border-orange-200 bg-orange-50/50 rounded-lg p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                        <AlertCircle className="w-4 h-4 text-orange-600" />
                      </div>
                      <div>
                        <Label className="text-base font-semibold text-orange-900">작업 전 알림</Label>
                        <p className="text-sm text-orange-700 mt-0.5">
                          할일 시작 전 미리 준비 알림
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={settings.beforeWork.enabled}
                      onCheckedChange={(checked) => {
                        const newSettings = {
                          ...settings,
                          beforeWork: { ...settings.beforeWork, enabled: checked },
                          beforeMinutes: settings.beforeWork.minutes // 호환성 유지
                        };
                        saveSettings(newSettings);
                      }}
                      disabled={!settings.enabled || !permissionStatus?.granted}
                    />
                  </div>

                  {settings.beforeWork.enabled && (
                    <div className="space-y-3 pt-2 border-t border-orange-200">
                      <Label className="text-sm font-medium text-orange-800">몇 분 전에 알림받을까요?</Label>
                      <MinuteSlider
                        value={settings.beforeWork.minutes}
                        onChange={(value) => {
                          const newSettings = {
                            ...settings,
                            beforeWork: { ...settings.beforeWork, minutes: value },
                            beforeMinutes: value // 호환성 유지
                          };
                          saveSettings(newSettings);
                        }}
                        min={1}
                        max={60}
                        className="px-2"
                      />
                    </div>
                  )}
                </div>

                {/* 2. 작업 시작 알림 */}
                <div className="border border-blue-200 bg-blue-50/50 rounded-lg p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <PlayCircle className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <Label className="text-base font-semibold text-blue-900">작업 시작 알림</Label>
                        <p className="text-sm text-blue-700 mt-0.5">
                          할일 시작 시간이 되면 바로 알림
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={settings.workStart.enabled}
                      onCheckedChange={(checked) => {
                        const newSettings = {
                          ...settings,
                          workStart: { enabled: checked }
                        };
                        saveSettings(newSettings);
                      }}
                      disabled={!settings.enabled || !permissionStatus?.granted}
                    />
                  </div>
                </div>

                {/* 3. 작업 완료 알림 */}
                <div className="border border-green-200 bg-green-50/50 rounded-lg p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      </div>
                      <div>
                        <Label className="text-base font-semibold text-green-900">작업 완료 알림</Label>
                        <p className="text-sm text-green-700 mt-0.5">
                          예정 완료 시간이 되면 바로 알림
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={settings.workComplete.enabled}
                      onCheckedChange={(checked) => {
                        const newSettings = {
                          ...settings,
                          workComplete: { enabled: checked }
                        };
                        saveSettings(newSettings);
                      }}
                      disabled={!settings.enabled || !permissionStatus?.granted}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 알림 유형 설정 */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-purple-600" />
                알림 유형
              </h3>
              
              <div className="bg-muted/50 rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between py-2">
                  <div>
                    <Label htmlFor="task-completion" className="text-base font-medium">할일 완료 알림</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      할일을 완료했을 때 축하 알림 표시
                    </p>
                  </div>
                  <Switch
                    id="task-completion"
                    checked={settings.showTaskCompletion}
                    onCheckedChange={(checked) => handleSettingChange('showTaskCompletion', checked)}
                    disabled={!settings.enabled || !permissionStatus?.granted}
                  />
                </div>

                <div className="border-t pt-4">
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <Label htmlFor="achievements" className="text-base font-medium">성취 알림</Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        목표 달성이나 연속 완료 시 알림 표시
                      </p>
                    </div>
                    <Switch
                      id="achievements"
                      checked={settings.showAchievements}
                      onCheckedChange={(checked) => handleSettingChange('showAchievements', checked)}
                      disabled={!settings.enabled || !permissionStatus?.granted}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 알림 스타일 설정 (네이티브 환경에서만) */}
            {systemInfo.isNative && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Bell className="w-5 h-5 text-indigo-600" />
                  알림 스타일
                </h3>
                
                <div className="bg-muted/50 rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <Label htmlFor="sound-enabled" className="text-base font-medium">사운드</Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        알림 시 사운드 재생
                      </p>
                    </div>
                    <Switch
                      id="sound-enabled"
                      checked={settings.soundEnabled}
                      onCheckedChange={(checked) => handleSettingChange('soundEnabled', checked)}
                      disabled={!settings.enabled || !permissionStatus?.granted}
                    />
                  </div>

                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between py-2">
                      <div>
                        <Label htmlFor="vibration-enabled" className="text-base font-medium">진동</Label>
                        <p className="text-sm text-muted-foreground mt-1">
                          알림 시 진동 (모바일에서만)
                        </p>
                      </div>
                      <Switch
                        id="vibration-enabled"
                        checked={settings.vibrationEnabled}
                        onCheckedChange={(checked) => handleSettingChange('vibrationEnabled', checked)}
                        disabled={!settings.enabled || !permissionStatus?.granted}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 도움말 */}
            <div className="bg-blue-50/50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-600 text-sm">💡</span>
                </div>
                <div>
                  <h4 className="font-medium text-blue-800 mb-2">추가 설정</h4>
                  <p className="text-sm text-blue-700 leading-relaxed">
                    {systemInfo.isNative 
                      ? 'iOS 설정 > DayStep > 알림에서 더 자세한 설정을 조정할 수 있습니다.'
                      : '브라우저 설정에서 더 자세한 알림 설정을 조정할 수 있습니다.'
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};