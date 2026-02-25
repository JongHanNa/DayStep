import React, {useMemo} from 'react';
import {View, FlatList, Dimensions} from 'react-native';
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

const CELL_WIDTH = (Dimensions.get('window').width - 16) / 7;

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
  const calendarDays = useMemo(() => {
    const gridStart = startOfWeek(startOfMonth(currentMonth), {weekStartsOn: 0});
    const gridEnd = endOfWeek(endOfMonth(currentMonth), {weekStartsOn: 0});
    return eachDayOfInterval({start: gridStart, end: gridEnd}).map(d =>
      format(d, 'yyyy-MM-dd'),
    );
  }, [currentMonth]);

  return (
    <FlatList
      data={calendarDays}
      numColumns={7}
      keyExtractor={item => item}
      scrollEnabled={false}
      renderItem={({item}) => (
        <CalendarDayCell
          dateStr={item}
          currentMonth={currentMonth}
          todos={monthViewData[item] ?? []}
          onPress={onDayPress}
        />
      )}
      contentContainerStyle={{paddingHorizontal: 8}}
      columnWrapperStyle={{borderBottomWidth: 0.5, borderBottomColor: '#F3F4F6'}}
    />
  );
}
