/**
 * FocusPickerModal
 * "포커스 >" 탭 시 열리는 할일/빠른 집중 선택 모달
 * ProjectPickerModal 패턴 참조
 */
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  StyleSheet,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  interpolateColor,
} from 'react-native-reanimated';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {X, ClipboardList, Zap} from 'lucide-react-native';
import {AnimatedPressable} from '@/components/core';
import {useTodoStore} from '@/stores/todoStore';
import {resolveTodoIcon} from '@/lib/iconMap';
import {useTheme} from '@/theme';
import type {Todo} from '@daystep/shared-core';

// ============================================
// Constants
// ============================================

const VIOLET = '#8B5CF6';
const QUICK_FOCUS_SECONDS = 20 * 60;
const DEFAULT_FOCUS_SECONDS = 25 * 60;

type FocusMode = 'todo' | 'quick';

export interface FocusPickerResult {
  mode: FocusMode;
  todoId?: string;
  todoTitle?: string;
  durationSeconds: number;
}

interface FocusPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (result: FocusPickerResult) => void;
}

// ============================================
// Duration Helpers
// ============================================

function calcTodoDuration(todo: Todo): number {
  if (todo.start_time && todo.end_time) {
    const diff = new Date(todo.end_time).getTime() - new Date(todo.start_time).getTime();
    return Math.max(Math.round(diff / 1000), 60);
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
  primaryColor,
}: {
  mode: FocusMode;
  onChangeMode: (m: FocusMode) => void;
  primaryColor: string;
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
      [primaryColor, VIOLET],
    ),
  }));

  return (
    <View style={styles.segmentContainer}>
      <Animated.View style={[styles.segmentIndicator, indicatorStyle]} />
      <AnimatedPressable
        onPress={() => onChangeMode('todo')}
        hapticType="selection"
        style={styles.segmentBtn}>
        <View style={styles.segmentContent}>
          <ClipboardList size={14} color={mode === 'todo' ? '#1F2937' : '#9CA3AF'} />
          <Text style={[styles.segmentText, mode === 'todo' && styles.segmentTextActive]}>
            할일 집중
          </Text>
        </View>
      </AnimatedPressable>
      <AnimatedPressable
        onPress={() => onChangeMode('quick')}
        hapticType="selection"
        style={styles.segmentBtn}>
        <View style={styles.segmentContent}>
          <Zap size={14} color={mode === 'quick' ? '#1F2937' : '#9CA3AF'} />
          <Text style={[styles.segmentText, mode === 'quick' && styles.segmentTextActive]}>
            빠른 집중
          </Text>
        </View>
      </AnimatedPressable>
    </View>
  );
}

// ============================================
// Todo Radio Item
// ============================================

function TodoRadioItem({
  todo,
  selected,
  onSelect,
  duration,
  primaryColor,
}: {
  todo: Todo;
  selected: boolean;
  onSelect: () => void;
  duration: number;
  primaryColor: string;
}) {
  return (
    <AnimatedPressable
      onPress={onSelect}
      hapticType="selection"
      scaleValue={0.98}
      style={[
        styles.todoItem,
        selected && styles.todoItemSelected,
        selected && {borderColor: primaryColor, backgroundColor: `${primaryColor}15`},
      ]}>
      <View
        style={[
          styles.radioOuter,
          selected && {borderColor: primaryColor},
        ]}>
        {selected && <View style={[styles.radioInner, {backgroundColor: primaryColor}]} />}
      </View>
      <View style={styles.todoContent}>
        <View style={styles.todoTitleRow}>
          {(() => {
            const Icon = resolveTodoIcon(todo.icon);
            return Icon ? <Icon size={16} color="#6B7280" style={{marginRight: 6}} /> : null;
          })()}
          <Text style={styles.todoTitle} numberOfLines={1}>{todo.title}</Text>
        </View>
        <Text style={styles.todoDuration}>{formatDurationLabel(duration)}</Text>
      </View>
    </AnimatedPressable>
  );
}

// ============================================
// Main Modal
// ============================================

export function FocusPickerModal({visible, onClose, onSelect}: FocusPickerModalProps) {
  const insets = useSafeAreaInsets();
  const {primaryColor} = useTheme();
  const {todos, selectedDate, fetchTodosForDate} = useTodoStore();

  const [mode, setMode] = useState<FocusMode>('todo');
  const [selectedTodoId, setSelectedTodoId] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      fetchTodosForDate(selectedDate);
    }
  }, [visible, selectedDate, fetchTodosForDate]);

  const incompleteTodos = useMemo(
    () => todos.filter(t => !t.completed),
    [todos],
  );

  // 첫 번째 할일 자동 선택
  useEffect(() => {
    if (visible && incompleteTodos.length > 0 && !selectedTodoId) {
      setSelectedTodoId(incompleteTodos[0].id);
    }
  }, [visible, incompleteTodos, selectedTodoId]);

  const selectedTodo = useMemo(
    () => incompleteTodos.find(t => t.id === selectedTodoId) ?? null,
    [incompleteTodos, selectedTodoId],
  );

  const handleConfirm = useCallback(() => {
    if (mode === 'todo' && selectedTodo) {
      onSelect({
        mode: 'todo',
        todoId: selectedTodo.id,
        todoTitle: selectedTodo.title,
        durationSeconds: calcTodoDuration(selectedTodo),
      });
    } else if (mode === 'quick') {
      onSelect({
        mode: 'quick',
        durationSeconds: QUICK_FOCUS_SECONDS,
      });
    }
    onClose();
  }, [mode, selectedTodo, onSelect, onClose]);

  const canConfirm = mode === 'quick' || (mode === 'todo' && selectedTodo);

  return (
    <Modal
      visible={visible}
      presentationStyle="pageSheet"
      animationType="slide"
      onRequestClose={onClose}>
      <View style={[styles.modalContainer, {paddingTop: insets.top || 16}]}>
        {/* 헤더 */}
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>포커스 선택</Text>
          <AnimatedPressable onPress={onClose} hapticType="light" style={styles.closeBtn}>
            <X size={20} color="#6B7280" />
          </AnimatedPressable>
        </View>

        {/* 세그먼트 */}
        <View style={styles.segmentWrapper}>
          <SegmentControl mode={mode} onChangeMode={setMode} primaryColor={primaryColor} />
        </View>

        {/* 콘텐츠 */}
        <View style={styles.modalContent}>
          {mode === 'todo' ? (
            incompleteTodos.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
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
                    primaryColor={primaryColor}
                  />
                ))}
              </ScrollView>
            )
          ) : (
            <View style={styles.quickContainer}>
              <Text style={styles.quickDesc}>
                할일을 정하지 않고 바로 시작해요.{'\n'}끝나면 무엇을 했는지 기록할 수 있어요.
              </Text>
            </View>
          )}
        </View>

        {/* 선택 버튼 */}
        <View style={[styles.modalFooter, {paddingBottom: Math.max(insets.bottom, 16)}]}>
          <AnimatedPressable
            onPress={handleConfirm}
            hapticType="medium"
            scaleValue={0.95}
            disabled={!canConfirm}
            style={[
              styles.confirmBtn,
              {backgroundColor: mode === 'todo' ? primaryColor : VIOLET},
              !canConfirm && {opacity: 0.4},
            ]}>
            <Text style={styles.confirmBtnText}>선택</Text>
          </AnimatedPressable>
        </View>
      </View>
    </Modal>
  );
}

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Segment
  segmentWrapper: {
    paddingHorizontal: 20,
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
  segmentContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  segmentTextActive: {
    color: '#1F2937',
  },

  // Content
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  todoList: {
    flex: 1,
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
  todoItemSelected: {},
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
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  todoContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  todoTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  todoTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#1F2937',
  },
  todoDuration: {
    fontSize: 13,
    fontWeight: '500',
    color: '#9CA3AF',
  },

  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 22,
  },

  quickContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickDesc: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },

  // Footer
  modalFooter: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  confirmBtn: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  confirmBtnText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
