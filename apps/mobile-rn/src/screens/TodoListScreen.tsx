/**
 * Daily Planner Screen
 * 시간대별 할일 (오전/오후/저녁) + 날짜 네비게이션
 */
import React, {useCallback, useEffect, useMemo} from 'react';
import {Text, View, SectionList, RefreshControl} from 'react-native';
import Animated, {FadeInDown, FadeIn} from 'react-native-reanimated';
import {ScreenContainer, AnimatedPressable} from '@/components/core';
import {TodoCard} from '@/components/todo/TodoCard';
import {useTodoStore} from '@/stores/todoStore';
import {useTheme} from '@/theme';
import {format, addDays, subDays} from 'date-fns';
import {ko} from 'date-fns/locale';
import type {Todo} from '@daystep/shared-core';

type TimePeriod = 'morning' | 'afternoon' | 'evening' | 'anytime';

interface TodoSection {
  title: string;
  icon: string;
  period: TimePeriod;
  data: Todo[];
}

function categorizeTodos(todos: Todo[]): TodoSection[] {
  const morning: Todo[] = [];
  const afternoon: Todo[] = [];
  const evening: Todo[] = [];
  const anytime: Todo[] = [];

  for (const todo of todos) {
    if (!todo.start_time || todo.schedule_type === 'anytime') {
      anytime.push(todo);
      continue;
    }
    const hour = new Date(todo.start_time).getHours();
    if (hour < 12) morning.push(todo);
    else if (hour < 18) afternoon.push(todo);
    else evening.push(todo);
  }

  const sections: TodoSection[] = [];
  if (morning.length > 0) sections.push({title: '오전', icon: '🌅', period: 'morning', data: morning});
  if (afternoon.length > 0) sections.push({title: '오후', icon: '☀️', period: 'afternoon', data: afternoon});
  if (evening.length > 0) sections.push({title: '저녁', icon: '🌙', period: 'evening', data: evening});
  if (anytime.length > 0) sections.push({title: '시간 미정', icon: '📋', period: 'anytime', data: anytime});

  return sections;
}

export default function TodoListScreen() {
  const {todos, selectedDate, loading, setSelectedDate, fetchTodosForDate, toggleTodoCompletion} =
    useTodoStore();
  const {primaryColor} = useTheme();

  useEffect(() => {
    fetchTodosForDate(selectedDate);
  }, []);

  const sections = useMemo(() => categorizeTodos(todos), [todos]);
  const dateDisplay = format(new Date(selectedDate), 'M월 d일 EEEE', {locale: ko});
  const isToday = selectedDate === format(new Date(), 'yyyy-MM-dd');

  const goToPrevDay = useCallback(() => {
    const prev = format(subDays(new Date(selectedDate), 1), 'yyyy-MM-dd');
    setSelectedDate(prev);
  }, [selectedDate, setSelectedDate]);

  const goToNextDay = useCallback(() => {
    const next = format(addDays(new Date(selectedDate), 1), 'yyyy-MM-dd');
    setSelectedDate(next);
  }, [selectedDate, setSelectedDate]);

  const goToToday = useCallback(() => {
    setSelectedDate(format(new Date(), 'yyyy-MM-dd'));
  }, [setSelectedDate]);

  const handleToggle = useCallback(
    (id: string) => {
      toggleTodoCompletion(id);
    },
    [toggleTodoCompletion],
  );

  const handleRefresh = useCallback(() => {
    fetchTodosForDate(selectedDate);
  }, [selectedDate, fetchTodosForDate]);

  return (
    <ScreenContainer gradient="calmBackground">
      {/* 날짜 네비게이터 */}
      <Animated.View
        entering={FadeIn.duration(400)}
        className="flex-row items-center justify-between px-5 pt-4 pb-3">
        <AnimatedPressable onPress={goToPrevDay} hapticType="selection" className="p-2">
          <Text className="text-xl text-gray-400">‹</Text>
        </AnimatedPressable>

        <AnimatedPressable onPress={goToToday} haptic={!isToday}>
          <View className="items-center">
            <Text className="text-lg font-bold text-gray-800">{dateDisplay}</Text>
            {!isToday && (
              <Text className="text-xs mt-1" style={{color: primaryColor}}>
                오늘로 돌아가기
              </Text>
            )}
          </View>
        </AnimatedPressable>

        <AnimatedPressable onPress={goToNextDay} hapticType="selection" className="p-2">
          <Text className="text-xl text-gray-400">›</Text>
        </AnimatedPressable>
      </Animated.View>

      {/* 할일 섹션 리스트 */}
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{paddingHorizontal: 16, paddingBottom: 100}}
        stickySectionHeadersEnabled={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={handleRefresh} />
        }
        renderSectionHeader={({section}) => (
          <View className="flex-row items-center mt-4 mb-2">
            <Text className="text-base mr-2">{section.icon}</Text>
            <Text className="text-sm font-semibold text-gray-500">
              {section.title}
            </Text>
            <Text className="text-xs text-gray-400 ml-2">
              {section.data.length}개
            </Text>
          </View>
        )}
        renderItem={({item, index}) => (
          <TodoCard
            todo={item}
            index={index}
            onToggle={handleToggle}
          />
        )}
        ListEmptyComponent={
          <View className="flex-1 justify-center items-center py-20">
            <Animated.Text
              entering={FadeInDown.duration(400)}
              className="text-4xl mb-4">
              📭
            </Animated.Text>
            <Text className="text-base text-gray-500 text-center">
              이 날짜에 할일이 없어요{'\n'}
              + 버튼으로 추가해보세요
            </Text>
          </View>
        }
      />
    </ScreenContainer>
  );
}
