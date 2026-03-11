/**
 * Monthly Planner Screen — 월간 계획하기
 * TickTick 스타일 월 그리드 + 날짜 탭 → 플래너 이동
 */
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {ScreenContainer} from '@/components/core';
import {
  TodoFormBottomSheet,
  type TodoFormBottomSheetRef,
} from '@/components/todo/TodoFormBottomSheet';
import {MonthCalendarGrid, MonthlyFAB} from '@/components/monthly-planner';
import {useTodoStore} from '@/stores/todoStore';
import {useCalendarStore} from '@/stores/calendarStore';
import {format, addMonths, subMonths} from 'date-fns';
import {ko} from 'date-fns/locale';
import {ChevronLeft, ChevronRight} from 'lucide-react-native';

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

export default function MonthlyPlannerScreen() {
  const navigation = useNavigation<any>();
  const {monthViewData, monthViewLoading, fetchTodosForMonthView, setSelectedDate} =
    useTodoStore();
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
  }, [currentMonth, loadMonth]);

  const handlePrevMonth = useCallback(() => {
    setCurrentMonth(prev => subMonths(prev, 1));
  }, []);

  const handleNextMonth = useCallback(() => {
    setCurrentMonth(prev => addMonths(prev, 1));
  }, []);

  const handleTodayMonth = useCallback(() => {
    setCurrentMonth(new Date());
  }, []);

  const handleDayPress = useCallback(
    (dateStr: string) => {
      setSelectedDate(dateStr);
      navigation.navigate('Planner', {initialPage: 0});
    },
    [setSelectedDate, navigation],
  );

  const handleFABPress = useCallback(() => {
    formSheetRef.current?.openCreate(format(currentMonth, 'yyyy-MM-dd'));
  }, [currentMonth]);

  return (
    <ScreenContainer gradient="warmBackground">
      {/* 월 네비게이터 */}
      <View className="flex-row items-center justify-between px-4 py-2">
        <TouchableOpacity
          onPress={handlePrevMonth}
          hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
          <ChevronLeft size={24} color="#6B7280" />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleTodayMonth}>
          <Text className="text-base font-bold text-gray-800">
            {format(currentMonth, 'yyyy년 M월', {locale: ko})}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleNextMonth}
          hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
          <ChevronRight size={24} color="#6B7280" />
        </TouchableOpacity>
      </View>

      {/* 요일 헤더 */}
      <View className="flex-row pb-1">
        {DAY_LABELS.map((label, i) => (
          <View key={label} style={{flex: 1, alignItems: 'center'}}>
            <Text
              style={{
                fontSize: 11,
                fontWeight: '600',
                color: i === 0 ? '#EF4444' : i === 6 ? '#3B82F6' : '#6B7280',
              }}>
              {label}
            </Text>
          </View>
        ))}
      </View>

      {/* 캘린더 그리드 */}
      <View style={{flex: 1, paddingBottom: 64 + insets.bottom}}>
        {monthViewLoading || !monthViewData ? (
          <View className="py-20 items-center">
            <ActivityIndicator size="large" color="#3B82F6" />
          </View>
        ) : (
          <MonthCalendarGrid
            currentMonth={currentMonth}
            monthViewData={monthViewData}
            calendarEvents={isConnected ? monthEvents : undefined}
            onDayPress={handleDayPress}
          />
        )}
      </View>

      {/* FAB */}
      <MonthlyFAB onPress={handleFABPress} />

      {/* Todo 생성/편집 시트 */}
      <TodoFormBottomSheet ref={formSheetRef} />
    </ScreenContainer>
  );
}
