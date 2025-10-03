'use client';

import React, { useMemo } from 'react';
import { BarChart3, Clock, Target, TrendingUp, Calendar, Award } from 'lucide-react';
import { usePomodoroStore } from '@/state/stores/pomodoroStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import type { PomodoroSession, TimerType } from '@/types/pomodoro';

interface PomodoroStatsProps {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function PomodoroStats({ 
  trigger, 
  open, 
  onOpenChange 
}: PomodoroStatsProps) {
  const { sessions, stats } = usePomodoroStore();

  // 세션 통계 계산
  const sessionStats = useMemo(() => {
    const now = new Date();
    
    // 오늘 세션들
    const today = now.toDateString();
    const todaySessions = sessions.filter(s => 
      new Date(s.startTime).toDateString() === today && s.completed
    );
    
    // 이번 주 세션들
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const weekSessions = sessions.filter(s => 
      new Date(s.startTime) >= weekStart && s.completed
    );
    
    // 이번 달 세션들
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthSessions = sessions.filter(s => 
      new Date(s.startTime) >= monthStart && s.completed
    );

    // 타입별 세션 분류
    const sessionsByType = sessions.reduce((acc, session) => {
      if (session.completed) {
        acc[session.timerType] = (acc[session.timerType] || 0) + 1;
      }
      return acc;
    }, {} as Record<TimerType, number>);

    // 최근 7일 통계
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      return date.toDateString();
    }).reverse();

    const weeklyData = last7Days.map(dateStr => {
      const daySessions = sessions.filter(s => 
        new Date(s.startTime).toDateString() === dateStr && 
        s.completed && 
        s.timerType === 'POMODORO'
      );
      return {
        date: dateStr,
        count: daySessions.length,
        focusTime: daySessions.reduce((total, session) => 
          total + (session.duration / (60 * 1000)), 0
        )
      };
    });

    return {
      today: {
        total: todaySessions.length,
        pomodoros: todaySessions.filter(s => s.timerType === 'POMODORO').length,
        breaks: todaySessions.filter(s => s.timerType !== 'POMODORO').length,
        focusTime: todaySessions
          .filter(s => s.timerType === 'POMODORO')
          .reduce((total, session) => total + (session.duration / (60 * 1000)), 0)
      },
      week: {
        total: weekSessions.length,
        pomodoros: weekSessions.filter(s => s.timerType === 'POMODORO').length,
        focusTime: weekSessions
          .filter(s => s.timerType === 'POMODORO')
          .reduce((total, session) => total + (session.duration / (60 * 1000)), 0)
      },
      month: {
        total: monthSessions.length,
        pomodoros: monthSessions.filter(s => s.timerType === 'POMODORO').length,
        focusTime: monthSessions
          .filter(s => s.timerType === 'POMODORO')
          .reduce((total, session) => total + (session.duration / (60 * 1000)), 0)
      },
      byType: sessionsByType,
      weeklyData
    };
  }, [sessions]);

  // 완료율 계산
  const completionRate = stats.totalSessions > 0 
    ? Math.round((stats.completedSessions / stats.totalSessions) * 100)
    : 0;

  // 평균 세션 길이 (분)
  const avgSessionLength = Math.round(stats.averageSessionLength);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger ? (
        <DialogTrigger asChild>
          {trigger}
        </DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span>통계</span>
          </Button>
        </DialogTrigger>
      )}
      
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5" />
            <span>포모도로 통계</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="overflow-y-auto max-h-[70vh] space-y-6">
          {/* 주요 통계 카드들 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-primary">
                  {sessionStats.today.pomodoros}
                </div>
                <div className="text-sm text-muted-foreground">오늘 완료</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-primary">
                  {stats.currentStreak}
                </div>
                <div className="text-sm text-muted-foreground">연속 기록</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-primary">
                  {Math.round(sessionStats.today.focusTime)}분
                </div>
                <div className="text-sm text-muted-foreground">오늘 집중</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-primary">
                  {completionRate}%
                </div>
                <div className="text-sm text-muted-foreground">완료율</div>
              </CardContent>
            </Card>
          </div>

          {/* 기간별 통계 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-4 w-4" />
                <span>기간별 통계</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 오늘 */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium">오늘</span>
                  <Badge variant="secondary">
                    {sessionStats.today.total}회 완료
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  포모도로 {sessionStats.today.pomodoros}회 · 
                  휴식 {sessionStats.today.breaks}회 · 
                  집중시간 {Math.round(sessionStats.today.focusTime)}분
                </div>
              </div>

              <Separator />

              {/* 이번 주 */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium">이번 주</span>
                  <Badge variant="secondary">
                    {sessionStats.week.total}회 완료
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  포모도로 {sessionStats.week.pomodoros}회 · 
                  집중시간 {Math.round(sessionStats.week.focusTime)}분
                </div>
              </div>

              <Separator />

              {/* 이번 달 */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium">이번 달</span>
                  <Badge variant="secondary">
                    {sessionStats.month.total}회 완료
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  포모도로 {sessionStats.month.pomodoros}회 · 
                  집중시간 {Math.round(sessionStats.month.focusTime)}분
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 전체 통계 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Target className="h-4 w-4" />
                <span>전체 통계</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-lg font-semibold">
                    {stats.completedSessions}
                  </div>
                  <div className="text-sm text-muted-foreground">총 완료 세션</div>
                </div>
                <div>
                  <div className="text-lg font-semibold">
                    {Math.round(stats.totalFocusTime)}분
                  </div>
                  <div className="text-sm text-muted-foreground">총 집중 시간</div>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>완료율</span>
                  <span>{completionRate}%</span>
                </div>
                <Progress value={completionRate} className="h-2" />
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">평균 세션</span>
                  <div className="font-medium">{avgSessionLength}분</div>
                </div>
                <div>
                  <span className="text-muted-foreground">최대 연속</span>
                  <div className="font-medium">{stats.longestStreak}회</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 타입별 통계 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="h-4 w-4" />
                <span>타입별 완료 현황</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <span>포모도로</span>
                </div>
                <Badge variant="outline">
                  {sessionStats.byType.POMODORO || 0}회
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span>짧은 휴식</span>
                </div>
                <Badge variant="outline">
                  {sessionStats.byType.SHORT_BREAK || 0}회
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span>긴 휴식</span>
                </div>
                <Badge variant="outline">
                  {sessionStats.byType.LONG_BREAK || 0}회
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* 성취 및 목표 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Award className="h-4 w-4" />
                <span>성취</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* 연속 기록 배지 */}
              {stats.currentStreak >= 5 && (
                <div className="flex items-center space-x-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <Award className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm">
                    🔥 {stats.currentStreak}회 연속 완주 중!
                  </span>
                </div>
              )}

              {/* 총 시간 배지 */}
              {stats.totalFocusTime >= 60 && (
                <div className="flex items-center space-x-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <Clock className="h-4 w-4 text-blue-500" />
                  <span className="text-sm">
                    ⏰ 총 {Math.round(stats.totalFocusTime)}분 집중 달성!
                  </span>
                </div>
              )}

              {/* 일일 목표 */}
              {sessionStats.today.pomodoros >= 4 && (
                <div className="flex items-center space-x-2 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <Target className="h-4 w-4 text-green-500" />
                  <span className="text-sm">
                    🎯 오늘 일일 목표 달성!
                  </span>
                </div>
              )}

              {/* 기본 메시지 */}
              {stats.currentStreak < 5 && stats.totalFocusTime < 60 && sessionStats.today.pomodoros < 4 && (
                <div className="text-center text-muted-foreground">
                  <p className="text-sm">더 많은 성취를 위해 계속 도전해보세요! 💪</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 최근 7일 트렌드 */}
          {sessionStats.weeklyData.some(d => d.count > 0) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-4 w-4" />
                  <span>최근 7일 트렌드</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {sessionStats.weeklyData.map((day, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {new Date(day.date).toLocaleDateString('ko-KR', { 
                          month: 'short', 
                          day: 'numeric',
                          weekday: 'short'
                        })}
                      </span>
                      <div className="flex items-center space-x-2">
                        <span>{day.count}회</span>
                        <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full transition-all"
                            style={{ 
                              width: `${Math.max(10, (day.count / Math.max(1, Math.max(...sessionStats.weeklyData.map(d => d.count)))) * 100)}%` 
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}