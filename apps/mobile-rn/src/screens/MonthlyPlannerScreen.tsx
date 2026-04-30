/**
 * Monthly Planner Screen — 월간 계획하기
 * 네이티브 SwiftUI 월간 캘린더 + 날짜 탭 → 상세 패널 → Planner 이동
 */
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {ScreenContainer, AnimatedPressable} from '@/components/core';
import {CalendarRange} from 'lucide-react-native';
import {
  TodoFormBottomSheet,
  type TodoFormBottomSheetRef,
} from '@/components/todo/TodoFormBottomSheet';
import {MonthlyFAB} from '@/components/monthly-planner';
import {NativeMonthCalendarNative} from '@/components/native';
import {useTodoStore} from '@/stores/todoStore';
import {useCalendarStore} from '@/stores/calendarStore';
import {format, parseISO} from 'date-fns';
import {useTheme} from '@/theme';

export default function MonthlyPlannerScreen() {
  const navigation = useNavigation<any>();
  const {primaryColor} = useTheme();
  const {monthViewData, fetchTodosForMonthView, setSelectedDate, selectedDate} =
    useTodoStore();
  const dataVersion = useTodoStore(s => s.dataVersion);
  const {isConnected, monthEvents, fetchEventsForMonth} = useCalendarStore();

  const insets = useSafeAreaInsets();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const formSheetRef = useRef<TodoFormBottomSheetRef>(null);

  const loadMonth = useCallback(
    (date: Date) => {
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      fetchTodosForMonthView(year, month);
      if (isConnected) {
        fetchEventsForMonth(year, month);
      }
    },
    [fetchTodosForMonthView, isConnected, fetchEventsForMonth],
  );

  useEffect(() => {
    loadMonth(currentMonth);
  }, [currentMonth, loadMonth, dataVersion]);

  const handleDayPress = useCallback(
    (dateStr: string) => {
      setSelectedDate(dateStr);
    },
    [setSelectedDate],
  );

  const handleMonthChange = useCallback(
    (year: number, month: number) => {
      const d = new Date(year, month - 1, 1);
      setCurrentMonth(d);
    },
    [],
  );

  const handleNavigateToPlanner = useCallback(
    (dateStr: string) => {
      setSelectedDate(dateStr);
      navigation.navigate('Planner', {initialPage: 0});
    },
    [setSelectedDate, navigation],
  );

  const handleFABPress = useCallback(() => {
    // selectedDate가 현재 표시 월에 속하면 그 날짜로, 아니면 월 1일로 fallback
    const sel = parseISO(selectedDate);
    const inCurrentMonth =
      sel.getFullYear() === currentMonth.getFullYear() &&
      sel.getMonth() === currentMonth.getMonth();
    const target = inCurrentMonth ? selectedDate : format(currentMonth, 'yyyy-MM-dd');
    formSheetRef.current?.openCreate(target);
  }, [currentMonth, selectedDate]);

  const monthDataJson = useMemo(
    () => JSON.stringify(monthViewData ?? {}),
    [monthViewData],
  );

  const eventDataJson = useMemo(
    () => JSON.stringify(isConnected ? monthEvents : {}),
    [isConnected, monthEvents],
  );

  return (
    <ScreenContainer gradient="warmBackground">
      {/* 네이티브 월간 캘린더 + 뷰 전환 오버레이 */}
      <View style={{flex: 1, paddingBottom: 64 + insets.bottom, position: 'relative'}}>
        <NativeMonthCalendarNative
          selectedDate=""
          primaryColor={primaryColor}
          monthData={monthDataJson}
          eventData={eventDataJson}
          onDateSelect={e => handleDayPress(e.nativeEvent.date)}
          onMonthChange={e => {
            handleMonthChange(e.nativeEvent.year, e.nativeEvent.month);
          }}
          onNavigateToPlanner={e => {
            handleNavigateToPlanner(e.nativeEvent.date);
          }}
          onHeightChange={() => {}}
          style={{flex: 1}}
        />
        {/* 헤더 중앙 뷰 전환 아이콘 */}
        <View style={{position: 'absolute', top: 8, left: 0, right: 0, alignItems: 'center', zIndex: 10}} pointerEvents="box-none">
          <AnimatedPressable
            onPress={() => navigation.navigate('Planner')}
            style={{padding: 6}}>
            <CalendarRange size={22} color="#6B7280" />
          </AnimatedPressable>
        </View>
      </View>

      {/* FAB */}
      <MonthlyFAB onPress={handleFABPress} />

      {/* Todo 생성/편집 시트 */}
      <TodoFormBottomSheet ref={formSheetRef} />
    </ScreenContainer>
  );
}
