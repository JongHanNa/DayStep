import React from 'react';
import {Text, View, TouchableOpacity} from 'react-native';
import {isToday, isSameMonth, parseISO} from 'date-fns';
import {TodoChip} from './TodoChip';
import type {MonthTodoSummary} from '@/stores/todoStore';

interface CalendarDayCellProps {
  dateStr: string; // 'YYYY-MM-DD'
  currentMonth: Date;
  todos: MonthTodoSummary[];
  onPress: (dateStr: string) => void;
}

export function CalendarDayCell({
  dateStr,
  currentMonth,
  todos,
  onPress,
}: CalendarDayCellProps) {
  const date = parseISO(dateStr);
  const today = isToday(date);
  const inMonth = isSameMonth(date, currentMonth);
  const visibleTodos = todos.slice(0, 2);
  const extra = todos.length - 2;

  return (
    <TouchableOpacity
      onPress={() => onPress(dateStr)}
      activeOpacity={0.7}
      style={{flex: 1, paddingHorizontal: 2, paddingBottom: 4}}>
      {/* 날짜 숫자 */}
      <View className="items-center mb-1 pt-1">
        <View
          className="w-6 h-6 rounded-full items-center justify-center"
          style={today ? {backgroundColor: '#3B82F6'} : undefined}>
          <Text
            style={{
              fontSize: 12,
              fontWeight: today ? '700' : '400',
              color: today ? '#FFFFFF' : inMonth ? '#1F2937' : '#D1D5DB',
            }}>
            {date.getDate()}
          </Text>
        </View>
      </View>

      {/* Todo 칩 */}
      {visibleTodos.map(todo => (
        <TodoChip key={todo.id} todo={todo} />
      ))}
      {extra > 0 && (
        <Text style={{fontSize: 9, color: '#9CA3AF', textAlign: 'center'}}>
          +{extra} 더
        </Text>
      )}
    </TouchableOpacity>
  );
}
