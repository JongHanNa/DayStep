'use client';

import { useTodoStore } from '@/state/stores/todoStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle2, 
  Circle, 
  TrendingUp, 
  Calendar,
  Target,
  BarChart3
} from 'lucide-react';

/**
 * 할일 통계 컴포넌트
 */
export function TodoStats() {
  const { stats, todos } = useTodoStore();

  const progressPercentage = stats.totalCount > 0 
    ? Math.round((stats.completedCount / stats.totalCount) * 100) 
    : 0;

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 60) return 'bg-blue-500';
    if (percentage >= 40) return 'bg-yellow-500';
    return 'bg-gray-400';
  };

  const getMotivationalMessage = (percentage: number) => {
    if (percentage === 100) return '🎉 모든 할일을 완료했습니다!';
    if (percentage >= 80) return '🚀 거의 다 완료했어요!';
    if (percentage >= 60) return '💪 좋은 진행 상황입니다!';
    if (percentage >= 40) return '⚡ 계속 진행해보세요!';
    if (percentage > 0) return '🌱 좋은 시작이에요!';
    return '📝 첫 번째 할일을 시작해보세요!';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 전체 진행률 */}
      <Card className="md:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold flex items-center">
            <Target className="w-5 h-5 mr-2 text-blue-500" />
            전체 진행률
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">
                {stats.completedCount}/{stats.totalCount} 완료
              </span>
              <span className="font-semibold text-lg">
                {progressPercentage}%
              </span>
            </div>
            
            <Progress 
              value={progressPercentage} 
              className="h-3"
            />
            
            <p className="text-sm text-gray-600 font-medium">
              {getMotivationalMessage(progressPercentage)}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 미완료 할일 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center text-gray-600">
            <Circle className="w-4 h-4 mr-2 text-orange-500" />
            미완료
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-baseline">
            <span className="text-2xl font-bold text-orange-600">
              {stats.pendingCount}
            </span>
            <span className="text-sm text-gray-500 ml-1">개</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            집중해서 완료해보세요
          </p>
        </CardContent>
      </Card>

      {/* 완료된 할일 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center text-gray-600">
            <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" />
            완료
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-baseline">
            <span className="text-2xl font-bold text-green-600">
              {stats.completedCount}
            </span>
            <span className="text-sm text-gray-500 ml-1">개</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            훌륭한 성과입니다!
          </p>
        </CardContent>
      </Card>

      {/* 오늘 완료한 할일 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center text-gray-600">
            <Calendar className="w-4 h-4 mr-2 text-blue-500" />
            오늘
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-baseline">
            <span className="text-2xl font-bold text-blue-600">
              {stats.todayCompleted}
            </span>
            <span className="text-sm text-gray-500 ml-1">개</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            오늘 완료한 할일
          </p>
        </CardContent>
      </Card>

      {/* 생산성 지표 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center text-gray-600">
            <TrendingUp className="w-4 h-4 mr-2 text-purple-500" />
            완료율
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-baseline">
            <span className="text-2xl font-bold text-purple-600">
              {stats.completionRate.toFixed(0)}
            </span>
            <span className="text-sm text-gray-500 ml-1">%</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            전체 완료율
          </p>
        </CardContent>
      </Card>

      {/* 할일 분석 */}
      {stats.totalCount > 0 && (
        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold flex items-center">
              <BarChart3 className="w-5 h-5 mr-2 text-indigo-500" />
              할일 분석
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">평균 일일 완료:</span>
                  <span className="font-medium">
                    {Math.round(stats.todayCompleted)}개
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">진행 상황:</span>
                  <span className={`font-medium ${
                    progressPercentage >= 70 ? 'text-green-600' : 
                    progressPercentage >= 40 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {progressPercentage >= 70 ? '우수' : 
                     progressPercentage >= 40 ? '보통' : '개선 필요'}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">목표 달성:</span>
                  <span className="font-medium">
                    {progressPercentage >= 80 ? '달성' : '진행 중'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">다음 목표:</span>
                  <span className="font-medium text-blue-600">
                    {stats.pendingCount > 0 ? `${Math.min(3, stats.pendingCount)}개 더` : '새 할일 추가'}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}