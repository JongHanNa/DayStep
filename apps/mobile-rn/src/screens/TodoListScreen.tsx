/**
 * Daily Planner Screen
 * - Page 0: 시간대별 할일 (오전/오후/저녁) + 날짜 네비게이션 + FAB + 바텀시트
 * - Page 1: 우선순위 매트릭스 + 하기 싫어도 해야 할 일 + 보상/칭찬/감사
 */
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Text, View, SectionList, RefreshControl, StyleSheet, Alert} from 'react-native';
import {NativeWeekStripCalendarNative} from '@/components/native';
import Animated, {FadeInDown, FadeIn, useSharedValue, useAnimatedStyle, withSpring} from 'react-native-reanimated';
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
  type PostponeBottomSheetRef,
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
import {useProjectStore} from '@/stores/projectStore';
import {useAuthStore} from '@/stores/authStore';
import {usePomodoroStore} from '@/stores/pomodoroStore';
import {useTheme} from '@/theme';
import {format} from 'date-fns';
import {springs} from '@/theme/animations';
import type {Todo} from '@daystep/shared-core';
import {Inbox} from 'lucide-react-native';

type TimePeriod = 'morning' | 'afternoon' | 'evening' | 'anytime' | 'deferred';

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
  const deferred: Todo[] = [];

  for (const todo of todos) {
    if (!todo.start_time || todo.schedule_type === 'anytime') {
      if ((todo as any).original_start_time) {
        deferred.push(todo);
      } else {
        anytime.push(todo);
      }
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
  if (deferred.length > 0) sections.push({title: '미룸', period: 'deferred', data: deferred});
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
  const {projects, fetchProjects} = useProjectStore();
  const user = useAuthStore(s => s.user);

  // 프로젝트 맵 생성
  const projectMap = useMemo(() => {
    const map = new Map<string, {title: string; color: string; icon?: string}>();
    for (const p of projects) {
      map.set(p.id, {title: p.title, color: p.color, icon: p.icon});
    }
    return map;
  }, [projects]);

  // 화면 포커스 시 프로젝트 데이터 로드
  useFocusEffect(
    useCallback(() => {
      if (user?.id) fetchProjects(user.id);
    }, [user?.id, fetchProjects]),
  );
  const route = useRoute<any>();
  const formRef = useRef<TodoFormBottomSheetRef>(null);
  const pickerRef = useRef<TodoPickerSheetRef>(null);
  const navigation = useNavigation<any>();
  const pagesRef = useRef<SwipeablePagesRef>(null);
  const {dragState, setPagesRef, currentPageRef, triggerRemeasure} = useDnd();

  // PostponeBottomSheet ref
  const postponeRef = useRef<PostponeBottomSheetRef>(null);
  const postponingTodoRef = useRef<Todo | null>(null);

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

  // "다음 일정" 계산을 위한 now state (60초마다 갱신)
  const [nowForUpcoming, setNowForUpcoming] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowForUpcoming(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  // 다음 일정 할일 ID: 시간 지정 + 미완료 + start_time > now 중 가장 빠른 것
  const nextUpcomingId = useMemo(() => {
    const nowMs = nowForUpcoming;
    let earliest: {id: string; startMs: number} | null = null;
    for (const todo of todos) {
      if (todo.completed || !todo.start_time || todo.schedule_type === 'anytime') continue;
      if ((todo as any).skip_status) continue;
      const startMs = new Date(todo.start_time).getTime();
      if (startMs > nowMs) {
        if (!earliest || startMs < earliest.startMs) {
          earliest = {id: todo.id, startMs};
        }
      }
    }
    return earliest?.id ?? null;
  }, [todos, nowForUpcoming]);

  const sections = useMemo(() => categorizeTodos(todos), [todos]);
  const isToday = selectedDate === format(new Date(), 'yyyy-MM-dd');

  // 주간 스트립 캘린더 높이
  const calendarHeight = useSharedValue(0);
  const calendarHeightStyle = useAnimatedStyle(() => ({
    height: calendarHeight.value > 0 ? calendarHeight.value : undefined,
    overflow: 'hidden' as const,
  }));

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
    // 미뤄둔 할일 클릭 차단 (웹과 동일)
    const isDeferred = !!(todo as any).parent_recurring_todo_id
      && !!(todo as any).original_start_time;

    if (isDeferred) {
      if (todo.completed) {
        Alert.alert('완료된 미룸 항목', '체크 버튼을 눌러 되돌릴 수 있어요');
      } else {
        Alert.alert('미룸 할일', '"미룸완료" 또는 "원래대로 복원"을 사용하세요');
      }
      return;
    }

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

    // pomodoroStore에서 직접 타이머 시작 후 Execute 탭으로 이동
    usePomodoroStore.getState().startFocusTimer(
      durationSeconds,
      'todo',
      todo.id,
      todo.title,
    );
    navigation.navigate('Execute');
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
    postponingTodoRef.current = todo;
    postponeRef.current?.open(todo);
  }, []);

  // postpone 확인 핸들러
  const handlePostponeConfirm = useCallback(
    async (action: PostponeAction, newTime?: string) => {
      const target = postponingTodoRef.current;
      if (!target) return;

      if (action === 'start_now') {
        const isRecurring =
          target.recurrence_pattern &&
          target.recurrence_pattern !== 'none';
        if (isRecurring) {
          await postponeTodo(target.id, 'start_now');
        }
        postponingTodoRef.current = null;
        handleFocusTodo(target);
        return;
      }

      await postponeTodo(target.id, action, newTime);
      postponingTodoRef.current = null;
      fetchTodosForDate(selectedDate);
    },
    [postponeTodo, handleFocusTodo, fetchTodosForDate, selectedDate],
  );

  return (
    <ScreenContainer gradient="calmBackground">
      {/* 주간 스트립 캘린더 */}
      <Animated.View style={calendarHeightStyle}>
        <NativeWeekStripCalendarNative
          selectedDate={selectedDate}
          primaryColor={primaryColor}
          onDateSelect={(e) => setSelectedDate(e.nativeEvent.date)}
          onHeightChange={(e) => {
            calendarHeight.value = withSpring(e.nativeEvent.height, springs.nativeGlass);
          }}
          style={StyleSheet.absoluteFill}
        />
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
              return (
                <View className="flex-row items-center mt-4 mb-2">
                  <Text className="text-sm font-semibold text-gray-500">
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
                  projectMap={projectMap}
                  onToggle={handleToggle}
                  onPress={handleTodoPress}
                  onFocus={handleFocusTodo}
                  onSkipTodo={handleSkipTodo}
                  onUnskipTodo={handleUnskipTodo}
                  onPostpone={handlePostpone}
                  onDeferComplete={(todo) => handleToggle(todo.id)}
                  onRestoreOriginal={handleRestoreOriginal}
                  linkedFuels={fuelMap[item.id]}
                  isNextUpcoming={item.id === nextUpcomingId}
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
        ref={postponeRef}
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
