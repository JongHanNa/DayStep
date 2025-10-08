'use client';

import { ArrowLeft, Clock, Calendar, Eye, EyeOff, Circle, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/app/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useTimelineViewStore } from '@/state/stores/timelineViewStore';

export default function TimelinePage() {
  const { user, isAuthenticated, loading } = useAuth();
  const { 
    showDayStartGap, 
    showPastGaps, 
    setTodayTimelineDisplay, 
    loadTimelinePreferences,
    saveTimelinePreferencesWithUserId
  } = useTimelineViewStore();
  const router = useRouter();

  // 인증 확인
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login?redirect=%2Fsettings%2Ftimeline');
    }
  }, [loading, isAuthenticated, router]);

  // 인증된 사용자의 설정 로드
  useEffect(() => {
    if (isAuthenticated && !loading && user) {
      loadTimelinePreferences();
    }
  }, [isAuthenticated, loading, user, loadTimelinePreferences]);

  // Capacitor 환경에서 AuthContext 사용자 ID를 활용하는 핸들러
  const handleTodayTimelineDisplayChange = (enabled: boolean) => {
    setTodayTimelineDisplay(enabled);
    
    if (typeof window !== 'undefined' && 
        window.location.protocol === 'capacitor:' && 
        user?.id) {
      setTimeout(() => {
        saveTimelinePreferencesWithUserId(user.id);
      }, 1000);
    }
  };

  // 로딩 중이거나 미인증 상태일 때
  if (loading || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto p-4 space-y-6">
      {/* 상단 네비게이션 */}
      <div className="flex items-center gap-3">
        <Link href="/settings">
          <Button variant="ghost" size="sm" className="p-2">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">타임라인 표시</h1>
          <p className="text-muted-foreground">타임라인 화면의 표시 옵션을 설정하세요</p>
        </div>
      </div>

      {/* 현재 설정 미리보기 카드 */}
      <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-xl p-6 text-white">
        <div className="flex items-center gap-3 mb-4">
          <Calendar className="w-8 h-8" />
          <div>
            <h2 className="text-xl font-semibold">타임라인 표시 설정</h2>
            <p className="opacity-90">
              {(showDayStartGap && showPastGaps) ? '전체 타임라인 표시' : '압축된 타임라인 표시'}
            </p>
          </div>
        </div>
        <div className="text-sm opacity-90">
          오늘 날짜의 타임라인 표시 방식을 조정할 수 있습니다
        </div>
      </div>

      {/* 버블 아이콘 형태 설정 */}
      <Link href="/settings/timeline/bubble-shape">
        <Card className="cursor-pointer transition-all hover:shadow-lg hover:border-indigo-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900 rounded-lg flex items-center justify-center">
                  <Circle className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h3 className="font-medium">버블 아이콘 형태</h3>
                  <p className="text-sm text-muted-foreground">타임라인 버블 모양 선택</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </Link>

      {/* 메인 설정 */}
      <Card>
        <CardHeader>
          <CardTitle>오늘 날짜 전체 타임라인 표시</CardTitle>
          <CardDescription>
            오늘 날짜에서 하루 시작(오전 12:00)부터 현재 시간까지 계획 없음 영역을 모두 표시할지 설정합니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="today-timeline-gaps" className="text-sm font-medium">
                전체 타임라인 표시
              </Label>
              <p className="text-xs text-muted-foreground">
                활성화하면 빈 시간대도 모두 표시됩니다
              </p>
            </div>
            <Switch
              id="today-timeline-gaps"
              checked={showDayStartGap && showPastGaps}
              onCheckedChange={handleTodayTimelineDisplayChange}
            />
          </div>
        </CardContent>
      </Card>

      {/* 설정 옵션별 상세 설명 */}
      <div className="grid grid-cols-1 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                <Eye className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-green-700 dark:text-green-300">전체 표시 모드</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  오전 12:00부터 현재 시간까지의 모든 시간대를 표시합니다. 빈 시간도 &quot;계획 없음&quot; 영역으로 보여줍니다.
                </p>
                <div className="mt-2">
                  <span className="text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-1 rounded">
                    상세한 시간 관리
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                <EyeOff className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-blue-700 dark:text-blue-300">압축 표시 모드</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  실제 일정이 있는 시간대만 표시합니다. 빈 시간대는 숨겨서 더 간결한 뷰를 제공합니다.
                </p>
                <div className="mt-2">
                  <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">
                    간결한 일정 보기
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 추가 정보 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            적용 정보
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span className="text-sm">오늘 날짜 타임라인에만 적용됩니다</span>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span className="text-sm">과거/미래 날짜에는 영향을 주지 않습니다</span>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span className="text-sm">설정은 즉시 적용됩니다</span>
          </div>
          
          <div className="mt-6 pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              💡 <strong>팁:</strong> 시간 관리를 세밀하게 하고 싶다면 전체 표시를, 간결한 일정 보기를 원한다면 압축 표시를 선택하세요.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}