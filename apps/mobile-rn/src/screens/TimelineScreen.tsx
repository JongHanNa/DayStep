/**
 * Timeline Screen — 일정 계획하기
 * 월별 네비게이션 + 날짜별 그룹 SectionList + 타임라인 카드
 */
import React, {useEffect, useState, useMemo, useCallback} from 'react';
import {
  Text,
  View,
  SectionList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import Animated, {FadeInDown} from 'react-native-reanimated';
import {useNavigation} from '@react-navigation/native';
import {ScreenContainer, AnimatedCard} from '@/components/core';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  Plus,
  CheckCircle2,
  Circle,
} from 'lucide-react-native';
import {useTodoStore} from '@/stores/todoStore';
import {useAuthStore} from '@/stores/authStore';
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isToday,
  parseISO,
} from 'date-fns';
import {ko} from 'date-fns/locale';
import type {Todo} from '@daystep/shared-core';
import {resolveTodoIcon} from '@/lib/iconMap';

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

interface DaySection {
  title: string;
  date: Date;
  data: Todo[];
}

function MonthNavigator({
  currentMonth,
  onPrev,
  onNext,
  onToday,
}: {
  currentMonth: Date;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}) {
  return (
    <View className="flex-row items-center justify-between px-4 py-2">
      <TouchableOpacity onPress={onPrev} hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
        <ChevronLeft size={24} color="#6B7280" />
      </TouchableOpacity>
      <TouchableOpacity onPress={onToday}>
        <Text className="text-base font-bold text-gray-800">
          {format(currentMonth, 'yyyy년 M월', {locale: ko})}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onNext} hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
        <ChevronRight size={24} color="#6B7280" />
      </TouchableOpacity>
    </View>
  );
}

function TimelineItemCard({
  todo,
  onToggle,
}: {
  todo: Todo;
  onToggle: (id: string) => void;
}) {
  const iconColor = todo.color || '#3B82F6';
  const TodoIcon = resolveTodoIcon((todo as any).icon);

  return (
    <View className="mx-4 mb-2">
      <AnimatedCard enterDelay={0} pressable onPress={() => onToggle(todo.id)}>
        <View className="flex-row items-center">
          {/* 완료 토글 */}
          <TouchableOpacity
            onPress={() => onToggle(todo.id)}
            hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
            className="mr-3">
            {todo.completed ? (
              <CheckCircle2 size={22} color="#22C55E" />
            ) : (
              <Circle size={22} color="#D1D5DB" />
            )}
          </TouchableOpacity>

          {/* 아이콘 */}
          {TodoIcon && (
            <View
              className="w-8 h-8 rounded-lg items-center justify-center mr-3"
              style={{backgroundColor: `${iconColor}20`}}>
              <TodoIcon size={16} color={iconColor} />
            </View>
          )}

          {/* 제목 + 시간 */}
          <View className="flex-1">
            <Text
              className={`text-sm font-medium ${
                todo.completed ? 'text-gray-400 line-through' : 'text-gray-800'
              }`}>
              {todo.title}
            </Text>
            {todo.start_time && (
              <View className="flex-row items-center mt-0.5">
                <Clock size={12} color="#9CA3AF" />
                <Text className="text-xs text-gray-400 ml-1">
                  {format(parseISO(todo.start_time), 'HH:mm')}
                  {todo.end_time &&
                    ` ~ ${format(parseISO(todo.end_time), 'HH:mm')}`}
                </Text>
              </View>
            )}
          </View>

          {/* 프로젝트 배지 */}
          {(todo as any).project_ids?.length > 0 && (
            <View className="bg-blue-50 rounded-full px-2 py-0.5">
              <Text className="text-[10px] text-blue-500">P</Text>
            </View>
          )}
        </View>
      </AnimatedCard>
    </View>
  );
}

function DayHeader({date}: {date: Date}) {
  const today = isToday(date);
  const dayOfWeek = date.getDay();

  return (
    <View className="px-4 pt-4 pb-2 flex-row items-center">
      <View
        className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${
          today ? 'bg-blue-500' : 'bg-gray-100'
        }`}>
        <Text
          className={`text-base font-bold ${
            today ? 'text-white' : 'text-gray-700'
          }`}>
          {format(date, 'd')}
        </Text>
      </View>
      <View>
        <Text
          className={`text-sm font-medium ${
            today ? 'text-blue-600' : dayOfWeek === 0 ? 'text-red-500' : dayOfWeek === 6 ? 'text-blue-500' : 'text-gray-600'
          }`}>
          {DAY_LABELS[dayOfWeek]}요일
        </Text>
        {today && <Text className="text-xs text-blue-400">오늘</Text>}
      </View>
    </View>
  );
}

export default function TimelineScreen() {
  const navigation = useNavigation();
  const user = useAuthStore(s => s.user);
  const {fetchAllTodos, toggleTodoCompletion} = useTodoStore();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [allTodos, setAllTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    const todos = await fetchAllTodos(user.id, 90);
    setAllTodos(todos);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const sections = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const days = eachDayOfInterval({start: monthStart, end: monthEnd});

    const result: DaySection[] = [];
    for (const day of days) {
      const dayStr = format(day, 'yyyy-MM-dd');
      const dayTodos = allTodos.filter(t => {
        if (!t.start_time) return false;
        return format(parseISO(t.start_time), 'yyyy-MM-dd') === dayStr;
      });

      if (dayTodos.length > 0) {
        result.push({
          title: dayStr,
          date: day,
          data: dayTodos.sort((a, b) => {
            if (!a.start_time || !b.start_time) return 0;
            return a.start_time.localeCompare(b.start_time);
          }),
        });
      }
    }

    return result;
  }, [allTodos, currentMonth]);

  const handleToggle = useCallback(
    async (todoId: string) => {
      await toggleTodoCompletion(todoId);
      loadData();
    },
    [toggleTodoCompletion, loadData],
  );

  return (
    <ScreenContainer gradient="warmBackground">
      {/* 뒤로가기 헤더 */}
      <Animated.View
        entering={FadeInDown.duration(400)}
        className="px-4 pt-2 pb-2 flex-row items-center">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="flex-row items-center"
          hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}>
          <ChevronLeft size={24} color="#374151" />
          <Text className="text-lg font-bold text-gray-800 ml-1">
            일정 계획하기
          </Text>
        </TouchableOpacity>
      </Animated.View>

      {/* 월 네비게이터 */}
      <MonthNavigator
        currentMonth={currentMonth}
        onPrev={() => setCurrentMonth(subMonths(currentMonth, 1))}
        onNext={() => setCurrentMonth(addMonths(currentMonth, 1))}
        onToday={() => setCurrentMonth(new Date())}
      />

      {/* 타임라인 목록 */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : sections.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Calendar size={48} color="#D1D5DB" />
          <Text className="text-gray-400 mt-4 text-center">
            이 달에 일정이 없어요
          </Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={item => item.id}
          renderSectionHeader={({section}) => <DayHeader date={section.date} />}
          renderItem={({item}) => (
            <TimelineItemCard todo={item} onToggle={handleToggle} />
          )}
          contentContainerStyle={{paddingBottom: 100}}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
        />
      )}
    </ScreenContainer>
  );
}
