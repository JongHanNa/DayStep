/**
 * PlannerScreen — 통합 플래너 화면
 * LiquidGlassMenu로 5개 뷰 전환: 목록 / 월 / 주 / 3일 / 일
 * 뷰 전환 시 FadeIn/FadeOut 네이티브 모션 적용
 */
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {View, Text, StyleSheet, Modal, Platform, ActionSheetIOS, Alert} from 'react-native';
import Animated, {FadeIn, FadeOut, useSharedValue, useAnimatedStyle, type SharedValue} from 'react-native-reanimated';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {ScreenContainer, gradientPresets} from '@/components/core';
import {LiquidGlassMenu, NativeWeekStripCalendarNative} from '@/components/native';
import {DailyPlannerView} from '@/components/planner/DailyPlannerView';
import {MonthlyPlannerView} from '@/components/planner/MonthlyPlannerView';
import {MonthlyPremiumUpsell} from '@/components/subscription/MonthlyPremiumUpsell';
import {MiniDayPreview} from '@/components/subscription/MiniDayPreview';
import {MiniThreeDayPreview} from '@/components/subscription/MiniThreeDayPreview';
import {MiniWeekPreview} from '@/components/subscription/MiniWeekPreview';
import {SubscriptionView} from '@/components/settings/SubscriptionView';
import {MonthlyFAB} from '@/components/monthly-planner';
import {TodoFormBottomSheet, type TodoFormBottomSheetRef} from '@/components/todo/TodoFormBottomSheet';
import {NativeDayTimeGridNative} from '@/components/native/NativeDayTimeGrid';
import {NativeMultiDayTimeGridNative} from '@/components/native/NativeMultiDayTimeGrid';
import {useSettingsStore, type PlannerViewMode} from '@/stores/settingsStore';
import {useTodoStore} from '@/stores/todoStore';
import {useCalendarStore} from '@/stores/calendarStore';
import {useSubscriptionStore} from '@/stores/subscriptionStore';
import {useSleepStore} from '@/stores/sleepStore';
import {useTheme} from '@/theme';
import {Calendar} from 'lucide-react-native';
import {format, addDays, subDays} from 'date-fns';
import type {Todo} from '@daystep/shared-core';

const MENU_ITEMS = [
  {title: '목록', key: 'dailyPlanner'},
  {title: '월', key: 'monthlyPlanner'},
  {title: '주', key: 'week'},
  {title: '3일', key: '3day'},
  {title: '일', key: 'day'},
];

const GRADIENT_MAP: Record<PlannerViewMode, 'calmBackground' | 'warmBackground'> = {
  day: 'calmBackground',
  '3day': 'calmBackground',
  week: 'calmBackground',
  dailyPlanner: 'calmBackground',
  monthlyPlanner: 'warmBackground',
};

export default function PlannerScreen() {
  const formSheetRef = useRef<TodoFormBottomSheetRef>(null);
  const viewMode = useSettingsStore(s => s.plannerViewMode);
  const setPlannerViewMode = useSettingsStore(s => s.setPlannerViewMode);
  const {primaryColor} = useTheme();
  const backgroundPreset = useSettingsStore(s => s.backgroundPreset);
  const calendarGradient = gradientPresets[backgroundPreset];
  const {selectedDate, setSelectedDate, todos, fetchTodosForDateRange} = useTodoStore();
  const {isConnected, monthEvents, fetchEventsForMonth} = useCalendarStore();
  const hasActiveSubscription = useSubscriptionStore(s => s.hasActiveSubscription);
  const isInGracePeriod = useSubscriptionStore(s => s.isInGracePeriod);
  const [showPaywallModal, setShowPaywallModal] = useState(false);
  // Android: 캘린더 확장/축소 — Reanimated SharedValue로 UI thread 60fps 제어
  const [androidCalHeight] = useState(130);
  const androidExpandProgress = useSharedValue(0);

  // Android 일 뷰: 콘텐츠 translateY 계산 (dp 단위)
  const androidContentDeltaDp = useMemo(() => {
    if (Platform.OS !== 'android') return 0;
    const d = new Date(selectedDate);
    const firstDay = new Date(d.getFullYear(), d.getMonth(), 1).getDay();
    const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    const rows = Math.ceil((firstDay + daysInMonth) / 7);
    return 44 * (rows - 1) + 2 * (rows - 2);
  }, [selectedDate]);
  const androidDayContentStyle = useAnimatedStyle(() => {
    if (Platform.OS !== 'android') return {};
    return {
      transform: [{translateY: androidExpandProgress.value * androidContentDeltaDp}],
    };
  });
  // Android: 캘린더 래퍼 높이 — expandProgress에 따라 동적 (터치 영역 확장)
  const androidCalWrapperStyle = useAnimatedStyle(() => {
    if (Platform.OS !== 'android') return {};
    return {
      height: androidCalHeight + androidExpandProgress.value * androidContentDeltaDp,
      zIndex: 10,
      overflow: 'visible' as const,
    };
  });

  const handleUpgrade = useCallback(() => {
    setShowPaywallModal(true);
  }, []);

  // 3일/주 뷰용 날짜 범위 데이터
  const [multiDayTodoMap, setMultiDayTodoMap] = useState<Record<string, Todo[]>>({});
  const [multiDayEventMap, setMultiDayEventMap] = useState<Record<string, any[]>>({});

  const handleMenuSelect = useCallback(
    (key: string) => {
      setPlannerViewMode(key as PlannerViewMode);
    },
    [setPlannerViewMode],
  );

  // 3일/주 뷰 날짜 범위 계산 (버퍼 포함 — 네이티브 가로 스크롤용)
  const multiDayRange = useMemo(() => {
    if (viewMode !== '3day' && viewMode !== 'week') return null;
    const dayCount = viewMode === '3day' ? 3 : 7;
    const bufferDays = 7;
    const center = new Date(selectedDate);
    const startOffset = Math.floor(dayCount / 2) + bufferDays;
    const endOffset = dayCount - Math.floor(dayCount / 2) - 1 + bufferDays;
    const startDate = format(subDays(center, startOffset), 'yyyy-MM-dd');
    const endDate = format(addDays(center, endOffset), 'yyyy-MM-dd');
    return {startDate, endDate, dayCount};
  }, [viewMode, selectedDate]);

  // 3일/주 뷰 데이터 로드
  useEffect(() => {
    if (!multiDayRange) return;
    const {startDate, endDate} = multiDayRange;

    fetchTodosForDateRange(startDate, endDate).then(result => {
      setMultiDayTodoMap(prev => ({...prev, ...result}));
    });

    // 캘린더 이벤트 fetch (버퍼 범위가 월 경계를 넘을 수 있으므로 양쪽 월 fetch)
    if (isConnected) {
      const [sy, sm] = startDate.split('-').map(Number);
      const [ey, em] = endDate.split('-').map(Number);
      fetchEventsForMonth(sy, sm);
      if (sy !== ey || sm !== em) {
        fetchEventsForMonth(ey, em);
      }
    }
  }, [multiDayRange, fetchTodosForDateRange, isConnected, fetchEventsForMonth]);

  // 일 뷰 날짜 변경 시 데이터 로드
  useEffect(() => {
    if (viewMode === 'day' && isConnected && selectedDate) {
      const [y, m] = selectedDate.split('-').map(Number);
      fetchEventsForMonth(y, m);
    }
  }, [viewMode, selectedDate, isConnected, fetchEventsForMonth]);

  const sleepGoalTime = useSleepStore(s => s.sleepGoalTime);
  const wakeGoalTime = useSleepStore(s => s.wakeGoalTime);

  // 일 뷰용 데이터 (수면/기상 블록 포함)
  const dayTodoData = useMemo(() => {
    const items = todos.map(t => ({
      id: t.id,
      title: t.title,
      // anytime 할일은 start_time을 null로 → 네이티브 종일 섹션에 표시
      start_time: t.schedule_type === 'anytime' ? null : t.start_time,
      end_time: t.schedule_type === 'anytime' ? null : t.end_time,
      completed: t.completed,
      project_color: t.color || '#6366F1',
      schedule_type: t.schedule_type ?? 'timed',
    }));
    // 기상 블록: wakeGoalTime - 30분 ~ wakeGoalTime
    const [wh, wm] = wakeGoalTime.split(':').map(Number);
    const wakeStart = new Date(`${selectedDate}T00:00:00`);
    wakeStart.setHours(wh, wm - 30, 0);
    const wakeEnd = new Date(`${selectedDate}T00:00:00`);
    wakeEnd.setHours(wh, wm, 0);
    items.push({
      id: '_wake',
      title: '☀️ 기상',
      start_time: wakeStart.toISOString(),
      end_time: wakeEnd.toISOString(),
      completed: false,
      project_color: '#F59E0B',
      schedule_type: 'timed',
    });
    // 취침 블록: sleepGoalTime ~ sleepGoalTime + 30분
    const [sh, sm] = sleepGoalTime.split(':').map(Number);
    const sleepStart = new Date(`${selectedDate}T00:00:00`);
    sleepStart.setHours(sh, sm, 0);
    const sleepEnd = new Date(`${selectedDate}T00:00:00`);
    sleepEnd.setHours(sh, sm + 30, 0);
    items.push({
      id: '_sleep',
      title: '🌙 취침',
      start_time: sleepStart.toISOString(),
      end_time: sleepEnd.toISOString(),
      completed: false,
      project_color: '#7C3AED',
      schedule_type: 'timed',
    });
    return JSON.stringify(items);
  }, [todos, selectedDate, sleepGoalTime, wakeGoalTime]);

  const dayEventData = useMemo(() => {
    if (!isConnected) return '[]';
    const events = monthEvents[selectedDate] ?? [];
    const items = events.map((e: any) => ({
      id: e.id,
      title: e.title || e.summary,
      start: e.start,
      end: e.end,
      color: e.color || '#4285F4',
      isAllDay: e.isAllDay || false,
    }));
    return JSON.stringify(items);
  }, [isConnected, monthEvents, selectedDate]);

  // 3일/주 뷰 데이터를 JSON 직렬화
  const multiDayTodoDataJson = useMemo(() => {
    const result: Record<string, any[]> = {};
    for (const [dateStr, dateTodos] of Object.entries(multiDayTodoMap)) {
      result[dateStr] = dateTodos.map(t => ({
        id: t.id,
        title: t.title,
        start_time: t.start_time,
        end_time: t.end_time,
        completed: t.completed,
        project_color: t.color || '#6366F1',
        schedule_type: t.schedule_type ?? 'timed',
      }));
    }
    return JSON.stringify(result);
  }, [multiDayTodoMap]);

  const multiDayEventDataJson = useMemo(() => {
    if (!isConnected) return '{}';
    // monthEvents를 범위 내 날짜별로 필터
    const result: Record<string, any[]> = {};
    if (multiDayRange) {
      const start = new Date(multiDayRange.startDate);
      const end = new Date(multiDayRange.endDate);
      for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
        const dateStr = format(d, 'yyyy-MM-dd');
        const events = monthEvents[dateStr] ?? [];
        result[dateStr] = events.map((e: any) => ({
          id: e.id,
          title: e.title || e.summary,
          start: e.start,
          end: e.end,
          color: e.color || '#4285F4',
          isAllDay: e.isAllDay || false,
        }));
      }
    }
    return JSON.stringify(result);
  }, [isConnected, monthEvents, multiDayRange]);

  const handleDayDateSelect = useCallback(
    (e: {nativeEvent: {date: string}}) => {
      setSelectedDate(e.nativeEvent.date);
    },
    [setSelectedDate],
  );

  const handleTodoPress = useCallback(
    (_e: {nativeEvent: {todoId: string}}) => {
      // TODO: 할일 상세 열기
    },
    [],
  );

  const updateTodo = useTodoStore(s => s.updateTodo);
  const updateRecurringTodo = useTodoStore(s => s.updateRecurringTodo);

  // 변경 후 multiDayTodoMap 강제 갱신 — native setTodoData → layoutBlocks 트리거
  const reloadMultiDayMap = useCallback(async () => {
    if (!multiDayRange) return;
    const result = await fetchTodosForDateRange(
      multiDayRange.startDate,
      multiDayRange.endDate,
    );
    setMultiDayTodoMap(prev => ({...prev, ...result}));
  }, [multiDayRange, fetchTodosForDateRange]);

  const handleTodoEdit = useCallback(
    (e: {nativeEvent: {id: string; start_time: string; end_time: string; original_date?: string}}) => {
      const {id, start_time, end_time, original_date} = e.nativeEvent;
      // 의사-카드(_wake/_sleep) 변경은 무시 — DB에 없음
      if (id.startsWith('_')) return;

      // 반복 todo면 수정 범위 ActionSheet
      const todo = todos.find(t => t.id === id);
      const isRecurring =
        !!todo && (todo as any).recurrence_pattern && (todo as any).recurrence_pattern !== 'none';
      const occurrenceDate = original_date ?? selectedDate;
      const updates = {start_time, end_time} as any;

      if (!isRecurring) {
        updateTodo(id, updates).then(() => reloadMultiDayMap());
        return;
      }

      const onSelect = (idx: number) => {
        if (idx === 0) {
          updateRecurringTodo(id, updates, 'this', occurrenceDate).then(() =>
            reloadMultiDayMap(),
          );
        } else if (idx === 1) {
          updateRecurringTodo(id, updates, 'future', occurrenceDate).then(() =>
            reloadMultiDayMap(),
          );
        } else {
          // 취소 — multiDayTodoMap 재로드해 native 카드 원위치 복원
          reloadMultiDayMap();
        }
      };

      if (Platform.OS === 'ios') {
        ActionSheetIOS.showActionSheetWithOptions(
          {
            title: '반복 작업의 시간을 수정하고 있습니다',
            message: '수정 범위를 확인해주세요',
            options: ['지금 반복', '모든 미완료 반복 주기', '취소'],
            cancelButtonIndex: 2,
          },
          onSelect,
        );
      } else {
        Alert.alert(
          '반복 작업의 시간을 수정하고 있습니다',
          '수정 범위를 확인해주세요',
          [
            {text: '지금 반복', onPress: () => onSelect(0)},
            {text: '모든 미완료 반복 주기', onPress: () => onSelect(1)},
            {text: '취소', style: 'cancel', onPress: () => onSelect(2)},
          ],
          {cancelable: false},
        );
      }
    },
    [updateTodo, updateRecurringTodo, todos, selectedDate, reloadMultiDayMap],
  );

  const handleDateRangeChange = useCallback(
    (e: {nativeEvent: {startDate: string; endDate: string}}) => {
      // 스와이프 시 새 범위의 중앙 날짜를 selectedDate로 설정
      const start = new Date(e.nativeEvent.startDate);
      const end = new Date(e.nativeEvent.endDate);
      const mid = new Date((start.getTime() + end.getTime()) / 2);
      setSelectedDate(format(mid, 'yyyy-MM-dd'));
    },
    [setSelectedDate],
  );

  const calendarHeight = useSharedValue(0);
  const calendarHeightStyle = useAnimatedStyle(() => ({
    height: calendarHeight.value > 0 ? calendarHeight.value : undefined,
    overflow: 'hidden' as const,
  }));

  const gradient = GRADIENT_MAP[viewMode];

  const menuOverlay = (
    <View style={styles.menuOverlay} pointerEvents="box-none">
      <LiquidGlassMenu
        systemIconName="calendar"
        iconColor="#6B7280"
        size={36}
        menuItems={MENU_ITEMS}
        onSelect={handleMenuSelect}
        fallbackIcon={<Calendar size={18} color="#6B7280" />}
        testID="planner_view_menu"
      />
    </View>
  );

  const renderView = () => {
    switch (viewMode) {
      case 'dailyPlanner':
        return (
          <DailyPlannerView
            menuItems={MENU_ITEMS}
            onMenuSelect={handleMenuSelect}
          />
        );
      case 'monthlyPlanner':
        if (!hasActiveSubscription && !isInGracePeriod) {
          return (
            <MonthlyPremiumUpsell
              onUpgrade={handleUpgrade}
              menuItems={MENU_ITEMS}
              onMenuSelect={handleMenuSelect}
            />
          );
        }
        return (
          <MonthlyPlannerView
            menuItems={MENU_ITEMS}
            onMenuSelect={handleMenuSelect}
          />
        );
      case 'day':
        if (!hasActiveSubscription && !isInGracePeriod) {
          return (
            <MonthlyPremiumUpsell
              onUpgrade={handleUpgrade}
              menuItems={MENU_ITEMS}
              onMenuSelect={handleMenuSelect}
              title="일간 시간표 보기"
              description={'하루의 시간 흐름을 한눈에 확인하고\n시간대별로 일정을 관리하세요'}
              features={[
                '하루 시간대 그리드',
                '꾹 눌러 시작·끝 시간 조절',
                '드래그로 시간 이동',
              ]}
              preview={<MiniDayPreview primaryColor={primaryColor} />}
            />
          );
        }
        return (
          <View style={{flex: 1}}>
            <View style={{position: 'relative'}}>
              {Platform.OS === 'ios' ? (
                <Animated.View style={calendarHeightStyle}>
                  <NativeWeekStripCalendarNative
                    selectedDate={selectedDate}
                    primaryColor={primaryColor}
                    gradientColors={calendarGradient.colors}
                    gradientStartX={calendarGradient.start.x}
                    gradientStartY={calendarGradient.start.y}
                    gradientEndX={calendarGradient.end.x}
                    gradientEndY={calendarGradient.end.y}
                    onDateSelect={handleDayDateSelect}
                    onHeightChange={(e) => {
                      calendarHeight.value = e.nativeEvent.height;
                    }}
                    style={StyleSheet.absoluteFill}
                  />
                </Animated.View>
              ) : (
                <Animated.View style={androidCalWrapperStyle}>
                  <NativeWeekStripCalendarNative
                    selectedDate={selectedDate}
                    primaryColor={primaryColor}
                    gradientColors={calendarGradient.colors}
                    gradientStartX={calendarGradient.start.x}
                    gradientStartY={calendarGradient.start.y}
                    gradientEndX={calendarGradient.end.x}
                    gradientEndY={calendarGradient.end.y}
                    onDateSelect={handleDayDateSelect}
                    expandProgressValue={androidExpandProgress}
                    onHeightChange={() => {}}
                    style={{alignSelf: 'stretch'}}
                  />
                </Animated.View>
              )}
              {menuOverlay}
            </View>
            <View style={{flex: 1, position: 'relative'}}>
              <NativeDayTimeGridNative
                selectedDate={selectedDate}
                primaryColor={primaryColor}
                todoData={dayTodoData}
                eventData={dayEventData}
                onDateSelect={handleDayDateSelect}
                onTodoPress={handleTodoPress}
                onTodoEdit={handleTodoEdit}
                onHeightChange={() => {}}
                style={{flex: 1}}
              />
            </View>
          </View>
        );
      case '3day':
      case 'week':
        if (!hasActiveSubscription && !isInGracePeriod) {
          const isWeek = viewMode === 'week';
          return (
            <MonthlyPremiumUpsell
              onUpgrade={handleUpgrade}
              menuItems={MENU_ITEMS}
              onMenuSelect={handleMenuSelect}
              title={isWeek ? '주간 시간표 보기' : '3일 시간표 보기'}
              description={
                isWeek
                  ? '한 주의 일정을 한눈에 확인하고\n시간대별로 균형 있게 계획하세요'
                  : '3일 치 일정을 집중력 있게\n시간대별로 관리하세요'
              }
              features={
                isWeek
                  ? [
                      '종일·언제든지 상단 별도 라인',
                      '주간 시간대 그리드',
                      '드래그로 다른 요일·시간 이동',
                    ]
                  : [
                      '3일 시간대 그리드',
                      '꾹 눌러 시작·끝 시간 조절',
                      '드래그로 다른 날·시간 이동',
                    ]
              }
              preview={
                isWeek ? (
                  <MiniWeekPreview primaryColor={primaryColor} />
                ) : (
                  <MiniThreeDayPreview primaryColor={primaryColor} />
                )
              }
            />
          );
        }
        return (
          <View style={{flex: 1}}>
            <View style={styles.multiDayToolbar}>
              <Text style={styles.monthLabel}>
                {new Date(selectedDate).getMonth() + 1}월
              </Text>
              <LiquidGlassMenu
                systemIconName="calendar"
                iconColor="#6B7280"
                size={36}
                menuItems={MENU_ITEMS}
                onSelect={handleMenuSelect}
                fallbackIcon={<Calendar size={18} color="#6B7280" />}
              />
              <View style={styles.toolbarSpacer} />
            </View>
            <NativeMultiDayTimeGridNative
              dayCount={viewMode === '3day' ? 3 : 7}
              centerDate={selectedDate}
              primaryColor={primaryColor}
              todoData={multiDayTodoDataJson}
              eventData={multiDayEventDataJson}
              onDateSelect={handleDayDateSelect}
              onTodoPress={handleTodoPress}
              onTodoEdit={handleTodoEdit}
              onDateRangeChange={handleDateRangeChange}
              onHeightChange={() => {}}
              style={{flex: 1}}
            />
          </View>
        );
      default:
        return (
          <DailyPlannerView
            menuItems={MENU_ITEMS}
            onMenuSelect={handleMenuSelect}
          />
        );
    }
  };

  return (
    <ScreenContainer gradient={gradient}>
      {/* 뷰 컨텐츠 (FadeIn/FadeOut 전환) */}
      <Animated.View
        key={viewMode}
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(150)}
        style={{flex: 1}}>
        {renderView()}
      </Animated.View>
      {(viewMode === 'day' || viewMode === '3day' || viewMode === 'week') &&
        (hasActiveSubscription || isInGracePeriod) && (
        <MonthlyFAB onPress={() => formSheetRef.current?.openCreate(selectedDate)} />
      )}
      <TodoFormBottomSheet ref={formSheetRef} />
      <Modal
        visible={showPaywallModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPaywallModal(false)}>
        <SafeAreaProvider>
          <SubscriptionView
            onBack={() => setShowPaywallModal(false)}
          />
        </SafeAreaProvider>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  menuOverlay: {
    position: 'absolute',
    top: 8,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  multiDayToolbar: {
    flexDirection: 'row',
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  monthLabel: {
    position: 'absolute',
    left: 16,
    fontSize: 17,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  toolbarSpacer: {
    position: 'absolute',
    right: 16,
    width: 36,
  },
});
