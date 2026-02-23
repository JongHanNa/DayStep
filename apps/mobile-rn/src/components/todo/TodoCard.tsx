/**
 * TodoCard
 * 할일 카드 — 애니메이션 체크박스 + 우선순위 표시 + 종료시간 초과 프롬프트
 */
import React, {useCallback, useMemo} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  FadeInDown,
  Layout,
} from 'react-native-reanimated';
import {AnimatedPressable} from '@/components/core';
import {useHaptic} from '@/hooks/useHaptic';
import {useTheme} from '@/theme';
import {springs} from '@/theme/animations';
import type {Todo} from '@daystep/shared-core';
import {format} from 'date-fns';
import {resolveTodoIcon} from '@/lib/iconMap';
import {getPriorityColor} from '@/lib/todoUtils';
import {getTimeStatus, getTimeStatusText} from '@/lib/timeStatus';
import {MissedTodoActionPanel} from './MissedTodoActionPanel';
import {Play} from 'lucide-react-native';

interface TodoCardProps {
  todo: Todo;
  index?: number;
  onToggle: (id: string) => void;
  onPress?: (todo: Todo) => void;
  onFocus?: (todo: Todo) => void;
  onSkipTodo?: (id: string, reason: 'not_needed' | 'missed') => void;
  onPostpone?: (todo: Todo) => void;
}

export function TodoCard({
  todo,
  index = 0,
  onToggle,
  onPress,
  onFocus,
  onSkipTodo,
  onPostpone,
}: TodoCardProps) {
  const haptic = useHaptic();
  const {primaryColor} = useTheme();
  const checkScale = useSharedValue(1);

  const handleToggle = useCallback(() => {
    // 체크 애니메이션: scale bounce
    checkScale.value = withSequence(
      withSpring(0.8, springs.snappy),
      withSpring(1.2, springs.bouncy),
      withSpring(1, springs.default),
    );
    haptic.success();
    onToggle(todo.id);
  }, [todo.id, onToggle, haptic, checkScale]);

  const checkAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{scale: checkScale.value}],
  }));

  const timeStr = todo.start_time
    ? format(new Date(todo.start_time), 'HH:mm') +
      (todo.end_time ? ` ~ ${format(new Date(todo.end_time), 'HH:mm')}` : '')
    : null;

  const priorityColor = getPriorityColor(todo.importance, todo.urgency);

  // 시간 상태 계산
  const timeStatus = useMemo(
    () => getTimeStatus(todo.start_time, todo.end_time, !!todo.completed),
    [todo.start_time, todo.end_time, todo.completed],
  );

  const timeStatusText = useMemo(
    () => getTimeStatusText(timeStatus),
    [timeStatus],
  );

  const isSkipped = !!(todo as any).skip_status;
  const isMissed =
    timeStatus.status === 'missed' && !todo.completed && !isSkipped;

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 50).duration(300)}
      layout={Layout.springify()}>
      <AnimatedPressable
        onPress={() => onPress?.(todo)}
        hapticType="light"
        scaleValue={0.98}
        style={[
          styles.container,
          todo.completed && styles.containerCompleted,
          isMissed && styles.containerMissed,
        ]}>
        {/* 우선순위 인디케이터 */}
        {priorityColor && (
          <View
            style={[styles.priorityBar, {backgroundColor: priorityColor}]}
          />
        )}

        {/* 체크박스 */}
        <AnimatedPressable
          onPress={handleToggle}
          haptic={false}
          scaleValue={0.85}
          style={styles.checkboxArea}>
          <Animated.View
            style={[
              styles.checkbox,
              todo.completed && styles.checkboxChecked,
              checkAnimatedStyle,
            ]}>
            {todo.completed && <Text style={styles.checkmark}>✓</Text>}
          </Animated.View>
        </AnimatedPressable>

        {/* 콘텐츠 */}
        <View style={styles.content}>
          {/* 시간 + 반복 */}
          {(timeStr || todo.recurrence_pattern !== 'none') && (
            <View style={styles.metaRow}>
              {timeStr && <Text style={styles.timeText}>{timeStr}</Text>}
              {todo.recurrence_pattern &&
                todo.recurrence_pattern !== 'none' && (
                  <Text style={styles.recurrenceIcon}>⇄</Text>
                )}
            </View>
          )}

          {/* 제목 */}
          <View style={styles.titleRow}>
            {(() => {
              const TodoIcon = resolveTodoIcon(todo.icon);
              return TodoIcon ? (
                <TodoIcon
                  size={16}
                  color={todo.completed ? '#9CA3AF' : '#6B7280'}
                  style={{marginRight: 4}}
                />
              ) : null;
            })()}
            <Text
              style={[
                styles.title,
                todo.completed && styles.titleCompleted,
              ]}
              numberOfLines={2}>
              {todo.title}
            </Text>
          </View>

          {/* 태그 행 */}
          <View style={styles.tagRow}>
            {todo.is_reluctant_must_do && (
              <View style={styles.tag}>
                <Text style={styles.tagText}>😤 해야 할 일</Text>
              </View>
            )}
            {todo.anytime_duration && (
              <View style={styles.tag}>
                <Text style={styles.tagText}>⏱ {todo.anytime_duration}분</Text>
              </View>
            )}
          </View>

          {/* 종료시간 초과 액션 패널 */}
          {isMissed && (
            <MissedTodoActionPanel
              overdueText={timeStatusText.primary ?? '종료 시간 지남'}
              onComplete={() => onToggle(todo.id)}
              onPostpone={() => onPostpone?.(todo)}
              onSkipNotNeeded={() => onSkipTodo?.(todo.id, 'not_needed')}
              onSkipMissed={() => onSkipTodo?.(todo.id, 'missed')}
            />
          )}
        </View>

        {/* 포커스 타이머 버튼 (미완료 + 미놓침 할일만) */}
        {onFocus && !todo.completed && !isMissed && (
          <AnimatedPressable
            onPress={() => {
              haptic.medium();
              onFocus(todo);
            }}
            haptic={false}
            scaleValue={0.85}
            style={[styles.focusBtn, {backgroundColor: primaryColor}]}>
            <Play size={12} color="#FFFFFF" strokeWidth={3} fill="#FFFFFF" />
          </AnimatedPressable>
        )}
      </AnimatedPressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
    overflow: 'hidden',
  },
  containerCompleted: {
    opacity: 0.6,
  },
  containerMissed: {
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  priorityBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  checkboxArea: {
    padding: 4,
    marginRight: 8,
    marginTop: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  timeText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  recurrenceIcon: {
    fontSize: 12,
    color: '#9CA3AF',
    marginLeft: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 15,
    color: '#1F2937',
    fontWeight: '500',
    lineHeight: 20,
    flex: 1,
  },
  titleCompleted: {
    textDecorationLine: 'line-through',
    color: '#9CA3AF',
  },
  tagRow: {
    flexDirection: 'row',
    marginTop: 4,
    gap: 6,
  },
  tag: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  tagText: {
    fontSize: 11,
    color: '#6B7280',
  },
  focusBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    marginTop: 2,
  },
});
