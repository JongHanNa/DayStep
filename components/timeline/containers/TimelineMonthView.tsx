'use client';

import React from 'react';
import { useTimelineViewStore } from '@/state/stores/timelineViewStore';
import { format, isToday, isSameMonth, getDate } from 'date-fns';
import { ko } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const TimelineMonthView: React.FC = () => {
  const { monthData, currentDate } = useTimelineViewStore();

  if (!monthData) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        데이터를 불러오는 중...
      </div>
    );
  }

  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];

  return (
    <div className="h-full overflow-auto p-4">
      {/* Month header */}
      <div className="grid grid-cols-7 gap-px mb-2">
        {dayNames.map((day, index) => (
          <div
            key={day}
            className={cn(
              'text-center py-2 text-sm font-semibold',
              index === 0 && 'text-red-500',
              index === 6 && 'text-blue-500'
            )}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Month calendar grid */}
      <div className="space-y-px">
        {monthData.weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 gap-px">
            {week.days.map((day, dayIndex) => {
              const isCurrentMonth = isSameMonth(day.date, currentDate);
              const isCurrentDay = isToday(day.date);
              
              return (
                <div
                  key={dayIndex}
                  className={cn(
                    'min-h-[100px] p-2 bg-background border rounded-lg',
                    'hover:bg-accent/50 transition-colors',
                    !isCurrentMonth && 'opacity-50',
                    isCurrentDay && 'ring-2 ring-primary'
                  )}
                >
                  {/* Day number */}
                  <div className="flex items-start justify-between mb-1">
                    <span
                      className={cn(
                        'text-sm font-medium',
                        isCurrentDay && 'text-primary',
                        dayIndex === 0 && 'text-red-500',
                        dayIndex === 6 && 'text-blue-500'
                      )}
                    >
                      {getDate(day.date)}
                    </span>
                    {day.totalItems > 0 && (
                      <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        {day.totalItems}
                      </span>
                    )}
                  </div>

                  {/* Day items preview */}
                  <div className="space-y-1">
                    {/* Show up to 3 items */}
                    {[...day.allDayItems, ...day.hourSlots.flatMap(slot => slot.items)]
                      .slice(0, 3)
                      .map((item) => (
                        <div
                          key={item.id}
                          className="text-xs p-1 rounded cursor-pointer hover:bg-accent"
                          style={{
                            borderLeft: `2px solid ${item.color || 'hsl(var(--status-pending))'}`
                          }}
                        >
                          <div className="truncate font-medium">
                            {item.title}
                          </div>
                        </div>
                      ))}
                    
                    {/* More items indicator */}
                    {day.totalItems > 3 && (
                      <div className="text-xs text-muted-foreground text-center">
                        +{day.totalItems - 3} 더보기
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Month summary */}
      <div className="mt-6 p-4 bg-muted/30 rounded-lg">
        <h3 className="font-semibold mb-3">월간 요약</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground">전체 항목</div>
            <div className="text-2xl font-semibold">{monthData.totalItems}</div>
          </div>
          <div>
            <div className="text-muted-foreground">주간 평균</div>
            <div className="text-2xl font-semibold">
              {Math.round(monthData.totalItems / monthData.weeks.length)}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">일간 평균</div>
            <div className="text-2xl font-semibold">
              {Math.round(monthData.totalItems / 30)}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">가장 바쁜 주</div>
            <div className="text-2xl font-semibold">
              {Math.max(...monthData.weeks.map(w => w.totalItems))}개
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimelineMonthView;