/**
 * Execute Tab — 시안 3: 통합 타이머 + 모드 토글
 * 할일 집중 / 빠른 집중 세그먼트 컨트롤 + 타이머 링 + 통계 바
 */
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {Text, View, StyleSheet, ScrollView} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  interpolateColor,
} from 'react-native-reanimated';
import {useNavigation} from '@react-navigation/native';
import {ScreenContainer, AnimatedPressable} from '@/components/core';
import {TimerRing, formatTime} from '@/components/core/TimerRing';
import {useTodoStore} from '@/stores/todoStore';
import {usePomodoroStore} from '@/stores/pomodoroStore';
import {useTheme} from '@/theme';
import type {Todo} from '@daystep/shared-core';

// ============================================
// Constants
// ============================================

const MINT = '#14B8A6';
const MINT_LIGHT = '#CCFBF1';
const VIOLET = '#8B5CF6';
const VIOLET_LIGHT = '#EDE9FE';
const QUICK_FOCUS_SECONDS = 20 * 60; // 20분
const DEFAULT_FOCUS_SECONDS = 25 * 60; // 25분

type FocusMode = 'todo' | 'quick';

// ============================================
// Duration Helpers
// ============================================

function calcTodoDuration(todo: Todo): number {
  if (todo.start_time && todo.end_time) {
    const diff = new Date(todo.end_time).getTime() - new Date(todo.start_time).getTime();
    return Math.max(Math.round(diff / 1000), 60); // 최소 1분
  }
  if ((todo as any).anytime_duration) {
    return (todo as any).anytime_duration * 60;
  }
  return DEFAULT_FOCUS_SECONDS;
}

function formatDurationLabel(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}시간 ${m > 0 ? `${m}분` : ''}`;
  return `${m}분`;
}

// ============================================
// Segment Control
// ============================================

function SegmentControl({
  mode,
  onChangeMode,
}: {
  mode: FocusMode;
  onChangeMode: (m: FocusMode) => void;
}) {
  const progress = useSharedValue(mode === 'todo' ? 0 : 1);

  useEffect(() => {
    progress.value = withTiming(mode === 'todo' ? 0 : 1, {
      duration: 250,
      easing: Easing.out(Easing.cubic),
    });
  }, [mode, progress]);

  const indicatorStyle = useAnimatedStyle(() => ({
    left: `${progress.value * 50}%` as any,
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      [MINT, VIOLET],
    ),
  }));

  return (
    <View style={styles.segmentContainer}>
      <Animated.View style={[styles.segmentIndicator, indicatorStyle]} />
      <AnimatedPressable
        onPress={() => onChangeMode('todo')}
        hapticType="selection"
        style={styles.segmentBtn}>
        <Text
          style={[
            styles.segmentText,
            mode === 'todo' && styles.segmentTextActive,
          ]}>
          📋 할일 집중
        </Text>
      </AnimatedPressable>
      <AnimatedPressable
        onPress={() => onChangeMode('quick')}
        hapticType="selection"
        style={styles.segmentBtn}>
        <Text
          style={[
            styles.segmentText,
            mode === 'quick' && styles.segmentTextActive,
          ]}>
          ⚡ 빠른 집중
        </Text>
      </AnimatedPressable>
    </View>
  );
}

// ============================================
// Todo List Item (Radio)
// ============================================

function TodoRadioItem({
  todo,
  selected,
  onSelect,
  duration,
}: {
  todo: Todo;
  selected: boolean;
  onSelect: () => void;
  duration: number;
}) {
  return (
    <AnimatedPressable
      onPress={onSelect}
      hapticType="selection"
      scaleValue={0.98}
      style={[styles.todoItem, selected && styles.todoItemSelected]}>
      <View
        style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
        {selected && <View style={styles.radioInner} />}
      </View>
      <View style={styles.todoContent}>
        <Text style={styles.todoTitle} numberOfLines={1}>
          {todo.icon ? `${todo.icon} ` : ''}{todo.title}
        </Text>
        <Text style={styles.todoDuration}>{formatDurationLabel(duration)}</Text>
      </View>
    </AnimatedPressable>
  );
}

// ============================================
// Stats Bar
// ============================================

function StatsBar() {
  const {stats} = usePomodoroStore();

  return (
    <Animated.View entering={FadeInUp.delay(400).duration(400)} style={styles.statsBar}>
      <View style={styles.statItem}>
        <Text style={styles.statNumber}>{stats.todaySessions}</Text>
        <Text style={styles.statLabel}>오늘 집중</Text>
      </View>
      <View style={styles.statDivider} />
      <View style={styles.statItem}>
        <Text style={styles.statNumber}>{stats.totalFocusTime}분</Text>
        <Text style={styles.statLabel}>총 시간</Text>
      </View>
      <View style={styles.statDivider} />
      <View style={styles.statItem}>
        <Text style={styles.statNumber}>{stats.currentStreak}</Text>
        <Text style={styles.statLabel}>연속</Text>
      </View>
    </Animated.View>
  );
}

// ============================================
// Main Screen
// ============================================

export default function ExecutionScreen() {
  const navigation = useNavigation<any>();
  const {todos, selectedDate, fetchTodosForDate} = useTodoStore();

  const [mode, setMode] = useState<FocusMode>('todo');
  const [selectedTodoId, setSelectedTodoId] = useState<string | null>(null);

  // 데이터 로드
  useEffect(() => {
    fetchTodosForDate(selectedDate);
  }, [selectedDate, fetchTodosForDate]);

  // 미완료 할일만
  const incompleteTodos = useMemo(
    () => todos.filter(t => !t.completed),
    [todos],
  );

  // 선택된 할일
  const selectedTodo = useMemo(
    () => incompleteTodos.find(t => t.id === selectedTodoId) ?? null,
    [incompleteTodos, selectedTodoId],
  );

  // 첫 번째 할일 자동 선택
  useEffect(() => {
    if (incompleteTodos.length > 0 && !selectedTodo) {
      setSelectedTodoId(incompleteTodos[0].id);
    }
  }, [incompleteTodos, selectedTodo]);

  // 타이머 링에 표시할 시간 (초)
  const displayDuration = useMemo(() => {
    if (mode === 'quick') return QUICK_FOCUS_SECONDS;
    if (selectedTodo) return calcTodoDuration(selectedTodo);
    return DEFAULT_FOCUS_SECONDS;
  }, [mode, selectedTodo]);

  // 색상
  const activeColor = mode === 'todo' ? MINT : VIOLET;

  // 타이머 시작
  const handleStartFocus = useCallback(() => {
    if (mode === 'todo' && selectedTodo) {
      navigation.navigate('FocusTimer', {
        mode: 'todo',
        todoId: selectedTodo.id,
        todoTitle: selectedTodo.title,
        durationSeconds: calcTodoDuration(selectedTodo),
      });
    } else if (mode === 'quick') {
      navigation.navigate('FocusTimer', {
        mode: 'quick',
        durationSeconds: QUICK_FOCUS_SECONDS,
      });
    }
  }, [mode, selectedTodo, navigation]);

  return (
    <ScreenContainer gradient="executionBackground">
      {/* 헤더 */}
      <Animated.View entering={FadeIn.duration(300)} style={styles.header}>
        <Text style={styles.headerTitle}>⏱ 실행</Text>
      </Animated.View>

      {/* 타이머 링 (idle) */}
      <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.ringArea}>
        <TimerRing
          progress={0}
          size={180}
          strokeWidth={8}
          color={activeColor}
          isRunning={false}
        />
        <View style={[styles.ringOverlay, {width: 180, height: 180}]}>
          <Text style={styles.ringTime}>{formatTime(displayDuration)}</Text>
          <Text style={[styles.ringLabel, {color: activeColor}]}>
            {mode === 'todo' ? '준비' : '자유 모드'}
          </Text>
        </View>
      </Animated.View>

      {/* 세그먼트 컨트롤 */}
      <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.segmentWrapper}>
        <SegmentControl mode={mode} onChangeMode={setMode} />
      </Animated.View>

      {/* 모드별 콘텐츠 */}
      <View style={styles.contentArea}>
        {mode === 'todo' ? (
          <Animated.View entering={FadeIn.duration(250)} style={styles.todoModeContainer}>
            {incompleteTodos.length === 0 ? (
              <View style={styles.emptyTodoContainer}>
                <Text style={styles.emptyTodoText}>
                  오늘 할일이 없어요.{'\n'}플래너에서 할일을 추가해보세요!
                </Text>
              </View>
            ) : (
              <ScrollView
                style={styles.todoList}
                contentContainerStyle={styles.todoListContent}
                showsVerticalScrollIndicator={false}>
                {incompleteTodos.map(todo => (
                  <TodoRadioItem
                    key={todo.id}
                    todo={todo}
                    selected={selectedTodoId === todo.id}
                    onSelect={() => setSelectedTodoId(todo.id)}
                    duration={calcTodoDuration(todo)}
                  />
                ))}
              </ScrollView>
            )}

            <AnimatedPressable
              onPress={handleStartFocus}
              hapticType="medium"
              scaleValue={0.95}
              style={[
                styles.startBtn,
                {backgroundColor: MINT},
                (!selectedTodo || incompleteTodos.length === 0) && styles.startBtnDisabled,
              ]}
              disabled={!selectedTodo || incompleteTodos.length === 0}>
              <Text style={styles.startBtnText}>집중 시작</Text>
            </AnimatedPressable>
          </Animated.View>
        ) : (
          <Animated.View entering={FadeIn.duration(250)} style={styles.quickModeContainer}>
            <Text style={styles.quickDesc}>
              할일을 정하지 않고 바로 시작해요.{'\n'}끝나면 무엇을 했는지 기록할 수 있어요.
            </Text>

            <AnimatedPressable
              onPress={handleStartFocus}
              hapticType="medium"
              scaleValue={0.95}
              style={[styles.startBtn, {backgroundColor: VIOLET}]}>
              <Text style={styles.startBtnText}>바로 시작</Text>
            </AnimatedPressable>
          </Animated.View>
        )}
      </View>

      {/* 통계 바 */}
      <StatsBar />
    </ScreenContainer>
  );
}

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
  // Header
  header: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },

  // Timer Ring
  ringArea: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  ringOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
  },
  ringTime: {
    fontSize: 36,
    fontWeight: '200',
    color: '#1F2937',
    fontVariant: ['tabular-nums'],
  },
  ringLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },

  // Segment Control
  segmentWrapper: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
    padding: 4,
    position: 'relative',
  },
  segmentIndicator: {
    position: 'absolute',
    top: 4,
    width: '50%',
    height: '100%',
    borderRadius: 12,
    opacity: 0.15,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 12,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  segmentTextActive: {
    color: '#1F2937',
  },

  // Content area
  contentArea: {
    flex: 1,
    paddingHorizontal: 24,
  },

  // Todo mode
  todoModeContainer: {
    flex: 1,
  },
  todoList: {
    flex: 1,
    marginBottom: 12,
  },
  todoListContent: {
    gap: 8,
    paddingBottom: 8,
  },
  todoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  todoItemSelected: {
    borderColor: MINT,
    backgroundColor: MINT_LIGHT,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  radioOuterSelected: {
    borderColor: MINT,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: MINT,
  },
  todoContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  todoTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#1F2937',
    marginRight: 8,
  },
  todoDuration: {
    fontSize: 13,
    fontWeight: '500',
    color: '#9CA3AF',
  },

  emptyTodoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTodoText: {
    fontSize: 15,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 22,
  },

  // Quick mode
  quickModeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 24,
  },
  quickDesc: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },

  // Start button
  startBtn: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  startBtnDisabled: {
    opacity: 0.4,
  },
  startBtnText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Stats bar
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    paddingBottom: 20,
    gap: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  statLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#E5E7EB',
  },
});
