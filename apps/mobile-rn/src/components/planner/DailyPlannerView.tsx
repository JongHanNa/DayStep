/**
 * DailyPlannerView — TodoListScreen 내부 로직 추출
 * PlannerScreen에서 viewMode='dailyPlanner'일 때 렌더링
 * ScreenContainer 없이 내부 컨텐츠만 제공
 */
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Text, View, SectionList, RefreshControl, StyleSheet, Alert, Platform} from 'react-native';
import {NativeWeekStripCalendarNative} from '@/components/native';
import Animated, {FadeInDown, FadeIn, useSharedValue, useAnimatedStyle} from 'react-native-reanimated';
import {useRoute, useFocusEffect, useNavigation} from '@react-navigation/native';
import {AnimatedPressable, gradientPresets} from '@/components/core';
import {useSettingsStore} from '@/stores/settingsStore';
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
import {useCalendarStore} from '@/stores/calendarStore';
import {DailyCalendarEventCard} from '@/components/todo/DailyCalendarEventCard';
import {useSleepStore} from '@/stores/sleepStore';
import {useTheme} from '@/theme';
import {hexWithOpacity} from '@/lib/todoUtils';
import {format} from 'date-fns';
import type {Todo} from '@daystep/shared-core';
import {Inbox, Calendar, Moon, Sun} from 'lucide-react-native';
import {LiquidGlassMenu} from '@/components/native';
import {InlineTimePicker} from '@/components/native/InlineTimePicker';

interface DailyPlannerViewProps {
  menuItems: Array<{title: string; key: string}>;
  onMenuSelect: (key: string) => void;
}

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

/** 수면/기상 시간 카드 — 카드 터치 → 네이티브 타임피커 직접 표시 */
function SleepWakeCard({type, time, onTimeChange}: {
  type: 'sleep' | 'wake';
  time: string;
  onTimeChange: (newTime: string) => void;
}) {
  const {primaryColor} = useTheme();
  const isSleep = type === 'sleep';
  const [showPicker, setShowPicker] = useState(false);

  const timeDate = useMemo(() => {
    const [h, m] = time.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d;
  }, [time]);

  return (
    <>
      <AnimatedPressable
        onPress={() => setShowPicker(prev => !prev)}
        hapticType="light"
        scaleValue={0.98}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: hexWithOpacity(primaryColor, 0.06),
          borderRadius: 12,
          padding: 12,
          marginVertical: 3,
        }}>
        <View style={{
          width: 28, height: 28, borderRadius: 14,
          backgroundColor: hexWithOpacity(primaryColor, 0.12),
          justifyContent: 'center', alignItems: 'center', marginRight: 10,
        }}>
          {isSleep
            ? <Moon size={14} color={primaryColor} />
            : <Sun size={14} color={primaryColor} />}
        </View>
        <Text style={{fontSize: 14, fontWeight: '600', color: '#374151', flex: 1}}>
          {isSleep ? '취침' : '기상'}
        </Text>
        <Text style={{fontSize: 13, fontWeight: '500', color: primaryColor}}>
          {time}
        </Text>
      </AnimatedPressable>
      {showPicker && (
        <InlineTimePicker
          value={timeDate}
          onChange={(date) => {
            const hh = date.getHours().toString().padStart(2, '0');
            const mm = date.getMinutes().toString().padStart(2, '0');
            onTimeChange(`${hh}:${mm}`);
          }}
          height={150}
          style={{alignSelf: 'center', marginVertical: 4}}
        />
      )}
    </>
  );
}

// iOS 네이티브 달력이 collapsed 상태에서 emit하는 totalHeight
// (state.headerHeight + state.weekdayHeight + state.weekHeight + padding)
const IOS_COLLAPSED_CAL_H = 111;

export function DailyPlannerView({menuItems, onMenuSelect}: DailyPlannerViewProps): React.ReactElement {
  return (
    <DndProvider>
      <DailyPlannerViewInner menuItems={menuItems} onMenuSelect={onMenuSelect} />
    </DndProvider>
  );
}

function DailyPlannerViewInner({menuItems, onMenuSelect}: DailyPlannerViewProps) {
  const {
    todos,
    selectedDate,
    motivationMap,
    setSelectedDate,
    fetchTodosForDate,
    fetchMotivationsForTodos,
    toggleTodoCompletion,
    updateTodo,
    skipTodo,
    unskipTodo,
    postponeTodo,
    restoreDeferredTodo,
  } = useTodoStore();
  const {primaryColor} = useTheme();
  const backgroundPreset = useSettingsStore(s => s.backgroundPreset);
  const gradient = gradientPresets[backgroundPreset];
  const {projects, fetchProjects} = useProjectStore();
  const user = useAuthStore(s => s.user);
  const {isConnected, monthEvents, fetchEventsForMonth} = useCalendarStore();
  const sleepGoalTime = useSleepStore(s => s.sleepGoalTime);
  const wakeGoalTime = useSleepStore(s => s.wakeGoalTime);

  const projectMap = useMemo(() => {
    const map = new Map<string, {title: string; color: string; icon?: string}>();
    for (const p of projects) {
      map.set(p.id, {title: p.title, color: p.color, icon: p.icon});
    }
    return map;
  }, [projects]);

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

  const postponeRef = useRef<PostponeBottomSheetRef>(null);
  const postponingTodoRef = useRef<Todo | null>(null);

  // 중복 fetch 제거: useFocusRefetch가 마운트 시에도 실행되므로 별도 useEffect 불필요

  useEffect(() => {
    if (isConnected && selectedDate) {
      const [y, m] = selectedDate.split('-').map(Number);
      fetchEventsForMonth(y, m);
    }
  }, [selectedDate, isConnected, fetchEventsForMonth]);

  const dailyCalendarEvents = useMemo(() => {
    if (!isConnected) return [];
    return monthEvents[selectedDate] ?? [];
  }, [isConnected, monthEvents, selectedDate]);

  useFocusRefetch(useCallback(() => {
    fetchTodosForDate(selectedDate);
  }, [selectedDate, fetchTodosForDate]));

  useEffect(() => {
    const todoIds = todos.map(t => t.id).filter(id => !id.startsWith('temp_'));
    if (todoIds.length > 0) {
      fetchMotivationsForTodos(todoIds);
    }
  }, [todos, fetchMotivationsForTodos]);

  useFocusEffect(
    useCallback(() => {
      const page = route.params?.initialPage;
      if (page != null && pagesRef.current) {
        pagesRef.current.scrollTo(page);
      }
    }, [route.params?.initialPage]),
  );

  useEffect(() => {
    if (pagesRef.current) setPagesRef(pagesRef.current);
    return () => setPagesRef(null);
  }, [setPagesRef]);

  const handlePageChange = useCallback(
    (page: number) => {
      currentPageRef.current = page;
      setTimeout(() => {
        triggerRemeasure();
      }, 400);
    },
    [currentPageRef, triggerRemeasure],
  );

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

  const [nowForUpcoming, setNowForUpcoming] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowForUpcoming(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

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

  const sections = useMemo(() => {
    const base = categorizeTodos(todos);
    // 기상 pseudo-todo: 오전 섹션 앞에 삽입
    const wakeTodo = {id: '_wake', title: '기상', start_time: `${selectedDate}T${wakeGoalTime}:00`, schedule_type: 'timed', _isSleepWake: 'wake'} as any;
    const morningIdx = base.findIndex(s => s.period === 'morning');
    if (morningIdx >= 0) {
      base[morningIdx].data.unshift(wakeTodo);
    } else {
      // 오전 섹션이 없으면 생성
      const insertIdx = base.findIndex(s => s.period === 'afternoon' || s.period === 'evening');
      base.splice(insertIdx >= 0 ? insertIdx : base.length, 0, {title: '오전', period: 'morning', data: [wakeTodo]});
    }
    // 취침 pseudo-todo: 저녁 섹션 끝에 삽입
    const sleepTodo = {id: '_sleep', title: '취침', start_time: `${selectedDate}T${sleepGoalTime}:00`, schedule_type: 'timed', _isSleepWake: 'sleep'} as any;
    const eveningIdx = base.findIndex(s => s.period === 'evening');
    if (eveningIdx >= 0) {
      base[eveningIdx].data.push(sleepTodo);
    } else {
      base.push({title: '저녁', period: 'evening', data: [sleepTodo]});
    }
    return base;
  }, [todos, selectedDate, sleepGoalTime, wakeGoalTime]);

  const calendarHeight = useSharedValue(0);
  // iOS: wrapper height는 React state로 관리 — Reanimated useAnimatedStyle의 height
  // 업데이트가 Fabric 환경의 absolute 포지션 래퍼에서 Yoga 재계산을 안정적으로
  // 트리거하지 못하는 이슈 회피. 콘텐츠의 translateY는 Reanimated로 부드럽게 유지.
  const [iosWrapperHeight, setIosWrapperHeight] = useState(IOS_COLLAPSED_CAL_H);
  const iosContentStyle = useAnimatedStyle(() => ({
    transform: [{translateY: Math.max(0, calendarHeight.value - IOS_COLLAPSED_CAL_H)}],
  }));

  const handleToggle = useCallback(
    (id: string) => {
      toggleTodoCompletion(id);
    },
    [toggleTodoCompletion],
  );

  const [isRefreshing, setIsRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await fetchTodosForDate(selectedDate);
    } finally {
      setIsRefreshing(false);
    }
  }, [selectedDate, fetchTodosForDate]);

  const handleTodoPress = useCallback((todo: Todo) => {
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
    let durationSeconds = 25 * 60;
    if (todo.start_time && todo.end_time) {
      const diff = new Date(todo.end_time).getTime() - new Date(todo.start_time).getTime();
      durationSeconds = Math.max(Math.round(diff / 1000), 60);
    } else if ((todo as any).anytime_duration) {
      durationSeconds = (todo as any).anytime_duration * 60;
    }

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

  const handleMatrixAdd = useCallback(
    (importance: boolean, urgency: boolean) => {
      pickerRef.current?.open({type: 'matrix', importance, urgency});
    },
    [],
  );



  const handleSkipTodo = useCallback(
    (id: string, reason: 'not_needed' | 'missed') => {
      skipTodo(id, reason);
    },
    [skipTodo],
  );

  const handleUnskipTodo = useCallback(
    (todo: Todo) => {
      unskipTodo(todo.id);
    },
    [unskipTodo],
  );

  const handleRestoreOriginal = useCallback(async (todo: Todo) => {
    await restoreDeferredTodo(todo.id);
  }, [restoreDeferredTodo]);

  const handlePostpone = useCallback((todo: Todo) => {
    postponingTodoRef.current = todo;
    postponeRef.current?.open(todo);
  }, []);

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

  // Android: 고정 높이 래퍼 + SharedValue로 expand progress 제어
  const [androidCalHeight] = useState(130);
  const androidExpandProgress = useSharedValue(0);

  // Android: 콘텐츠 translateY — 달력 6행 고정이므로 delta도 고정 (44 * 5 + 2 * 4 = 228dp)
  const androidContentDeltaDp = Platform.OS === 'android' ? 228 : 0;
  const androidContentStyle = useAnimatedStyle(() => {
    if (Platform.OS !== 'android') return {};
    return {
      transform: [{translateY: androidExpandProgress.value * androidContentDeltaDp}],
    };
  });
  // Android: 캘린더 래퍼 — absolute + 동적 높이 (터치 영역, Yoga에서 콘텐츠 분리)
  const androidCalWrapperStyle = useAnimatedStyle(() => {
    if (Platform.OS !== 'android') return {};
    return {
      height: androidCalHeight + androidExpandProgress.value * androidContentDeltaDp,
    };
  });

  return (
    <View style={{flex: 1}}>
      {/* 주간 스트립 캘린더 + LiquidGlassMenu 오버레이 */}
      <View style={{position: 'relative'}}>
        {Platform.OS === 'ios' ? (
          /* iOS: absolute 래퍼 + React state로 height 관리 (Yoga 강제 재계산) */
          <View style={[
            styles.iosCalendarWrapper,
            {position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, height: iosWrapperHeight},
          ]}>
            <NativeWeekStripCalendarNative
              selectedDate={selectedDate}
              primaryColor={primaryColor}
              gradientColors={gradient.colors}
              gradientStartX={gradient.start.x}
              gradientStartY={gradient.start.y}
              gradientEndX={gradient.end.x}
              gradientEndY={gradient.end.y}
              onDateSelect={(e) => setSelectedDate(e.nativeEvent.date)}
              onHeightChange={(e) => {
                const h = e.nativeEvent.height;
                calendarHeight.value = h;
                setIosWrapperHeight(Math.max(IOS_COLLAPSED_CAL_H, h));
              }}
              onExpandChange={() => {}}
              style={StyleSheet.absoluteFill}
            />
          </View>
        ) : (
          /* Android: absolute 래퍼 + 동적 높이 (터치 영역, Yoga 분리) */
          <Animated.View style={[
            {position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10},
            androidCalWrapperStyle,
          ]}>
            <NativeWeekStripCalendarNative
              selectedDate={selectedDate}
              primaryColor={primaryColor}
              gradientColors={gradient.colors}
              gradientStartX={gradient.start.x}
              gradientStartY={gradient.start.y}
              gradientEndX={gradient.end.x}
              gradientEndY={gradient.end.y}
              onDateSelect={(e) => setSelectedDate(e.nativeEvent.date)}
              expandProgressValue={androidExpandProgress}
              onHeightChange={() => {}}
              onExpandChange={() => {}}
              style={{alignSelf: 'stretch'}}
            />
          </Animated.View>
        )}
        {Platform.OS === 'ios' && (
          <View style={styles.menuOverlay} pointerEvents="box-none">
            <LiquidGlassMenu
              systemIconName="calendar"
              iconColor="#9CA3AF"
              size={36}
              menuItems={menuItems}
              onSelect={onMenuSelect}
              fallbackIcon={<Calendar size={18} color="#9CA3AF" />}
              testID="planner_view_menu"
            />
          </View>
        )}
      </View>

      {Platform.OS === 'android' && (
        <View style={styles.menuOverlay} pointerEvents="box-none">
          <LiquidGlassMenu
            systemIconName="calendar"
            iconColor="#9CA3AF"
            size={36}
            menuItems={menuItems}
            onSelect={onMenuSelect}
            fallbackIcon={<Calendar size={18} color="#9CA3AF" />}
            testID="planner_view_menu"
          />
        </View>
      )}

      <Animated.View style={[
        {flex: 1, marginTop: Platform.OS === 'android' ? androidCalHeight : Platform.OS === 'ios' ? IOS_COLLAPSED_CAL_H : 0},
        Platform.OS === 'android' && androidContentStyle,
        Platform.OS === 'ios' && iosContentStyle,
      ]}>
      <SwipeablePages ref={pagesRef} isDragging={dragState.isDragging} onPageChange={handlePageChange}>
        {/* Page 0: 시간대별 할일 리스트 */}
        <View style={{flex: 1}}>
          <SectionList
            sections={sections}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{paddingHorizontal: 4, paddingBottom: 100}}
            stickySectionHeadersEnabled={false}
            scrollEnabled={!dragState.isDragging}
            ListHeaderComponent={
              dailyCalendarEvents.length > 0 ? (
                <View style={{marginTop: 8, marginBottom: 4}}>
                  <Text className="text-xs font-semibold text-gray-400 mb-1.5">
                    Google 캘린더
                  </Text>
                  {dailyCalendarEvents.map(event => (
                    <DailyCalendarEventCard key={event.id} event={event} />
                  ))}
                </View>
              ) : null
            }
            refreshControl={
              <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
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
            renderItem={({item, index}) => {
              // 수면/기상 pseudo-todo
              if ((item as any)._isSleepWake) {
                const type = (item as any)._isSleepWake as 'sleep' | 'wake';
                const time = type === 'sleep' ? sleepGoalTime : wakeGoalTime;
                const setSleepGoalTime = useSleepStore.getState().setSleepGoalTime;
                const setWakeGoalTime = useSleepStore.getState().setWakeGoalTime;
                return (
                  <SleepWakeCard
                    type={type}
                    time={time}
                    onTimeChange={(newTime) => {
                      if (type === 'sleep') setSleepGoalTime(newTime);
                      else setWakeGoalTime(newTime);
                    }}
                  />
                );
              }
              return (
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
                    linkedMotivations={motivationMap[item.id]}
                    isNextUpcoming={item.id === nextUpcomingId}
                  />
                </DraggableTodoChip>
              );
            }}
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
        <PlannerPage2 onMatrixAdd={handleMatrixAdd} />
      </SwipeablePages>
      </Animated.View>

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

      {/* 할일 피커 바텀시트 */}
      <TodoPickerSheet ref={pickerRef} />

      {/* 할일 폼 바텀시트 */}
      <TodoFormBottomSheet ref={formRef} />

      {/* 미루기 바텀시트 */}
      <PostponeBottomSheet
        ref={postponeRef}
        onConfirm={handlePostponeConfirm}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  iosCalendarWrapper: {
    overflow: 'hidden',
  },
  menuOverlay: {
    position: 'absolute',
    top: 8,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
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
