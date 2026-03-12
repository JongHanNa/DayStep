/**
 * TodoCard
 * 할일 카드 — 애니메이션 체크박스 + 우선순위 표시 + 종료시간 초과 프롬프트
 */
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {View, Text, StyleSheet, Pressable} from 'react-native';
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
import {getPriorityColor, hexWithOpacity} from '@/lib/todoUtils';
import {getTimeStatus, getTimeStatusText} from '@/lib/timeStatus';
import {MissedTodoActionPanel} from './MissedTodoActionPanel';
import {DeferredTodoActionPanel} from './DeferredTodoActionPanel';
import {Play, XCircle, MinusCircle, Shield, Clock} from 'lucide-react-native';

interface LinkedFuel {
  id: string;
  title: string;
  content: string;
}

interface TodoCardProps {
  todo: Todo;
  index?: number;
  projectMap?: Map<string, {title: string; color: string; icon?: string}>;
  onToggle: (id: string) => void;
  onPress?: (todo: Todo) => void;
  onFocus?: (todo: Todo) => void;
  onSkipTodo?: (id: string, reason: 'not_needed' | 'missed') => void;
  onUnskipTodo?: (todo: Todo) => void;
  onPostpone?: (todo: Todo) => void;
  onDeferComplete?: (todo: Todo) => void;
  onRestoreOriginal?: (todo: Todo) => void;
  linkedFuels?: LinkedFuel[];
  isNextUpcoming?: boolean;
}

export function TodoCard({
  todo,
  index = 0,
  projectMap,
  onToggle,
  onPress,
  onFocus,
  onSkipTodo,
  onUnskipTodo,
  onPostpone,
  onDeferComplete,
  onRestoreOriginal,
  linkedFuels,
  isNextUpcoming,
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

  const isAnytime = todo.schedule_type === 'anytime' || !todo.start_time;
  const timeStr = (!isAnytime && todo.start_time)
    ? format(new Date(todo.start_time), 'HH:mm') +
      (todo.end_time ? ` ~ ${format(new Date(todo.end_time), 'HH:mm')}` : '')
    : null;

  const priorityColor = getPriorityColor(todo.importance, todo.urgency, primaryColor);

  // 실시간 업데이트를 위한 now state
  const [now, setNow] = useState(() => Date.now());

  // 시간 상태 계산
  const timeStatus = useMemo(
    () => getTimeStatus(todo.start_time, todo.end_time, !!todo.completed, new Date(now)),
    [todo.start_time, todo.end_time, todo.completed, now],
  );

  const timeStatusText = useMemo(
    () => getTimeStatusText(timeStatus),
    [timeStatus],
  );

  // missed, in_progress, 또는 다음 일정(upcoming) 상태일 때 now 갱신
  const needsTimer = timeStatus.status === 'missed' || (isNextUpcoming && timeStatus.status === 'upcoming') || timeStatus.status === 'in_progress';
  useEffect(() => {
    if (!needsTimer) return;
    const interval = timeStatus.status === 'in_progress' ? 1_000 : 60_000;
    const id = setInterval(() => setNow(Date.now()), interval);
    return () => clearInterval(id);
  }, [needsTimer, timeStatus.status]);

  const isSkipped = !!(todo as any).skip_status;
  const skipReason = (todo as any).skip_status as string | undefined;
  const isMissed =
    !isAnytime && timeStatus.status === 'missed' && !todo.completed && !isSkipped;

  // 미뤄진 반복 할일 감지
  const isDeferredTodo = !!(todo as any).parent_recurring_todo_id
    && !!(todo as any).original_start_time
    && !todo.completed;

  const [expandedFuelId, setExpandedFuelId] = useState<string | null>(null);

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
          isSkipped && styles.containerSkipped,
          isMissed && styles.containerMissed,
          !todo.completed && priorityColor && {backgroundColor: hexWithOpacity(priorityColor, 0.04)},
        ]}>
        {/* 체크박스 */}
        <AnimatedPressable
          onPress={isSkipped ? () => { haptic.light(); onUnskipTodo?.(todo); } : handleToggle}
          haptic={false}
          scaleValue={0.85}
          style={styles.checkboxArea}>
          <Animated.View
            style={[
              styles.checkbox,
              todo.completed && {backgroundColor: primaryColor, borderColor: primaryColor},
              !todo.completed && priorityColor && {borderColor: priorityColor, borderWidth: 2.5},
              isSkipped && skipReason === 'missed' && styles.checkboxMissed,
              isSkipped && skipReason === 'not_needed' && styles.checkboxNotNeeded,
              checkAnimatedStyle,
            ]}>
            {isSkipped ? (
              skipReason === 'missed' ? (
                <XCircle size={18} color="#DC2626" strokeWidth={2} />
              ) : (
                <MinusCircle size={18} color="#6B7280" strokeWidth={2} />
              )
            ) : todo.completed ? (
              <Text style={styles.checkmark}>✓</Text>
            ) : null}
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
                isSkipped && styles.titleSkipped,
              ]}
              numberOfLines={2}>
              {todo.title}
            </Text>
          </View>

          {/* 태그 행 */}
          <View style={styles.tagRow}>
            {todo.is_reluctant_must_do && (
              <View style={styles.tag}>
                <Shield size={12} color="#6B7280" />
                <Text style={styles.tagText}>해야 할 일</Text>
              </View>
            )}
            {todo.anytime_duration && (
              <View style={styles.tag}>
                <Clock size={12} color="#6B7280" />
                <Text style={styles.tagText}>{todo.anytime_duration}분</Text>
              </View>
            )}
            {/* skip 상태 배지 */}
            {isSkipped && (
              <View style={[
                styles.tag,
                skipReason === 'missed' ? styles.skipTagMissed : styles.skipTagNotNeeded,
              ]}>
                <Text style={[
                  styles.tagText,
                  skipReason === 'missed' ? styles.skipTagMissedText : styles.skipTagNotNeededText,
                ]}>
                  {skipReason === 'missed' ? '놓침' : '필요없었음'}
                </Text>
              </View>
            )}
          </View>

          {/* 연결된 프로젝트 배지 */}
          {projectMap && todo.project_id && projectMap.get(todo.project_id) && (() => {
            const proj = projectMap.get(todo.project_id)!;
            return (
              <View style={[styles.projectBadge, {
                backgroundColor: proj.color ? `${proj.color}20` : '#F3F4F6',
                borderColor: proj.color || '#D1D5DB',
              }]}>
                {proj.icon && <Text style={styles.projectIcon}>{proj.icon}</Text>}
                <Text
                  style={[styles.projectText, {color: proj.color || '#6B7280'}]}
                  numberOfLines={1}>
                  {proj.title}
                </Text>
              </View>
            );
          })()}

          {/* 진행률 바 + 남은 시간 */}
          {timeStatus.status === 'in_progress' && (
            <View style={styles.progressSection}>
              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    {width: `${timeStatus.progressPercent ?? 0}%`, backgroundColor: primaryColor},
                  ]}
                />
              </View>
              {timeStatusText.secondary && (
                <Text style={styles.remainingText}>{timeStatusText.secondary}</Text>
              )}
            </View>
          )}

          {/* 다음 일정 시작까지 남은 시간 */}
          {timeStatus.status === 'upcoming' && isNextUpcoming && timeStatusText.secondary && (
            <View style={styles.upcomingSection}>
              <Clock size={12} color={primaryColor} />
              <Text style={[styles.upcomingText, {color: primaryColor}]}>{timeStatusText.secondary}  시작할 준비 하세요!</Text>
            </View>
          )}

          {/* 연결된 원동력(fuel) 배지 */}
          {linkedFuels && linkedFuels.length > 0 && (
            <View style={styles.fuelRow}>
              {linkedFuels.map(fuel => {
                const text = fuel.title && fuel.content
                  ? `${fuel.title} - ${fuel.content}`
                  : fuel.title || fuel.content;
                const isExpanded = expandedFuelId === fuel.id;
                return (
                  <Animated.View key={fuel.id} layout={Layout.springify()}>
                    <Pressable
                      onPress={() => setExpandedFuelId(isExpanded ? null : fuel.id)}
                      style={[styles.fuelBadge, {backgroundColor: hexWithOpacity(primaryColor, 0.15)}]}>
                      <Text style={styles.fuelIcon}>⚡</Text>
                      <Text
                        style={[styles.fuelText, {color: primaryColor}]}
                        numberOfLines={isExpanded ? undefined : 1}>
                        {text}
                      </Text>
                    </Pressable>
                  </Animated.View>
                );
              })}
            </View>
          )}

          {/* 미뤄진 할일 액션 패널 */}
          {isDeferredTodo && (
            <DeferredTodoActionPanel
              originalTime={format(new Date((todo as any).original_start_time), 'HH:mm')}
              onComplete={() => onDeferComplete?.(todo)}
              onRestore={() => onRestoreOriginal?.(todo)}
            />
          )}

          {/* 미뤄둔 할일이면서 종료시간 지남 → 텍스트만 표시 */}
          {isMissed && isDeferredTodo && (
            <View style={styles.overdueTextOnly}>
              <Text style={styles.overdueText}>
                {timeStatusText.primary ?? '종료 시간 지남'}
              </Text>
            </View>
          )}

          {/* 종료시간 초과 액션 패널 (미뤄둔 할일 제외) */}
          {isMissed && !isDeferredTodo && (
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
        {onFocus && !todo.completed && !isMissed && !isSkipped && (
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
  },
  overdueTextOnly: {
    marginTop: 4,
  },
  overdueText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '500',
  },
  containerCompleted: {
    opacity: 0.6,
  },
  containerMissed: {
    borderWidth: 1,
    borderColor: '#FEE2E2',
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
  // checkboxChecked: now uses inline primaryColor styles
  checkboxMissed: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
  },
  checkboxNotNeeded: {
    backgroundColor: '#F3F4F6',
    borderColor: '#D1D5DB',
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  tagText: {
    fontSize: 11,
    color: '#6B7280',
  },
  containerSkipped: {
    opacity: 0.6,
  },
  titleSkipped: {
    textDecorationLine: 'line-through',
    color: '#9CA3AF',
  },
  skipTagMissed: {
    backgroundColor: '#FEE2E2',
  },
  skipTagMissedText: {
    color: '#DC2626',
  },
  skipTagNotNeeded: {
    backgroundColor: '#F3F4F6',
  },
  skipTagNotNeededText: {
    color: '#6B7280',
  },
  progressSection: {
    marginTop: 6,
  },
  progressBarBg: {
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  remainingText: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  upcomingSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  upcomingText: {
    fontSize: 11,
    fontWeight: '500',
  },
  fuelRow: {
    marginTop: 6,
    gap: 4,
  },
  fuelBadge: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 2,
  },
  fuelIcon: {
    fontSize: 11,
  },
  fuelText: {
    fontSize: 11,
    flex: 1,
  },
  projectBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 4,
    alignSelf: 'flex-start',
    gap: 2,
  },
  projectIcon: {
    fontSize: 11,
  },
  projectText: {
    fontSize: 11,
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
