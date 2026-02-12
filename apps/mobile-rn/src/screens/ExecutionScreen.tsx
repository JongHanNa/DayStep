/**
 * ADHD Execution Mode Screen
 * 단일 작업 집중 — 스마트 추천 → 완료/스킵 → 다음
 * "한 번에 하나"를 시각적으로 강조하는 ADHD 친화적 인터페이스
 */
import React, {useCallback, useEffect} from 'react';
import {Text, View, StyleSheet} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  FadeOut,
  SlideInRight,
  SlideOutLeft,
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withSpring,
  withDelay,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import {Gesture, GestureDetector} from 'react-native-gesture-handler';
import {useNavigation} from '@react-navigation/native';
import {ScreenContainer, AnimatedPressable, AnimatedCard} from '@/components/core';
import {useHaptic} from '@/hooks/useHaptic';
import {useTodoStore} from '@/stores/todoStore';
import {useADHDStore} from '@/stores/adhdStore';
import {useTheme} from '@/theme';
import {springs} from '@/theme/animations';
import {format} from 'date-fns';
import type {Todo} from '@daystep/shared-core';

// ============================================
// Sub-Components
// ============================================

function SessionHeader({completedCount}: {completedCount: number}) {
  return (
    <Animated.View entering={FadeIn.duration(300)} style={styles.sessionHeader}>
      <Text style={styles.sessionLabel}>집중 모드</Text>
      <View style={styles.sessionBadge}>
        <Text style={styles.sessionCount}>
          {completedCount > 0 ? `🔥 ${completedCount}개 완료` : '🎯 시작하기'}
        </Text>
      </View>
    </Animated.View>
  );
}

function CelebrationOverlay({count}: {count: number}) {
  if (count <= 0) return null;

  const messages = [
    '잘했어요! 👏',
    '좋아요! 계속 가봐요 💪',
    '대단해요! 🌟',
    '멋져요! 흐름을 타고 있어요 🔥',
    '와! 진짜 잘하고 있어요 ✨',
  ];
  const msg = messages[Math.min(count - 1, messages.length - 1)];

  return (
    <Animated.View
      entering={FadeInUp.duration(400).springify()}
      exiting={FadeOut.duration(200)}
      style={styles.celebration}>
      <Text style={styles.celebrationText}>{msg}</Text>
    </Animated.View>
  );
}

function EmptyState({onEnd}: {onEnd: () => void}) {
  return (
    <Animated.View
      entering={FadeInDown.duration(500)}
      style={styles.emptyContainer}>
      <Text style={styles.emptyEmoji}>🎉</Text>
      <Text style={styles.emptyTitle}>모든 할일을 처리했어요!</Text>
      <Text style={styles.emptySubtitle}>
        대단해요. 잠시 쉬거나{'\n'}새로운 할일을 추가해보세요.
      </Text>
      <AnimatedPressable
        onPress={onEnd}
        hapticType="medium"
        style={styles.endBtn}>
        <Text style={styles.endBtnText}>돌아가기</Text>
      </AnimatedPressable>
    </Animated.View>
  );
}

// ============================================
// Task Card (swipeable)
// ============================================

interface TaskCardProps {
  todo: Todo;
  onComplete: () => void;
  onSkip: () => void;
  primaryColor: string;
}

function TaskCard({todo, onComplete, onSkip, primaryColor}: TaskCardProps) {
  const haptic = useHaptic();
  const translateX = useSharedValue(0);
  const cardScale = useSharedValue(1);

  const timeStr = todo.start_time
    ? format(new Date(todo.start_time), 'HH:mm')
    : null;

  const durationStr = todo.anytime_duration
    ? `${todo.anytime_duration}분`
    : null;

  const handleComplete = useCallback(() => {
    haptic.success();
    cardScale.value = withSequence(
      withSpring(1.05, springs.bouncy),
      withSpring(0, springs.snappy),
    );
    // 애니메이션 끝나고 콜백
    setTimeout(onComplete, 300);
  }, [onComplete, haptic, cardScale]);

  const handleSkip = useCallback(() => {
    haptic.light();
    onSkip();
  }, [onSkip, haptic]);

  // 스와이프 제스처 (오른쪽 → 스킵)
  const panGesture = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .onUpdate(e => {
      translateX.value = e.translationX;
    })
    .onEnd(e => {
      if (e.translationX > 120 || e.velocityX > 800) {
        // 오른쪽 스와이프 → 스킵
        translateX.value = withTiming(400, {duration: 200});
        runOnJS(handleSkip)();
      } else if (e.translationX < -120 || e.velocityX < -800) {
        // 왼쪽 스와이프 → 완료
        translateX.value = withTiming(-400, {duration: 200});
        runOnJS(handleComplete)();
      } else {
        translateX.value = withSpring(0, springs.snappy);
      }
    });

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      {translateX: translateX.value},
      {scale: cardScale.value},
      {
        rotate: `${translateX.value * 0.02}deg`,
      },
    ],
  }));

  return (
    <Animated.View
      entering={SlideInRight.duration(400).springify()}
      exiting={SlideOutLeft.duration(300)}>
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.taskCard, cardAnimatedStyle]}>
          {/* 아이콘 + 제목 */}
          <View style={styles.taskMain}>
            {todo.icon && (
              <Text style={styles.taskIcon}>{todo.icon}</Text>
            )}
            <Text style={styles.taskTitle} numberOfLines={3}>
              {todo.title}
            </Text>
          </View>

          {/* 메타 정보 */}
          <View style={styles.taskMeta}>
            {timeStr && (
              <View style={styles.metaChip}>
                <Text style={styles.metaText}>🕐 {timeStr}</Text>
              </View>
            )}
            {durationStr && (
              <View style={styles.metaChip}>
                <Text style={styles.metaText}>⏱ {durationStr}</Text>
              </View>
            )}
            {todo.importance && (
              <View style={[styles.metaChip, {backgroundColor: '#FEF3C7'}]}>
                <Text style={styles.metaText}>⭐ 중요</Text>
              </View>
            )}
            {todo.urgency && (
              <View style={[styles.metaChip, {backgroundColor: '#DBEAFE'}]}>
                <Text style={styles.metaText}>⚡ 긴급</Text>
              </View>
            )}
          </View>

          {/* 힌트 */}
          <Text style={styles.swipeHint}>
            ← 완료  |  스킵 →
          </Text>

          {/* 액션 버튼 */}
          <View style={styles.taskActions}>
            <AnimatedPressable
              onPress={handleComplete}
              hapticType="medium"
              scaleValue={0.95}
              style={[styles.actionBtn, {backgroundColor: primaryColor}]}>
              <Text style={styles.actionBtnText}>✓ 완료!</Text>
            </AnimatedPressable>
            <AnimatedPressable
              onPress={handleSkip}
              hapticType="light"
              scaleValue={0.95}
              style={styles.skipBtn}>
              <Text style={styles.skipBtnText}>나중에 →</Text>
            </AnimatedPressable>
          </View>
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}

// ============================================
// Main Screen
// ============================================

export default function ExecutionScreen() {
  const {primaryColor} = useTheme();
  const navigation = useNavigation<any>();
  const {todos, selectedDate, fetchTodosForDate, toggleTodoCompletion} = useTodoStore();
  const {
    execution,
    isExecutionActive,
    startExecution,
    endExecution,
    recommendNext,
    markCompleted,
    markSkipped,
  } = useADHDStore();

  // 데이터 로드
  useEffect(() => {
    fetchTodosForDate(selectedDate);
  }, [selectedDate]);

  // 미완료 할일만 필터
  const incompleteTodos = todos.filter(t => !t.completed);

  const handleStart = useCallback(() => {
    startExecution(incompleteTodos);
  }, [incompleteTodos, startExecution]);

  const handleComplete = useCallback(async () => {
    if (!execution.currentTodo) return;
    const todoId = execution.currentTodo.id;

    // 스토어에서 완료 처리
    await toggleTodoCompletion(todoId);
    markCompleted(todoId);

    // 다음 추천
    const remaining = incompleteTodos.filter(t => t.id !== todoId);
    setTimeout(() => recommendNext(remaining), 400);
  }, [execution.currentTodo, incompleteTodos, toggleTodoCompletion, markCompleted, recommendNext]);

  const handleSkip = useCallback(() => {
    markSkipped();
    setTimeout(() => recommendNext(incompleteTodos), 300);
  }, [incompleteTodos, markSkipped, recommendNext]);

  // ------------------------------------------
  // 시작 전 화면
  // ------------------------------------------
  if (!isExecutionActive) {
    return (
      <ScreenContainer gradient="executionBackground">
        <View style={styles.startContainer}>
          <Animated.Text
            entering={FadeInDown.duration(500)}
            style={styles.startEmoji}>
            🎯
          </Animated.Text>
          <Animated.Text
            entering={FadeInDown.delay(100).duration(500)}
            style={styles.startTitle}>
            실행 모드
          </Animated.Text>
          <Animated.Text
            entering={FadeInDown.delay(200).duration(500)}
            style={styles.startSubtitle}>
            AI가 지금 가장 적합한 할일을 추천해드려요{'\n'}
            한 번에 하나씩, 부담 없이 시작하세요
          </Animated.Text>

          <Animated.View entering={FadeInDown.delay(300).duration(500)}>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{incompleteTodos.length}</Text>
                <Text style={styles.statLabel}>남은 할일</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>
                  {todos.filter(t => t.completed).length}
                </Text>
                <Text style={styles.statLabel}>완료</Text>
              </View>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(400).duration(500)} style={{gap: 12}}>
            <AnimatedPressable
              onPress={handleStart}
              hapticType="medium"
              scaleValue={0.95}
              style={[styles.startBtn, {backgroundColor: primaryColor}]}>
              <Text style={styles.startBtnText}>
                {incompleteTodos.length > 0 ? '시작하기' : '할일이 없어요'}
              </Text>
            </AnimatedPressable>

            <AnimatedPressable
              onPress={() => navigation.navigate('Pomodoro')}
              hapticType="light"
              scaleValue={0.95}
              style={styles.pomodoroBtn}>
              <Text style={styles.pomodoroBtnText}>🍅 포모도로 타이머</Text>
            </AnimatedPressable>
          </Animated.View>
        </View>
      </ScreenContainer>
    );
  }

  // ------------------------------------------
  // 실행 중 화면
  // ------------------------------------------
  return (
    <ScreenContainer gradient="executionBackground">
      <SessionHeader completedCount={execution.completedInSession} />

      <CelebrationOverlay count={execution.completedInSession} />

      <View style={styles.cardArea}>
        {execution.currentTodo ? (
          <TaskCard
            key={execution.currentTodo.id}
            todo={execution.currentTodo}
            onComplete={handleComplete}
            onSkip={handleSkip}
            primaryColor={primaryColor}
          />
        ) : (
          <EmptyState onEnd={endExecution} />
        )}
      </View>

      {/* 하단 종료 버튼 */}
      <Animated.View entering={FadeIn.delay(500).duration(300)} style={styles.footer}>
        <AnimatedPressable
          onPress={endExecution}
          hapticType="light"
          style={styles.exitBtn}>
          <Text style={styles.exitBtnText}>세션 종료</Text>
        </AnimatedPressable>
      </Animated.View>
    </ScreenContainer>
  );
}

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
  // Start screen
  startContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  startEmoji: {
    fontSize: 60,
    marginBottom: 16,
  },
  startTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 8,
  },
  startSubtitle: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 32,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
  },
  statLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#E5E7EB',
  },
  startBtn: {
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  startBtnText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  pomodoroBtn: {
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
  },
  pomodoroBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#DC2626',
  },

  // Session header
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  sessionLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  sessionBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  sessionCount: {
    fontSize: 13,
    fontWeight: '600',
    color: '#92400E',
  },

  // Celebration
  celebration: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  celebrationText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F59E0B',
  },

  // Card area
  cardArea: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },

  // Task card
  taskCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 28,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
  },
  taskMain: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  taskIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  taskTitle: {
    flex: 1,
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    lineHeight: 30,
  },
  taskMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  metaChip: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  metaText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#4B5563',
  },
  swipeHint: {
    textAlign: 'center',
    fontSize: 12,
    color: '#D1D5DB',
    marginBottom: 20,
  },
  taskActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  actionBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  skipBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  skipBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },

  // Empty state
  emptyContainer: {
    alignItems: 'center',
    padding: 32,
  },
  emptyEmoji: {
    fontSize: 60,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  endBtn: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
  },
  endBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4B5563',
  },

  // Footer
  footer: {
    alignItems: 'center',
    paddingBottom: 24,
    paddingTop: 8,
  },
  exitBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  exitBtnText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#9CA3AF',
  },
});
