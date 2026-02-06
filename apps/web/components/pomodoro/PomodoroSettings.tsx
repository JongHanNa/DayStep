'use client';

import React, { useState } from 'react';
import { Settings, Clock, Bell, Volume2, Zap } from 'lucide-react';
import { usePomodoroStore } from '@/state/stores/pomodoroStore';
import { AudioSettings } from './AudioSettings';
import { NotificationSettings } from './NotificationSettings';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { TimerSettings } from '@/types/pomodoro';

interface PomodoroSettingsProps {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function PomodoroSettings({ 
  trigger, 
  open, 
  onOpenChange 
}: PomodoroSettingsProps) {
  const { settings, updateSettings } = usePomodoroStore();
  const [tempSettings, setTempSettings] = useState<TimerSettings>(settings);
  const [isOpen, setIsOpen] = useState(false);

  const handleOpenChange = (newOpen: boolean) => {
    if (onOpenChange) {
      onOpenChange(newOpen);
    } else {
      setIsOpen(newOpen);
    }
    
    if (!newOpen) {
      // 모달이 닫힐 때 임시 설정 초기화
      setTempSettings(settings);
    }
  };

  const handleSave = () => {
    updateSettings(tempSettings);
    handleOpenChange(false);
  };

  const handleReset = () => {
    const defaultSettings: TimerSettings = {
      pomodoroDuration: 25,
      shortBreakDuration: 5,
      longBreakDuration: 15,
      longBreakInterval: 4,
      autoStartBreaks: false,
      autoStartPomodoros: false,
      soundEnabled: true,
      soundVolume: 50,
      notificationsEnabled: true,
    };
    setTempSettings(defaultSettings);
  };

  const currentOpen = open !== undefined ? open : isOpen;

  return (
    <Dialog open={currentOpen} onOpenChange={handleOpenChange}>
      {trigger ? (
        <DialogTrigger asChild>
          {trigger}
        </DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>설정</span>
          </Button>
        </DialogTrigger>
      )}
      
      <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>포모도로 설정</span>
          </DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="timing" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="timing" className="flex items-center space-x-1">
              <Clock className="h-3 w-3" />
              <span className="hidden sm:inline">시간</span>
            </TabsTrigger>
            <TabsTrigger value="automation" className="flex items-center space-x-1">
              <Zap className="h-3 w-3" />
              <span className="hidden sm:inline">자동화</span>
            </TabsTrigger>
            <TabsTrigger value="audio" className="flex items-center space-x-1">
              <Volume2 className="h-3 w-3" />
              <span className="hidden sm:inline">오디오</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center space-x-1">
              <Bell className="h-3 w-3" />
              <span className="hidden sm:inline">알림</span>
            </TabsTrigger>
          </TabsList>
          
          <div className="mt-4 overflow-y-auto max-h-[60vh]">
            {/* 시간 설정 탭 */}
            <TabsContent value="timing" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">시간 설정</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4">
                    <div>
                      <Label htmlFor="pomodoroDuration" className="flex items-center space-x-2">
                        <span className="w-2 h-2 rounded-full bg-red-500"></span>
                        <span>포모도로 (분)</span>
                      </Label>
                      <Input
                        id="pomodoroDuration"
                        type="number"
                        min="1"
                        max="90"
                        value={tempSettings.pomodoroDuration}
                        onChange={(e) => setTempSettings(prev => ({
                          ...prev,
                          pomodoroDuration: Math.max(1, Math.min(90, parseInt(e.target.value) || 25))
                        }))}
                        className="mt-1"
                      />
                      <p className="text-sm text-muted-foreground mt-1">
                        집중 작업 시간 (권장: 25분)
                      </p>
                    </div>

                    <Separator />

                    <div>
                      <Label htmlFor="shortBreakDuration" className="flex items-center space-x-2">
                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                        <span>짧은 휴식 (분)</span>
                      </Label>
                      <Input
                        id="shortBreakDuration"
                        type="number"
                        min="1"
                        max="30"
                        value={tempSettings.shortBreakDuration}
                        onChange={(e) => setTempSettings(prev => ({
                          ...prev,
                          shortBreakDuration: Math.max(1, Math.min(30, parseInt(e.target.value) || 5))
                        }))}
                        className="mt-1"
                      />
                      <p className="text-sm text-muted-foreground mt-1">
                        포모도로 사이의 짧은 휴식 (권장: 5분)
                      </p>
                    </div>

                    <Separator />

                    <div>
                      <Label htmlFor="longBreakDuration" className="flex items-center space-x-2">
                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                        <span>긴 휴식 (분)</span>
                      </Label>
                      <Input
                        id="longBreakDuration"
                        type="number"
                        min="1"
                        max="60"
                        value={tempSettings.longBreakDuration}
                        onChange={(e) => setTempSettings(prev => ({
                          ...prev,
                          longBreakDuration: Math.max(1, Math.min(60, parseInt(e.target.value) || 15))
                        }))}
                        className="mt-1"
                      />
                      <p className="text-sm text-muted-foreground mt-1">
                        긴 휴식 시간 (권장: 15-30분)
                      </p>
                    </div>

                    <Separator />

                    <div>
                      <Label htmlFor="longBreakInterval">긴 휴식 간격</Label>
                      <Input
                        id="longBreakInterval"
                        type="number"
                        min="2"
                        max="10"
                        value={tempSettings.longBreakInterval}
                        onChange={(e) => setTempSettings(prev => ({
                          ...prev,
                          longBreakInterval: Math.max(2, Math.min(10, parseInt(e.target.value) || 4))
                        }))}
                        className="mt-1"
                      />
                      <p className="text-sm text-muted-foreground mt-1">
                        몇 번의 포모도로 후에 긴 휴식을 할지 설정 (권장: 4회)
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 자동화 설정 탭 */}
            <TabsContent value="automation" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">자동 시작 설정</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label htmlFor="autoStartBreaks">휴식 자동 시작</Label>
                      <p className="text-sm text-muted-foreground">
                        포모도로 완료 후 자동으로 휴식을 시작합니다
                      </p>
                    </div>
                    <Switch
                      id="autoStartBreaks"
                      checked={tempSettings.autoStartBreaks}
                      onCheckedChange={(checked) => setTempSettings(prev => ({
                        ...prev,
                        autoStartBreaks: checked
                      }))}
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label htmlFor="autoStartPomodoros">포모도로 자동 시작</Label>
                      <p className="text-sm text-muted-foreground">
                        휴식 완료 후 자동으로 다음 포모도로를 시작합니다
                      </p>
                    </div>
                    <Switch
                      id="autoStartPomodoros"
                      checked={tempSettings.autoStartPomodoros}
                      onCheckedChange={(checked) => setTempSettings(prev => ({
                        ...prev,
                        autoStartPomodoros: checked
                      }))}
                    />
                  </div>

                  {(tempSettings.autoStartBreaks || tempSettings.autoStartPomodoros) && (
                    <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                      <p className="text-sm text-yellow-800 dark:text-yellow-200">
                        💡 자동 시작이 활성화되면 타이머가 연속으로 실행됩니다. 
                        중간에 멈추고 싶다면 &apos;정지&apos; 버튼을 눌러주세요.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* 오디오 설정 탭 */}
            <TabsContent value="audio" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">오디오 설정</CardTitle>
                </CardHeader>
                <CardContent>
                  <AudioSettings />
                </CardContent>
              </Card>
            </TabsContent>

            {/* 알림 설정 탭 */}
            <TabsContent value="notifications" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">알림 설정</CardTitle>
                </CardHeader>
                <CardContent>
                  <NotificationSettings />
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>

        <Separator />

        <div className="flex justify-between">
          <Button variant="outline" onClick={handleReset}>
            기본값으로 초기화
          </Button>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              취소
            </Button>
            <Button onClick={handleSave}>
              저장
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}