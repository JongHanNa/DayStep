import React, {useCallback, useState} from 'react';
import {Text, View, type LayoutChangeEvent} from 'react-native';
import {Gesture, GestureDetector} from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import {isToday, isSameMonth, parseISO} from 'date-fns';
import {TodoChip} from './TodoChip';
import type {MonthTodoSummary} from '@/stores/todoStore';

const DATE_HEADER_HEIGHT = 32; // pt-1(4) + h-6(24) + mb-1(4)
const CHIP_HEIGHT = 14; // fontSize 9 ≈ 12px lineHeight + mb-0.5(2)
const MORE_TEXT_HEIGHT = 14; // "+N 더" 텍스트 높이
const CELL_PADDING_BOTTOM = 4;
const DEFAULT_MAX = 2;

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
  const [maxWithMore, setMaxWithMore] = useState(DEFAULT_MAX);
  const [maxWithout, setMaxWithout] = useState(DEFAULT_MAX);

  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    const content = h - CELL_PADDING_BOTTOM - DATE_HEADER_HEIGHT;
    setMaxWithMore(Math.max(1, Math.floor((content - MORE_TEXT_HEIGHT) / CHIP_HEIGHT)));
    setMaxWithout(Math.max(1, Math.floor(content / CHIP_HEIGHT)));
  }, []);

  const opacity = useSharedValue(1);

  const tap = Gesture.Tap()
    .maxDist(10)
    .onBegin(() => {
      opacity.value = withTiming(0.7, {duration: 100});
    })
    .onFinalize(() => {
      opacity.value = withTiming(1, {duration: 150});
    })
    .onEnd(() => {
      runOnJS(onPress)(dateStr);
    });

  const animatedStyle = useAnimatedStyle(() => ({opacity: opacity.value}));

  const actualMax = todos.length <= maxWithout ? maxWithout : maxWithMore;
  const visibleTodos = todos.slice(0, actualMax);
  const extra = todos.length - actualMax;

  return (
    <GestureDetector gesture={tap}>
      <Animated.View
        onLayout={handleLayout}
        style={[
          {flex: 1, paddingHorizontal: 2, paddingBottom: 4},
          animatedStyle,
        ]}>
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
      </Animated.View>
    </GestureDetector>
  );
}
