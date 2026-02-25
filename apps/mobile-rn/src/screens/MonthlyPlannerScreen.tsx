/**
 * Monthly Planner Screen — 월간 계획하기
 * TickTick 스타일 월 그리드 + 날짜 탭 → 플래너 이동
 */
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import Animated, {FadeInDown} from 'react-native-reanimated';
import {useNavigation} from '@react-navigation/native';
import {ScreenContainer} from '@/components/core';
import {
  TodoFormBottomSheet,
  type TodoFormBottomSheetRef,
} from '@/components/todo/TodoFormBottomSheet';
import {MonthCalendarGrid, MonthlyFAB} from '@/components/monthly-planner';
import {useTodoStore} from '@/stores/todoStore';
import {format, addMonths, subMonths} from 'date-fns';
import {ko} from 'date-fns/locale';
import {ChevronLeft, ChevronRight, CalendarRange} from 'lucide-react-native';

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

export default function MonthlyPlannerScreen() {
  const navigation = useNavigation<any>();
  const {monthViewData, monthViewLoading, fetchTodosForMonthView, setSelectedDate} =
    useTodoStore();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const formSheetRef = useRef<TodoFormBottomSheetRef>(null);

  const loadMonth = useCallback(
    (date: Date) => {
      fetchTodosForMonthView(date.getFullYear(), date.getMonth() + 1);
    },
    [fetchTodosForMonthView],
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
    formSheetRef.current?.openCreate(format(new Date(), 'yyyy-MM-dd'));
  }, []);

  return (
    <ScreenContainer gradient="warmBackground">
      {/* 헤더 */}
      <Animated.View
        entering={FadeInDown.duration(400)}
        className="px-4 pt-2 pb-2 flex-row items-center">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="flex-row items-center"
          hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}>
          <ChevronLeft size={24} color="#374151" />
          <Text className="text-lg font-bold text-gray-800 ml-1">
            월간 계획하기
          </Text>
        </TouchableOpacity>
      </Animated.View>

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
      <View className="flex-row px-2 pb-1">
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
      <ScrollView
        contentContainerStyle={{paddingBottom: 100}}
        showsVerticalScrollIndicator={false}>
        {monthViewLoading || !monthViewData ? (
          <View className="py-20 items-center">
            <ActivityIndicator size="large" color="#3B82F6" />
          </View>
        ) : (
          <MonthCalendarGrid
            currentMonth={currentMonth}
            monthViewData={monthViewData}
            onDayPress={handleDayPress}
          />
        )}

        {/* 안내 문구 */}
        {!monthViewLoading && (
          <View className="items-center mt-6">
            <CalendarRange size={20} color="#D1D5DB" />
            <Text className="text-xs text-gray-400 mt-2 text-center">
              날짜를 탭하면 해당 날의 플래너로 이동해요
            </Text>
          </View>
        )}
      </ScrollView>

      {/* FAB */}
      <MonthlyFAB onPress={handleFABPress} />

      {/* Todo 생성/편집 시트 */}
      <TodoFormBottomSheet ref={formSheetRef} />
    </ScreenContainer>
  );
}
