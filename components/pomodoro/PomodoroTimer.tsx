'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Play, Pause, Square, Settings, BarChart3, AlertCircle } from 'lucide-react';
import { usePomodoroStore } from '@/state/stores/pomodoroStore';
import { usePomodoro } from '@/hooks/usePomodoro';
import { useAudio } from '@/hooks/useAudio';
import { useNotifications } from '@/hooks/useNotifications';
import { usePomodoroLiveActivity } from '@/hooks/usePomodoroLiveActivity';
import { CircularProgress } from './CircularProgress';
import { TimerDisplay } from './TimerDisplay';
import { AudioSettings } from './AudioSettings';
import { NotificationSettings } from './NotificationSettings';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
// Note: Alert components not used in this component
import type { TimerType } from '@/types/pomodoro';

interface PomodoroTimerProps {
  todoId?: string;
  onSessionComplete?: (sessionId: string, timerType: TimerType) => void;
  className?: string;
}

export const PomodoroTimer = React.memo(function PomodoroTimer({
  todoId,
  onSessionComplete,
  className = ''
}: PomodoroTimerProps) {
  // Store hooks
  const {
    timerState: storeTimerState,
    settings,
    stats,
    isSettingsOpen,
    isStatsOpen,
    connectedTodoId,
    currentSession,
    updateSettings,
    setSettingsOpen,
    setStatsOpen,
    connectTodo,
    disconnectTodo,
    completeSession,
    refreshStats,
  } = usePomodoroStore();

  // Worker hooks
  const {
    timerState: workerTimerState,
    isWorkerReady,
    error: workerError,
    isActive,
    startTimer: startWorkerTimer,
    pauseTimer: pauseWorkerTimer,
    resumeTimer: resumeWorkerTimer,
    stopTimer: stopWorkerTimer,
    formatTime,
  } = usePomodoro();

  // Audio hooks
  const {
    settings: audioSettings,
    playSound,
    setVolume: updateVolume,
    setEnabled: toggleAudioEnabled,
  } = useAudio();

  // Notifications hooks
  const {
    isEnabled: hasPermission,
    requestPermission,
    showNotification,
    state: notificationState,
  } = useNotifications();

  // Live Activity 연동 (iOS Dynamic Island & Lock Screen)
  usePomodoroLiveActivity({
    timerState: workerTimerState,
    todoName: connectedTodoId ? `할일 #${connectedTodoId.slice(0, 8)}` : undefined, // TODO: 실제 할일 이름으로 교체
    startTimeMs: currentSession?.startTime,
    enabled: true,
  });

  // 로컬 상태
  const [sessionCount, setSessionCount] = useState(0);
  const [lastCompletedType, setLastCompletedType] = useState<TimerType>('POMODORO');
  const [tempSettings, setTempSettings] = useState(settings);
  const [isMobile, setIsMobile] = useState(false);

  // 모바일 감지
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // todoId 연결
  useEffect(() => {
    if (todoId && todoId !== connectedTodoId) {
      connectTodo(todoId);
    }
  }, [todoId, connectedTodoId, connectTodo]);

  // Worker 타이머 상태를 Store와 동기화
  useEffect(() => {
    if (workerTimerState.sessionId && 
        workerTimerState.sessionId !== storeTimerState.sessionId) {
      // Worker에서 새로운 세션이 시작됨
    }
  }, [workerTimerState, storeTimerState]);

  // 타이머 시작  
  const handleStartTimer = useCallback((timerType: TimerType = 'POMODORO') => {
    let duration: number;
    
    switch (timerType) {
      case 'POMODORO':
        duration = settings.pomodoroDuration * 60 * 1000;
        break;
      case 'SHORT_BREAK':
        duration = settings.shortBreakDuration * 60 * 1000;
        break;
      case 'LONG_BREAK':
        duration = settings.longBreakDuration * 60 * 1000;
        break;
      default:
        duration = settings.pomodoroDuration * 60 * 1000;
    }

    startWorkerTimer(duration, timerType, connectedTodoId || undefined);
  }, [settings, startWorkerTimer, connectedTodoId]);

  // 타이머 완료 콜백
  const handleTimerComplete = useCallback(async () => {
    // 사운드 재생
    if (settings.soundEnabled && audioSettings.isInitialized) {
      const soundType = workerTimerState.timerType === 'POMODORO' ? 'focus' : 'break';
      playSound(soundType);
    }

    // 알림 표시
    if (settings.notificationsEnabled && hasPermission) {
      const message = workerTimerState.timerType === 'POMODORO' 
        ? '포모도로 세션이 완료되었습니다!' 
        : '휴식 시간이 끝났습니다!';
      
      showNotification({
        title: '타이머 완료',
        body: message,
        icon: '/icons/pomodoro.png',
        tag: 'pomodoro-complete',
      });
    }

    // 세션 완료 처리
    await completeSession();
    refreshStats();

    // 자동 시작 처리
    if (workerTimerState.timerType === 'POMODORO') {
      setSessionCount(prev => prev + 1);
      setLastCompletedType('POMODORO');
      
      if (settings.autoStartBreaks) {
        const isLongBreak = (sessionCount + 1) % settings.longBreakInterval === 0;
        const nextType: TimerType = isLongBreak ? 'LONG_BREAK' : 'SHORT_BREAK';
        setTimeout(() => handleStartTimer(nextType), 1000);
      }
    } else {
      setLastCompletedType(workerTimerState.timerType);
      
      if (settings.autoStartPomodoros) {
        setTimeout(() => handleStartTimer('POMODORO'), 1000);
      }
    }

    // 콜백 호출
    if (onSessionComplete && workerTimerState.sessionId) {
      onSessionComplete(workerTimerState.sessionId, workerTimerState.timerType);
    }
  }, [
    settings,
    audioSettings.isInitialized,
    hasPermission,
    workerTimerState,
    sessionCount,
    playSound,
    showNotification,
    completeSession,
    refreshStats,
    onSessionComplete,
    handleStartTimer,
  ]);

  // 타이머 완료 처리 (handleTimerComplete 정의 이후에 위치)
  useEffect(() => {
    if (workerTimerState.status === 'completed' && 
        storeTimerState.status !== 'completed') {
      handleTimerComplete();
    }
  }, [workerTimerState.status, storeTimerState.status, handleTimerComplete]);

  // 타이머 일시정지/재개
  const handlePauseResume = useCallback(() => {
    if (workerTimerState.isPaused) {
      resumeWorkerTimer();
    } else {
      pauseWorkerTimer();
    }
  }, [workerTimerState.isPaused, pauseWorkerTimer, resumeWorkerTimer]);

  // 타이머 정지
  const handleStop = useCallback(() => {
    stopWorkerTimer();
    setSessionCount(0);
  }, [stopWorkerTimer]);

  // 설정 저장
  const handleSaveSettings = useCallback(() => {
    updateSettings(tempSettings);
    setSettingsOpen(false);
  }, [tempSettings, updateSettings, setSettingsOpen]);

  // 오디오 설정 업데이트
  useEffect(() => {
    if (audioSettings.isInitialized) {
      updateVolume(settings.soundVolume);
      toggleAudioEnabled(settings.soundEnabled);
    }
  }, [settings.soundEnabled, settings.soundVolume, audioSettings.isInitialized, updateVolume, toggleAudioEnabled]);

  // 다음 추천 타이머 타입
  const getNextTimerType = (): TimerType => {
    if (!isActive) {
      if (lastCompletedType === 'POMODORO') {
        return sessionCount % settings.longBreakInterval === 0 ? 'LONG_BREAK' : 'SHORT_BREAK';
      }
      return 'POMODORO';
    }
    return 'POMODORO';
  };

  // 타이머 타입별 색상
  const getTimerColor = (type: TimerType) => {
    switch (type) {
      case 'POMODORO':
        return 'text-red-600';
      case 'SHORT_BREAK':
        return 'text-green-600';
      case 'LONG_BREAK':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  if (!isWorkerReady) {
    return (
      <Card className={`w-full max-w-md mx-auto ${className}`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            <span className="text-sm text-muted-foreground">타이머 초기화 중...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (workerError) {
    return (
      <Card className={`w-full max-w-md mx-auto ${className}`}>
        <CardContent className="p-6">
          <div className="flex items-center space-x-2 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">타이머 오류: {workerError}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentTimerType = workerTimerState.timerType;
  const nextTimerType = getNextTimerType();

  return (
    <>
      <Card className={`w-full max-w-md mx-auto ${className}`}>
        <CardHeader className="text-center pb-4">
          <CardTitle className="flex items-center justify-between">
            <span className={getTimerColor(currentTimerType)}>
              {currentTimerType === 'POMODORO' ? '집중 시간' : 
               currentTimerType === 'SHORT_BREAK' ? '짧은 휴식' : '긴 휴식'}
            </span>
            <div className="flex space-x-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStatsOpen(true)}
                className="h-8 w-8 p-0"
                aria-label="통계 보기"
              >
                <BarChart3 className="h-4 w-4" aria-hidden="true" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSettingsOpen(true)}
                className="h-8 w-8 p-0"
                aria-label="설정 열기"
              >
                <Settings className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </CardTitle>
          {connectedTodoId && (
            <Badge variant="secondary" className="text-xs">
              할일과 연동됨
            </Badge>
          )}
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* 원형 프로그레스 및 시간 표시 */}
          <div className="flex justify-center">
            <CircularProgress 
              progress={workerTimerState.progress}
              size={isMobile ? 150 : 200}
              strokeWidth={isMobile ? 6 : 8}
            >
              <div 
                className="text-xl sm:text-2xl font-mono font-bold"
                role="timer"
                aria-live="polite"
                aria-label={`남은 시간 ${formatTime(workerTimerState.remainingTime)}`}
              >
                {formatTime(workerTimerState.remainingTime)}
              </div>
            </CircularProgress>
          </div>

          {/* 타이머 제어 버튼 */}
          <div className="flex justify-center space-x-2 sm:space-x-4">
            {!isActive ? (
              <Button 
                onClick={() => handleStartTimer(nextTimerType)}
                size={isMobile ? "default" : "lg"}
                className="flex items-center space-x-2"
                aria-label={`${nextTimerType === 'POMODORO' ? '포모도로' : nextTimerType === 'SHORT_BREAK' ? '짧은 휴식' : '긴 휴식'} 타이머 시작`}
              >
                <Play className="h-4 w-4" aria-hidden="true" />
                <span>시작</span>
              </Button>
            ) : (
              <>
                <Button
                  onClick={handlePauseResume}
                  variant="secondary"
                  size={isMobile ? "default" : "lg"}
                  className="flex items-center space-x-2"
                  aria-label={workerTimerState.isPaused ? '타이머 재개' : '타이머 일시정지'}
                >
                  {workerTimerState.isPaused ? (
                    <>
                      <Play className="h-4 w-4" aria-hidden="true" />
                      <span className="sm:inline hidden">재개</span>
                    </>
                  ) : (
                    <>
                      <Pause className="h-4 w-4" aria-hidden="true" />
                      <span className="sm:inline hidden">일시정지</span>
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleStop}
                  variant="destructive"
                  size={isMobile ? "default" : "lg"}
                  className="flex items-center space-x-2"
                  aria-label="타이머 정지"
                >
                  <Square className="h-4 w-4" aria-hidden="true" />
                  <span className="sm:inline hidden">정지</span>
                </Button>
              </>
            )}
          </div>

          {/* 빠른 시작 버튼들 */}
          {!isActive && (
            <div className="flex justify-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStartTimer('POMODORO')}
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                포모도로
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStartTimer('SHORT_BREAK')}
                className="text-green-600 border-green-200 hover:bg-green-50"
              >
                짧은 휴식
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStartTimer('LONG_BREAK')}
                className="text-blue-600 border-blue-200 hover:bg-blue-50"
              >
                긴 휴식
              </Button>
            </div>
          )}

          {/* 오늘 통계 */}
          <div className="text-center text-sm text-muted-foreground">
            <p>오늘 완료: {stats.todaySessions}회</p>
            <p>연속 기록: {stats.currentStreak}회</p>
          </div>
        </CardContent>
      </Card>

      {/* 설정 모달 */}
      <Dialog open={isSettingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>포모도로 설정</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* 시간 설정 */}
            <div className="space-y-4">
              <h3 className="font-medium">시간 설정 (분)</h3>
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="pomodoroDuration">포모도로</Label>
                    <Input
                      id="pomodoroDuration"
                      type="number"
                      min="1"
                      max="60"
                      value={tempSettings.pomodoroDuration}
                      onChange={(e) => setTempSettings(prev => ({
                        ...prev,
                        pomodoroDuration: parseInt(e.target.value) || 25
                      }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="shortBreakDuration">짧은 휴식</Label>
                    <Input
                      id="shortBreakDuration"
                      type="number"
                      min="1"
                      max="30"
                      value={tempSettings.shortBreakDuration}
                      onChange={(e) => setTempSettings(prev => ({
                        ...prev,
                        shortBreakDuration: parseInt(e.target.value) || 5
                      }))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="longBreakDuration">긴 휴식</Label>
                    <Input
                      id="longBreakDuration"
                      type="number"
                      min="1"
                      max="60"
                      value={tempSettings.longBreakDuration}
                      onChange={(e) => setTempSettings(prev => ({
                        ...prev,
                        longBreakDuration: parseInt(e.target.value) || 15
                      }))}
                    />
                  </div>
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
                        longBreakInterval: parseInt(e.target.value) || 4
                      }))}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 자동 시작 설정 */}
            <div className="space-y-4">
              <h3 className="font-medium">자동 시작</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="autoStartBreaks">휴식 자동 시작</Label>
                  <Switch
                    id="autoStartBreaks"
                    checked={tempSettings.autoStartBreaks}
                    onCheckedChange={(checked) => setTempSettings(prev => ({
                      ...prev,
                      autoStartBreaks: checked
                    }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="autoStartPomodoros">포모도로 자동 시작</Label>
                  <Switch
                    id="autoStartPomodoros"
                    checked={tempSettings.autoStartPomodoros}
                    onCheckedChange={(checked) => setTempSettings(prev => ({
                      ...prev,
                      autoStartPomodoros: checked
                    }))}
                  />
                </div>
              </div>
            </div>

            {/* 오디오 설정 */}
            <AudioSettings />

            {/* 알림 설정 */}
            <NotificationSettings />

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setSettingsOpen(false)}>
                취소
              </Button>
              <Button onClick={handleSaveSettings}>
                저장
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 통계 모달 */}
      <Dialog open={isStatsOpen} onOpenChange={setStatsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>포모도로 통계</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {stats.todaySessions}
                </div>
                <div className="text-sm text-muted-foreground">오늘 완료</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {stats.currentStreak}
                </div>
                <div className="text-sm text-muted-foreground">연속 기록</div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-xl font-semibold">
                  {stats.completedSessions}
                </div>
                <div className="text-sm text-muted-foreground">총 완료</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-semibold">
                  {Math.round(stats.totalFocusTime)}분
                </div>
                <div className="text-sm text-muted-foreground">총 집중시간</div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-xl font-semibold">
                  {stats.longestStreak}
                </div>
                <div className="text-sm text-muted-foreground">최대 연속</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-semibold">
                  {stats.weekSessions}
                </div>
                <div className="text-sm text-muted-foreground">이번 주</div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
});