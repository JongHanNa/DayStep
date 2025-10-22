'use client';

import React from 'react';
import { useTimelineViewStore } from '@/state/stores/timelineViewStore';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, X } from 'lucide-react';
import { TimelineItemType } from '@/types/timeline-view';

const TimelineFilters: React.FC = () => {
  const {
    filters,
    setFilters,
    resetFilters,
    toggleItemType
  } = useTimelineViewStore();

  const itemTypeLabels: Record<TimelineItemType, string> = {
    'todo': '할 일',
    'calendar': '캘린더 이벤트',
    'gap': '빈 시간',
    'current-time': '현재 시간',
    'remaining-time': '남은 시간'
  };

  const itemTypeColors: Record<TimelineItemType, string> = {
    'todo': 'bg-green-500',
    'calendar': 'bg-blue-500',
    'gap': 'bg-gray-500',
    'current-time': 'bg-red-500',
    'remaining-time': 'bg-indigo-500'
  };

  const priorities = [
    { value: 'high', label: '높음', color: 'bg-red-500' },
    { value: 'medium', label: '보통', color: 'bg-yellow-500' },
    { value: 'low', label: '낮음', color: 'bg-green-500' }
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">필터</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={resetFilters}
          className="h-8 px-2"
        >
          초기화
        </Button>
      </div>

      {/* Search */}
      <div className="space-y-2">
        <Label>검색</Label>
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="제목 또는 설명 검색..."
            value={filters.searchQuery || ''}
            onChange={(e) => setFilters({ searchQuery: e.target.value })}
            className="pl-8"
          />
          {filters.searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFilters({ searchQuery: '' })}
              className="absolute right-1 top-1 h-7 w-7 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Item Types */}
      <div className="space-y-2">
        <Label>항목 유형</Label>
        <div className="space-y-2">
          {(Object.keys(itemTypeLabels) as TimelineItemType[]).map((type) => (
            <div key={type} className="flex items-center space-x-2">
              <Checkbox
                id={`type-${type}`}
                checked={filters.itemTypes.includes(type)}
                onCheckedChange={() => toggleItemType(type)}
              />
              <Label
                htmlFor={`type-${type}`}
                className="flex items-center gap-2 cursor-pointer"
              >
                <div className={`w-3 h-3 rounded-full ${itemTypeColors[type]}`} />
                {itemTypeLabels[type]}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {/* Priority Filter */}
      <div className="space-y-2">
        <Label>우선순위</Label>
        <div className="space-y-2">
          {priorities.map((priority) => (
            <div key={priority.value} className="flex items-center space-x-2">
              <Checkbox
                id={`priority-${priority.value}`}
                checked={filters.priorities?.includes(priority.value as any) ?? true}
                onCheckedChange={(checked) => {
                  const current = filters.priorities || ['high', 'medium', 'low'];
                  if (checked) {
                    setFilters({
                      priorities: [...current, priority.value as any]
                    });
                  } else {
                    setFilters({
                      priorities: current.filter(p => p !== priority.value)
                    });
                  }
                }}
              />
              <Label
                htmlFor={`priority-${priority.value}`}
                className="flex items-center gap-2 cursor-pointer"
              >
                <div className={`w-3 h-3 rounded-full ${priority.color}`} />
                {priority.label}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {/* Status Options */}
      <div className="space-y-2">
        <Label>상태</Label>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="show-completed"
              checked={filters.showCompleted}
              onCheckedChange={(checked) =>
                setFilters({ showCompleted: !!checked })
              }
            />
            <Label htmlFor="show-completed" className="cursor-pointer">
              완료된 항목 표시
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="show-cancelled"
              checked={filters.showCancelled}
              onCheckedChange={(checked) =>
                setFilters({ showCancelled: !!checked })
              }
            />
            <Label htmlFor="show-cancelled" className="cursor-pointer">
              취소된 항목 표시
            </Label>
          </div>
        </div>
      </div>

      {/* Active filters summary */}
      {(filters.searchQuery || 
        filters.itemTypes.length < 4 ||
        !filters.showCompleted ||
        filters.showCancelled ||
        (filters.priorities && filters.priorities.length < 3)) && (
        <div className="pt-2 border-t">
          <div className="flex flex-wrap gap-1">
            {filters.searchQuery && (
              <Badge variant="secondary" className="text-xs">
                검색: {filters.searchQuery}
              </Badge>
            )}
            {filters.itemTypes.length < 4 && (
              <Badge variant="secondary" className="text-xs">
                {filters.itemTypes.length}개 유형
              </Badge>
            )}
            {!filters.showCompleted && (
              <Badge variant="secondary" className="text-xs">
                미완료만
              </Badge>
            )}
            {filters.priorities && filters.priorities.length < 3 && (
              <Badge variant="secondary" className="text-xs">
                {filters.priorities.length}개 우선순위
              </Badge>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TimelineFilters;