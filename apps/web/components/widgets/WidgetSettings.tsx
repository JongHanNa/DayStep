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
import { useTodoStore } from '@/state/stores/todoStore';
import { isRecurringTodo } from '@/lib/recurrence-utils';

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

  const todos = useTodoStore(state => state.todos);

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
   * 위젯 수동 동기화 (상세 로직)
   */
  const syncWidget = async () => {
    if (!Capacitor.isNativePlatform()) {
      toast({
        title: '네이티브 환경에서만 작동',
        description: '위젯은 iOS/Android 앱에서만 지원됩니다.',
        variant: 'destructive',
      });
      return;
    }

    console.log('🧪 [테스트] 수동 위젯 동기화 시작...');
    setIsLoading(true);

    try {
      // 1. 원본 할일 데이터 가져오기 (반복 할일 변환을 위함)
      const allTodos = todos;
      console.log('🧪 [테스트] 전체 할일 목록:', allTodos.length, '개');

      // 2. 오늘 날짜 범위 설정
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      console.log('🧪 [디버그] 현재 시간:', now.toLocaleString('ko-KR'));
      console.log('🧪 [디버그] 오늘 범위:', today.toLocaleString('ko-KR'), '~', tomorrow.toLocaleString('ko-KR'));

      // 3. 반복 할일과 일반 할일 분리
      const recurringTodos = allTodos.filter(todo => isRecurringTodo(todo));
      const regularTodos = allTodos.filter(todo => !isRecurringTodo(todo));

      console.log('🧪 [디버그] 반복 할일:', recurringTodos.length, '개');
      console.log('🧪 [디버그] 일반 할일:', regularTodos.length, '개');

      // 4. 반복 할일을 오늘 날짜로 변환 + 필터링 (직접 시간 변환)
      let todayRecurringTodos: any[] = [];
      if (recurringTodos.length > 0) {
        console.log('🧪 [디버그] 반복 할일 직접 변환 시작...');

        // 오늘 요일 확인 (0=일요일, 1=월요일, 2=화요일, 3=수요일, 4=목요일, 5=금요일, 6=토요일)
        const todayDayOfWeek = today.getDay();
        console.log('🧪 [디버그] 오늘 요일:', todayDayOfWeek, '(0=일, 1=월, 2=화, 3=수, 4=목, 5=금, 6=토)');

        todayRecurringTodos = recurringTodos
          .filter(todo => {
            // 1. 반복 종료일 체크
            if (todo.recurrenceEndDate) {
              const endDate = new Date(todo.recurrenceEndDate);
              if (today > endDate) {
                console.log(`🚫 [필터] ${todo.title}: 반복 종료됨 (${endDate.toLocaleDateString('ko-KR')})`);
                return false;
              }
            }

            // 2. 요일 체크 (recurrence_days_of_week가 있는 경우)
            if (todo.recurrenceDaysOfWeek && Array.isArray(todo.recurrenceDaysOfWeek)) {
              const isValidDay = todo.recurrenceDaysOfWeek.includes(todayDayOfWeek);
              if (!isValidDay) {
                console.log(`🚫 [필터] ${todo.title}: 오늘 요일(${todayDayOfWeek}) 해당 안됨 (허용: ${JSON.stringify(todo.recurrenceDaysOfWeek)})`);
                return false;
              }
            }

            console.log(`✅ [통과] ${todo.title}: 오늘 반복 할일에 포함`);
            return true;
          })
          .map(todo => {
            if (!todo.startTime) {
              return { ...todo, startTime: null };
            }

            // 원본 시간 정보 추출 (시, 분, 초)
            const originalTime = new Date(todo.startTime);
            const hours = originalTime.getHours();
            const minutes = originalTime.getMinutes();
            const seconds = originalTime.getSeconds();

            // 오늘 날짜에 원본 시간 적용
            const todayWithTime = new Date(today);
            todayWithTime.setHours(hours, minutes, seconds, 0);

            console.log(`🔄 [변환] ${todo.title}: ${originalTime.toLocaleString('ko-KR')} → ${todayWithTime.toLocaleString('ko-KR')}`);

            return {
              ...todo,
              startTime: todayWithTime,
              endTime: todo.endTime ? new Date(new Date(todo.endTime).getTime() + (todayWithTime.getTime() - originalTime.getTime())) : null
            };
          });

        console.log('🧪 [디버그] 필터링 후 오늘 반복 할일:', todayRecurringTodos.length, '개');
      }

      // 5. 일반 할일 중 오늘 할일 필터링
      const todayRegularTodos = regularTodos.filter(todo => {
        if (!todo.startTime) {
          return false;
        }
        const todoTime = new Date(todo.startTime);
        const isToday = todoTime >= today && todoTime < tomorrow;
        return isToday;
      });

      console.log('🧪 [디버그] 오늘 일반 할일:', todayRegularTodos.length, '개');

      // 6. 오늘 할일 통합 (반복 + 일반)
      const todayTodos = [...todayRecurringTodos, ...todayRegularTodos];
      console.log('🧪 [테스트] 오늘 통합 할일:', todayTodos.length, '개');

      // 타임라인 할일들 확인
      todayTodos.forEach(todo => {
        const todoTime = todo.startTime ? new Date(todo.startTime) : null;
        console.log(`🧪 [디버그] ${todo.title}: ${todoTime ? todoTime.toLocaleString('ko-KR') : '시간 없음'}`);
      });

      // 현재 시간 이후 할일 필터링
      const upcomingTodos = todayTodos.filter(todo => {
        if (!todo.startTime) {
          return false;
        }
        const todoTime = new Date(todo.startTime);
        const isUpcoming = todoTime > now;
        console.log(`🧪 [디버그] ${todo.title}: 현재 시간 이후: ${isUpcoming}`);
        return isUpcoming;
      });

      console.log('🧪 [테스트] 현재 시간 이후 할일:', upcomingTodos.length, '개');
      upcomingTodos.forEach(todo => {
        console.log(`🧪 [테스트] - ${todo.title}: ${todo.startTime ? new Date(todo.startTime).toLocaleTimeString('ko-KR') : '시간 없음'}`);
      });

      // 위젯 동기화는 타임라인에서 필터링된 오늘 할일 전송
      await widgetSyncService.syncTodos(todayTodos as any);
      updateLastSyncTime();

      toast({
        title: '위젯 동기화 완료',
        description: `오늘 ${todayTodos.length}개 할일 동기화 (${upcomingTodos.length}개 예정)`,
      });
    } catch (error) {
      console.error('🧪 [테스트] 위젯 동기화 실패:', error);
      toast({
        title: '위젯 동기화 실패',
        description: error instanceof Error ? error.message : '알 수 없는 오류',
        variant: 'destructive',
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