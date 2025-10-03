'use client';

import { useTodoStore } from '@/state/stores/todoStore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle2, 
  Circle, 
  List, 
  SortAsc, 
  SortDesc,
  RotateCcw
} from 'lucide-react';

/**
 * 할일 필터 컴포넌트
 */
export function TodoFilter() {
  const { 
    filters,
    setCompletedFilter,
    setShowCompleted,
    setSortBy,
    todos,
    getPendingTodos,
    getCompletedTodos
  } = useTodoStore();

  const totalCount = todos.length;
  const pendingCount = getPendingTodos().length;
  const completedCount = getCompletedTodos().length;

  const handleCompletedFilterChange = (value: string) => {
    setCompletedFilter(value as 'all' | 'pending' | 'completed');
  };

  const handleSortChange = (value: string) => {
    const [sortBy, sortOrder] = value.split(':');
    setSortBy(sortBy, sortOrder as 'asc' | 'desc');
  };

  const handleToggleCompleted = () => {
    setShowCompleted(!filters.showCompleted);
  };

  const handleReset = () => {
    setCompletedFilter('all');
    setShowCompleted(true);
    setSortBy('order_index', 'asc');
  };

  const getSortValue = () => {
    return `${filters.sortBy}:${filters.sortOrder}`;
  };

  const hasActiveFilters = () => {
    return filters.completed !== 'all' || 
           !filters.showCompleted || 
           filters.sortBy !== 'order_index' || 
           filters.sortOrder !== 'asc';
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* 통계 배지 */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-sm">
              <List className="w-3 h-3 mr-1" />
              전체 {totalCount}
            </Badge>
            <Badge variant="outline" className="text-sm text-orange-600">
              <Circle className="w-3 h-3 mr-1" />
              미완료 {pendingCount}
            </Badge>
            <Badge variant="outline" className="text-sm text-green-600">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              완료 {completedCount}
            </Badge>
          </div>

          {/* 필터 컨트롤 */}
          <div className="flex items-center gap-2 flex-wrap lg:ml-auto">
            {/* 완료 상태 필터 */}
            <Select value={filters.completed} onValueChange={handleCompletedFilterChange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="pending">미완료</SelectItem>
                <SelectItem value="completed">완료</SelectItem>
              </SelectContent>
            </Select>

            {/* 완료된 할일 표시/숨김 */}
            <Button
              variant={filters.showCompleted ? "default" : "outline"}
              size="sm"
              onClick={handleToggleCompleted}
              className="whitespace-nowrap"
            >
              <CheckCircle2 className="w-4 h-4 mr-1" />
              완료된 할일 {filters.showCompleted ? '숨김' : '표시'}
            </Button>

            {/* 정렬 */}
            <Select value={getSortValue()} onValueChange={handleSortChange}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="order_index:asc">
                  <div className="flex items-center">
                    <SortAsc className="w-4 h-4 mr-2" />
                    순서 오름차순
                  </div>
                </SelectItem>
                <SelectItem value="order_index:desc">
                  <div className="flex items-center">
                    <SortDesc className="w-4 h-4 mr-2" />
                    순서 내림차순
                  </div>
                </SelectItem>
                <SelectItem value="created_at:desc">
                  <div className="flex items-center">
                    <SortDesc className="w-4 h-4 mr-2" />
                    최신순
                  </div>
                </SelectItem>
                <SelectItem value="created_at:asc">
                  <div className="flex items-center">
                    <SortAsc className="w-4 h-4 mr-2" />
                    오래된순
                  </div>
                </SelectItem>
                <SelectItem value="updated_at:desc">
                  <div className="flex items-center">
                    <SortDesc className="w-4 h-4 mr-2" />
                    최근 수정순
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>

            {/* 필터 초기화 */}
            {hasActiveFilters() && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                className="text-gray-600 hover:text-gray-900"
              >
                <RotateCcw className="w-4 h-4 mr-1" />
                초기화
              </Button>
            )}
          </div>
        </div>

        {/* 활성 필터 표시 */}
        {hasActiveFilters() && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>활성 필터:</span>
              <div className="flex gap-1 flex-wrap">
                {filters.completed !== 'all' && (
                  <Badge variant="secondary" className="text-xs">
                    {filters.completed === 'pending' ? '미완료' : '완료됨'}
                  </Badge>
                )}
                {!filters.showCompleted && (
                  <Badge variant="secondary" className="text-xs">
                    완료된 할일 숨김
                  </Badge>
                )}
                {(filters.sortBy !== 'order_index' || filters.sortOrder !== 'asc') && (
                  <Badge variant="secondary" className="text-xs">
                    {filters.sortBy === 'created_at' ? '생성' : 
                     filters.sortBy === 'updated_at' ? '수정' : '순서'} 
                    {filters.sortOrder === 'desc' ? ' 내림차순' : ' 오름차순'}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}