import React, {useCallback, useState} from 'react';
import {Text, View, type LayoutChangeEvent} from 'react-native';
import {useTheme} from '@/theme';
import {fixedColors} from '@/theme/colors';
import {Gesture, GestureDetector} from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import {isToday, isSameMonth, parseISO} from 'date-fns';
import {TodoChip} from './TodoChip';
import {CalendarEventChip} from './CalendarEventChip';
import type {MonthTodoSummary} from '@/stores/todoStore';
import type {GoogleCalendarEvent} from '@/lib/googleCalendarApi';

const DATE_HEADER_HEIGHT = 32; // pt-1(4) + h-6(24) + mb-1(4)
const CHIP_HEIGHT = 14; // fontSize 9 ≈ 12px lineHeight + mb-0.5(2)
const MORE_TEXT_HEIGHT = 14; // "+N 더" 텍스트 높이
const CELL_PADDING_BOTTOM = 4;
const DEFAULT_MAX = 2;

interface CalendarDayCellProps {
  dateStr: string; // 'YYYY-MM-DD'
  currentMonth: Date;
  todos: MonthTodoSummary[];
  calendarEvents?: GoogleCalendarEvent[];
  onPress: (dateStr: string) => void;
}

export function CalendarDayCell({
  dateStr,
  currentMonth,
  todos,
  calendarEvents = [],
  onPress,
}: CalendarDayCellProps) {
  const {primaryColor} = useTheme();
  const date = parseISO(dateStr);
  const today = isToday(date);
  const inMonth = isSameMonth(date, currentMonth);
  const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
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
    .maxDistance(10)
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

  const totalItems = todos.length + calendarEvents.length;
  const actualMax = totalItems <= maxWithout ? maxWithout : maxWithMore;

  // 캘린더 이벤트 먼저, 그 다음 Todo (하루 계획하기와 동일하게 상단 표시)
  const allItems = [
    ...calendarEvents.map(e => ({type: 'event' as const, data: e})),
    ...todos.map(t => ({type: 'todo' as const, data: t})),
  ];
  const visibleItems = allItems.slice(0, actualMax);
  const extra = totalItems - actualMax;

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
            style={today ? {backgroundColor: primaryColor} : undefined}>
            <Text
              style={{
                fontSize: 12,
                fontWeight: today ? '700' : '400',
                color: today
                  ? '#FFFFFF'
                  : !inMonth
                  ? '#D1D5DB'
                  : dayOfWeek === 0
                  ? fixedColors.calendarSunday
                  : dayOfWeek === 6
                  ? fixedColors.calendarSaturday
                  : '#1F2937',
              }}>
              {date.getDate()}
            </Text>
          </View>
        </View>

        {/* Todo + 캘린더 이벤트 칩 */}
        {visibleItems.map(item =>
          item.type === 'todo' ? (
            <TodoChip key={item.data.id} todo={item.data as MonthTodoSummary} />
          ) : (
            <CalendarEventChip
              key={item.data.id}
              event={item.data as GoogleCalendarEvent}
            />
          ),
        )}
        {extra > 0 && (
          <Text style={{fontSize: 9, color: '#9CA3AF', textAlign: 'center'}}>
            +{extra} 더
          </Text>
        )}
      </Animated.View>
    </GestureDetector>
  );
}
