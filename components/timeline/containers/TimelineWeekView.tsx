'use client';

import React from 'react';
import { useTimelineViewStore } from '@/state/stores/timelineViewStore';
import { format, isToday, isSameDay } from 'date-fns';
import { ko } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const TimelineWeekView: React.FC = () => {
  const { weekData } = useTimelineViewStore();

  if (!weekData) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        데이터를 불러오는 중...
      </div>
    );
  }

  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];

  return (
    <div className="h-full overflow-auto">
      {/* Week header */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="grid grid-cols-7 divide-x">
          {weekData.days.map((day, index) => (
            <div
              key={index}
              className={cn(
                'p-3 text-center',
                isToday(day.date) && 'bg-accent',
                index === 0 && 'text-red-500',
                index === 6 && 'text-blue-500'
              )}
            >
              <div className="text-sm font-medium">
                {dayNames[index]}
              </div>
              <div className="text-lg font-semibold">
                {format(day.date, 'd')}
              </div>
              {day.totalItems > 0 && (
                <div className="text-xs text-muted-foreground mt-1">
                  {day.totalItems}개 항목
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Week content */}
      <div className="grid grid-cols-7 divide-x min-h-[600px]">
        {weekData.days.map((day, dayIndex) => (
          <div
            key={dayIndex}
            className={cn(
              'p-2 space-y-2 overflow-hidden',
              isToday(day.date) && 'bg-accent/10'
            )}
          >
            {/* All day items */}
            {day.allDayItems.length > 0 && (
              <div className="space-y-1">
                {day.allDayItems.map((item) => (
                  <div
                    key={item.id}
                    className={cn(
                      'p-2 rounded text-xs cursor-pointer transition-all',
                      'hover:shadow-sm bg-background border',
                      'hover:bg-accent'
                    )}
                    style={{
                      borderLeftWidth: '3px',
                      borderLeftColor: item.color || 'hsl(var(--status-pending))'
                    }}
                  >
                    <div className="font-medium truncate">{item.title}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {item.type === 'todo' && '할 일'}
                      {item.type === 'repository' && '보관함'}
                      {item.type === 'timeline-task' && '작업'}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Timed items */}
            {day.hourSlots.some(slot => slot.items.length > 0) && (
              <div className="space-y-1 pt-2 border-t">
                {day.hourSlots
                  .filter(slot => slot.items.length > 0)
                  .map((slot) => (
                    <div key={slot.hour} className="space-y-1">
                      {slot.items.map((item) => (
                        <div
                          key={item.id}
                          className={cn(
                            'p-1.5 rounded text-xs cursor-pointer transition-all',
                            'hover:shadow-sm bg-background border',
                            'hover:bg-accent'
                          )}
                          style={{
                            borderLeftWidth: '3px',
                            borderLeftColor: item.color || 'hsl(var(--status-pending))'
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="font-medium truncate flex-1">
                              {item.title}
                            </div>
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {format(item.startTime, 'HH:mm')}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
              </div>
            )}

            {/* Empty state */}
            {day.totalItems === 0 && (
              <div className="text-center text-xs text-muted-foreground pt-4">
                일정 없음
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TimelineWeekView;