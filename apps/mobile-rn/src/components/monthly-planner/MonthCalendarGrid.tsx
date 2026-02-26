import React, {useMemo} from 'react';
import {View} from 'react-native';
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
} from 'date-fns';
import {CalendarDayCell} from './CalendarDayCell';
import type {MonthTodoSummary} from '@/stores/todoStore';

interface MonthCalendarGridProps {
  currentMonth: Date;
  monthViewData: Record<string, MonthTodoSummary[]>;
  onDayPress: (dateStr: string) => void;
}

export function MonthCalendarGrid({
  currentMonth,
  monthViewData,
  onDayPress,
}: MonthCalendarGridProps) {
  const rows = useMemo(() => {
    const gridStart = startOfWeek(startOfMonth(currentMonth), {weekStartsOn: 0});
    const gridEnd = endOfWeek(endOfMonth(currentMonth), {weekStartsOn: 0});
    const days = eachDayOfInterval({start: gridStart, end: gridEnd}).map(d =>
      format(d, 'yyyy-MM-dd'),
    );
    const result: string[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      result.push(days.slice(i, i + 7));
    }
    return result;
  }, [currentMonth]);

  return (
    <View style={{flex: 1, paddingHorizontal: 8}}>
      {rows.map((row, rowIdx) => (
        <View
          key={rowIdx}
          style={{
            flex: 1,
            flexDirection: 'row',
            borderBottomWidth: rowIdx < rows.length - 1 ? 0.5 : 0,
            borderBottomColor: '#F3F4F6',
          }}>
          {row.map(dateStr => (
            <CalendarDayCell
              key={dateStr}
              dateStr={dateStr}
              currentMonth={currentMonth}
              todos={monthViewData[dateStr] ?? []}
              onPress={onDayPress}
            />
          ))}
        </View>
      ))}
    </View>
  );
}
