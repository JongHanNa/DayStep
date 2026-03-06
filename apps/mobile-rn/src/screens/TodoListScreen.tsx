/**
 * Daily Planner Screen
 * - Page 0: 시간대별 할일 (오전/오후/저녁) + 날짜 네비게이션 + FAB + 바텀시트
 * - Page 1: 우선순위 매트릭스 + 하기 싫어도 해야 할 일 + 보상/칭찬/감사
 */
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Text, View, SectionList, RefreshControl, StyleSheet} from 'react-native';
import Animated, {FadeInDown, FadeIn} from 'react-native-reanimated';
import {useRoute, useFocusEffect, useNavigation} from '@react-navigation/native';
import {ScreenContainer, AnimatedPressable} from '@/components/core';
import {useFocusRefetch} from '@/hooks/useFocusRefetch';
import {TodoCard} from '@/components/todo/TodoCard';
import {
  TodoFormBottomSheet,
  type TodoFormBottomSheetRef,
} from '@/components/todo/TodoFormBottomSheet';
import {
  PostponeBottomSheet,
  type PostponeAction,
} from '@/components/todo/PostponeBottomSheet';
import {SwipeablePages, type SwipeablePagesRef} from '@/components/core/SwipeablePages';
import {PlannerPage2} from '@/components/planner/PlannerPage2';
import {
  TodoPickerSheet,
  type TodoPickerSheetRef,
} from '@/components/planner/TodoPickerSheet';
import {DndProvider, useDnd} from '@/components/planner/DndContext';
import {DraggableTodoChip} from '@/components/planner/DraggableTodoChip';
import {useTodoStore} from '@/stores/todoStore';
import {useTheme} from '@/theme';
import {format, addDays, subDays} from 'date-fns';
import {ko} from 'date-fns/locale';
import type {Todo} from '@daystep/shared-core';
import {Sunrise, Sun, Moon, Infinity, Inbox} from 'lucide-react-native';
import type {LucideIcon} from 'lucide-react-native';

type TimePeriod = 'morning' | 'afternoon' | 'evening' | 'anytime';

const SECTION_ICONS: Record<TimePeriod, {Icon: LucideIcon; color: string}> = {
  morning: {Icon: Sunrise, color: '#F59E0B'},
  afternoon: {Icon: Sun, color: '#F97316'},
  evening: {Icon: Moon, color: '#8B5CF6'},
  anytime: {Icon: Infinity, color: '#10B981'},
};

interface TodoSection {
  title: string;
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

  // 시간순 정렬 헬퍼
  const byStartTime = (a: Todo, b: Todo) =>
    new Date(a.start_time!).getTime() - new Date(b.start_time!).getTime();

  morning.sort(byStartTime);
  afternoon.sort(byStartTime);
  evening.sort(byStartTime);

  const sections: TodoSection[] = [];
  if (anytime.length > 0) sections.push({title: '언제든지', period: 'anytime', data: anytime});
  if (morning.length > 0) sections.push({title: '오전', period: 'morning', data: morning});
  if (afternoon.length > 0) sections.push({title: '오후', period: 'afternoon', data: afternoon});
  if (evening.length > 0) sections.push({title: '저녁', period: 'evening', data: evening});

  return sections;
}

export default function TodoListScreen() {
  return (
    <DndProvider>
      <TodoListScreenInner />
    </DndProvider>
  );
}

function TodoListScreenInner() {
  const {
    todos,
    selectedDate,
    loading,
    fuelMap,
    setSelectedDate,
    fetchTodosForDate,
    fetchFuelsForTodos,
    toggleTodoCompletion,
    updateTodo,
    skipTodo,
    unskipTodo,
    postponeTodo,
    restoreDeferredTodo,
  } = useTodoStore();
  const {primaryColor} = useTheme();
  const route = useRoute<any>();
  const formRef = useRef<TodoFormBottomSheetRef>(null);
  const pickerRef = useRef<TodoPickerSheetRef>(null);
  const navigation = useNavigation<any>();
  const pagesRef = useRef<SwipeablePagesRef>(null);
  const {dragState, setPagesRef, currentPageRef, triggerRemeasure} = useDnd();

  // PostponeBottomSheet 상태
  const [postponingTodo, setPostponingTodo] = useState<Todo | null>(null);
  const [showPostponeSheet, setShowPostponeSheet] = useState(false);

  useEffect(() => {
    fetchTodosForDate(selectedDate);
  }, []);

  // 화면 포커스 시 데이터 재조회 (다른 탭 갔다 돌아올 때)
  useFocusRefetch(useCallback(() => {
    fetchTodosForDate(selectedDate);
  }, [selectedDate, fetchTodosForDate]));

  // todos 변경 시 fuel 데이터 로드
  useEffect(() => {
    const todoIds = todos.map(t => t.id).filter(id => !id.startsWith('temp_'));
    if (todoIds.length > 0) {
      fetchFuelsForTodos(todoIds);
    }
  }, [todos, fetchFuelsForTodos]);

  // HomeScreen에서 initialPage param으로 특정 페이지 이동
  useFocusEffect(
    useCallback(() => {
      const page = route.params?.initialPage;
      if (page != null && pagesRef.current) {
        pagesRef.current.scrollTo(page);
      }
    }, [route.params?.initialPage]),
  );

  // DnD에 SwipeablePages ref 등록
  useEffect(() => {
    if (pagesRef.current) setPagesRef(pagesRef.current);
    return () => setPagesRef(null);
  }, [setPagesRef]);

  // 페이지 전환 시 currentPageRef 동기화 + 드롭존 재측정
  const handlePageChange = useCallback(
    (page: number) => {
      currentPageRef.current = page;
      // 페이지 전환 애니메이션 후 드롭존 좌표 재측정
      setTimeout(() => {
        triggerRemeasure();
      }, 400);
    },
    [currentPageRef, triggerRemeasure],
  );

  // 드래그 앤 드롭 완료 핸들러
  const handleDrop = useCallback(
    (todo: Todo, zoneType: string, zoneData?: Record<string, any>) => {
      if (zoneType === 'matrix' && zoneData) {
        updateTodo(todo.id, {
          importance: zoneData.importance,
          urgency: zoneData.urgency,
        } as any);
      } else if (zoneType === 'reluctant') {
        updateTodo(todo.id, {is_reluctant_must_do: true} as any);
      }
    },
    [updateTodo],
  );

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

  const handleTodoPress = useCallback((todo: Todo) => {
    formRef.current?.openEdit(todo);
  }, []);

  const handleFocusTodo = useCallback((todo: Todo) => {
    let durationSeconds = 25 * 60; // 기본 25분
    if (todo.start_time && todo.end_time) {
      const diff = new Date(todo.end_time).getTime() - new Date(todo.start_time).getTime();
      durationSeconds = Math.max(Math.round(diff / 1000), 60);
    } else if ((todo as any).anytime_duration) {
      durationSeconds = (todo as any).anytime_duration * 60;
    }

    navigation.navigate('Execute', {
      screen: 'FocusTimer',
      params: {
        mode: 'todo',
        todoId: todo.id,
        todoTitle: todo.title,
        durationSeconds,
      },
    });
  }, [navigation]);

  const handleAddTodo = useCallback(() => {
    formRef.current?.openCreate(selectedDate);
  }, [selectedDate]);

  // TodoPickerSheet 콜백 (PlannerPage2 → ScreenContainer 레벨)
  const handleMatrixAdd = useCallback(
    (importance: boolean, urgency: boolean) => {
      pickerRef.current?.open({type: 'matrix', importance, urgency});
    },
    [],
  );

  const handleReluctantAdd = useCallback(() => {
    pickerRef.current?.open({type: 'reluctant'});
  }, []);

  // skip 핸들러
  const handleSkipTodo = useCallback(
    (id: string, reason: 'not_needed' | 'missed') => {
      skipTodo(id, reason);
    },
    [skipTodo],
  );

  // unskip 핸들러
  const handleUnskipTodo = useCallback(
    (todo: Todo) => {
      unskipTodo(todo.id);
    },
    [unskipTodo],
  );

  // 미룸 복원 핸들러
  const handleRestoreOriginal = useCallback(async (todo: Todo) => {
    await restoreDeferredTodo(todo.id);
  }, [restoreDeferredTodo]);

  // postpone 핸들러: 바텀시트 열기
  const handlePostpone = useCallback((todo: Todo) => {
    setPostponingTodo(todo);
    setShowPostponeSheet(true);
  }, []);

  // postpone 확인 핸들러
  const handlePostponeConfirm = useCallback(
    async (action: PostponeAction, newTime?: string) => {
      if (!postponingTodo) return;

      if (action === 'start_now') {
        // FocusTimer로 이동
        setShowPostponeSheet(false);
        setPostponingTodo(null);

        const isRecurring =
          postponingTodo.recurrence_pattern &&
          postponingTodo.recurrence_pattern !== 'none';
        if (isRecurring) {
          // 반복 할일: exclusion + 독립 할일 생성 후 FocusTimer
          await postponeTodo(postponingTodo.id, 'start_now');
        }
        handleFocusTodo(postponingTodo);
        return;
      }

      await postponeTodo(postponingTodo.id, action, newTime);
      setShowPostponeSheet(false);
      setPostponingTodo(null);
      // 데이터 새로고침
      fetchTodosForDate(selectedDate);
    },
    [postponingTodo, postponeTodo, handleFocusTodo, fetchTodosForDate, selectedDate],
  );

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

      <SwipeablePages ref={pagesRef} isDragging={dragState.isDragging} onPageChange={handlePageChange}>
        {/* Page 0: 시간대별 할일 리스트 */}
        <View style={{flex: 1}}>
          <SectionList
            sections={sections}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{paddingHorizontal: 4, paddingBottom: 100}}
            stickySectionHeadersEnabled={false}
            scrollEnabled={!dragState.isDragging}
            refreshControl={
              <RefreshControl refreshing={loading} onRefresh={handleRefresh} />
            }
            renderSectionHeader={({section}) => {
              const iconConfig = SECTION_ICONS[section.period];
              const SectionIcon = iconConfig.Icon;
              return (
                <View className="flex-row items-center mt-4 mb-2">
                  <SectionIcon size={16} color={iconConfig.color} strokeWidth={2} />
                  <Text className="text-sm font-semibold text-gray-500 ml-2">
                    {section.title}
                  </Text>
                  <Text className="text-xs text-gray-400 ml-2">
                    {section.data.length}개
                  </Text>
                </View>
              );
            }}
            renderItem={({item, index}) => (
              <DraggableTodoChip todo={item} onDrop={handleDrop}>
                <TodoCard
                  todo={item}
                  index={index}
                  onToggle={handleToggle}
                  onPress={handleTodoPress}
                  onFocus={handleFocusTodo}
                  onSkipTodo={handleSkipTodo}
                  onUnskipTodo={handleUnskipTodo}
                  onPostpone={handlePostpone}
                  onDeferComplete={(todo) => handleToggle(todo.id)}
                  onRestoreOriginal={handleRestoreOriginal}
                  linkedFuels={fuelMap[item.id]}
                />
              </DraggableTodoChip>
            )}
            ListEmptyComponent={
              <View className="flex-1 justify-center items-center py-20">
                <Animated.View entering={FadeInDown.duration(400)} className="items-center">
                  <Inbox size={48} color="#9CA3AF" strokeWidth={1.5} />
                  <Text className="text-base text-gray-500 text-center mt-4">
                    이 날짜에 할일이 없어요{'\n'}
                    + 버튼으로 추가해보세요
                  </Text>
                </Animated.View>
              </View>
            }
          />
        </View>

        {/* Page 1: 우선순위 매트릭스 + 하기 싫지만 해야 할 일 + 보상/칭찬/감사 */}
        <PlannerPage2 onMatrixAdd={handleMatrixAdd} onReluctantAdd={handleReluctantAdd} />
      </SwipeablePages>

      {/* FAB (할일 추가) */}
      <Animated.View entering={FadeIn.delay(400).duration(300)} style={styles.fabContainer}>
        <AnimatedPressable
          onPress={handleAddTodo}
          hapticType="medium"
          scaleValue={0.9}
          style={[styles.fab, {backgroundColor: primaryColor}]}>
          <Text style={styles.fabText}>+</Text>
        </AnimatedPressable>
      </Animated.View>

      {/* 할일 피커 바텀시트 (우선순위 매트릭스/하기 싫은 일) */}
      <TodoPickerSheet ref={pickerRef} />

      {/* 할일 폼 바텀시트 */}
      <TodoFormBottomSheet ref={formRef} />

      {/* 미루기 바텀시트 */}
      <PostponeBottomSheet
        visible={showPostponeSheet}
        todo={postponingTodo}
        onClose={() => {
          setShowPostponeSheet(false);
          setPostponingTodo(null);
        }}
        onConfirm={handlePostponeConfirm}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  fabContainer: {
    position: 'absolute',
    right: 20,
    bottom: 100,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  fabText: {
    fontSize: 28,
    fontWeight: '300',
    color: '#FFFFFF',
    marginTop: -2,
  },
});
