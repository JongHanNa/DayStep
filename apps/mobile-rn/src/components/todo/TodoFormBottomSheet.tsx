/**
 * TodoFormBottomSheet
 * 할일 생성/편집 바텀시트
 * - @gorhom/bottom-sheet 기반
 * - 제목, 스케줄 타입, 시간, 우선순위, 반복, 아이콘
 */
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  Keyboard,
  Alert,
  StyleSheet,
} from 'react-native';
import BottomSheet, {BottomSheetBackdrop, BottomSheetView} from '@gorhom/bottom-sheet';
import Animated, {FadeIn, FadeInDown} from 'react-native-reanimated';
import {AnimatedPressable} from '@/components/core';
import {useHaptic} from '@/hooks/useHaptic';
import {useTodoStore} from '@/stores/todoStore';
import {useTheme} from '@/theme';
import {format, addHours, setHours, setMinutes} from 'date-fns';
import type {Todo} from '@daystep/shared-core';

// ============================================
// Types
// ============================================

export interface TodoFormBottomSheetRef {
  openCreate: (date?: string) => void;
  openEdit: (todo: Todo) => void;
  close: () => void;
}

type ScheduleType = 'anytime' | 'timed' | 'all_day';
type RecurrencePattern = 'none' | 'daily' | 'weekly' | 'monthly';

interface FormData {
  title: string;
  icon: string;
  scheduleType: ScheduleType;
  startTime: Date | null;
  endTime: Date | null;
  anytimeDuration: number | null; // minutes
  importance: boolean;
  urgency: boolean;
  isReluctantMustDo: boolean;
  recurrencePattern: RecurrencePattern;
  recurrenceDaysOfWeek: number[];
}

const ICONS = ['📋', '💼', '📚', '🏃', '🛒', '📞', '✉️', '🎯', '💡', '🔧', '🎨', '🎵', '🍽️', '💊', '🧹', '🌿'];

const DURATIONS = [5, 10, 15, 20, 30, 45, 60, 90, 120];

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

const DEFAULT_FORM: FormData = {
  title: '',
  icon: '',
  scheduleType: 'anytime',
  startTime: null,
  endTime: null,
  anytimeDuration: null,
  importance: false,
  urgency: false,
  isReluctantMustDo: false,
  recurrencePattern: 'none',
  recurrenceDaysOfWeek: [],
};

// ============================================
// Component
// ============================================

export const TodoFormBottomSheet = forwardRef<TodoFormBottomSheetRef, {}>(
  (_props, ref) => {
    const bottomSheetRef = useRef<BottomSheet>(null);
    const titleInputRef = useRef<TextInput>(null);
    const haptic = useHaptic();
    const {primaryColor} = useTheme();

    const {createTodo, updateTodo, selectedDate} = useTodoStore();

    const [mode, setMode] = useState<'create' | 'edit'>('create');
    const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
    const [form, setForm] = useState<FormData>({...DEFAULT_FORM});
    const [showIcons, setShowIcons] = useState(false);
    const [showTimeSection, setShowTimeSection] = useState(false);
    const [showRecurrence, setShowRecurrence] = useState(false);
    const [saving, setSaving] = useState(false);

    const snapPoints = useMemo(() => ['75%', '92%'], []);

    // ------------------------------------------
    // Imperative handle
    // ------------------------------------------
    useImperativeHandle(ref, () => ({
      openCreate: (date?: string) => {
        const targetDate = date ?? selectedDate;
        setMode('create');
        setEditingTodo(null);
        setForm({...DEFAULT_FORM});
        setShowIcons(false);
        setShowTimeSection(false);
        setShowRecurrence(false);
        bottomSheetRef.current?.snapToIndex(0);
        setTimeout(() => titleInputRef.current?.focus(), 300);
      },
      openEdit: (todo: Todo) => {
        setMode('edit');
        setEditingTodo(todo);
        setForm({
          title: todo.title,
          icon: todo.icon ?? '',
          scheduleType: (todo.schedule_type as ScheduleType) ?? 'anytime',
          startTime: todo.start_time ? new Date(todo.start_time) : null,
          endTime: todo.end_time ? new Date(todo.end_time) : null,
          anytimeDuration: todo.anytime_duration ?? null,
          importance: todo.importance ?? false,
          urgency: todo.urgency ?? false,
          isReluctantMustDo: todo.is_reluctant_must_do ?? false,
          recurrencePattern: (todo.recurrence_pattern as RecurrencePattern) ?? 'none',
          recurrenceDaysOfWeek: Array.isArray(todo.recurrence_days_of_week)
            ? todo.recurrence_days_of_week
            : [],
        });
        setShowTimeSection(todo.schedule_type === 'timed');
        setShowRecurrence(todo.recurrence_pattern !== 'none');
        bottomSheetRef.current?.snapToIndex(0);
      },
      close: () => {
        bottomSheetRef.current?.close();
      },
    }));

    // ------------------------------------------
    // Form helpers
    // ------------------------------------------
    const updateField = useCallback(
      <K extends keyof FormData>(field: K, value: FormData[K]) => {
        setForm(prev => ({...prev, [field]: value}));
      },
      [],
    );

    const handleScheduleTypeChange = useCallback(
      (type: ScheduleType) => {
        haptic.selection();
        updateField('scheduleType', type);
        setShowTimeSection(type === 'timed');
        if (type === 'timed' && !form.startTime) {
          // 기본 시간 설정: 다음 정각
          const now = new Date();
          const nextHour = addHours(setMinutes(now, 0), 1);
          updateField('startTime', nextHour);
          updateField('endTime', addHours(nextHour, 1));
        }
      },
      [form.startTime, haptic, updateField],
    );

    const handleHourChange = useCallback(
      (delta: number) => {
        if (!form.startTime) return;
        haptic.selection();
        const newStart = addHours(form.startTime, delta);
        updateField('startTime', newStart);
        if (form.endTime) {
          updateField('endTime', addHours(form.endTime, delta));
        }
      },
      [form.startTime, form.endTime, haptic, updateField],
    );

    const toggleDay = useCallback(
      (day: number) => {
        haptic.selection();
        setForm(prev => {
          const days = prev.recurrenceDaysOfWeek.includes(day)
            ? prev.recurrenceDaysOfWeek.filter(d => d !== day)
            : [...prev.recurrenceDaysOfWeek, day];
          return {...prev, recurrenceDaysOfWeek: days};
        });
      },
      [haptic],
    );

    // ------------------------------------------
    // Save
    // ------------------------------------------
    const handleSave = useCallback(async () => {
      const trimmed = form.title.trim();
      if (!trimmed) {
        haptic.warning();
        return;
      }

      setSaving(true);
      haptic.light();

      try {
        const baseData: Record<string, any> = {
          title: trimmed,
          icon: form.icon || null,
          schedule_type: form.scheduleType,
          importance: form.importance || null,
          urgency: form.urgency || null,
          is_reluctant_must_do: form.isReluctantMustDo,
          recurrence_pattern: form.recurrencePattern,
        };

        if (form.scheduleType === 'timed' && form.startTime) {
          baseData.start_time = form.startTime.toISOString();
          baseData.end_time = form.endTime?.toISOString() ?? null;
        } else if (form.scheduleType === 'anytime') {
          // anytime: 선택한 날짜의 시작 시간 설정
          const dayStart = new Date(selectedDate + 'T00:00:00');
          baseData.start_time = dayStart.toISOString();
          baseData.anytime_duration = form.anytimeDuration;
        } else if (form.scheduleType === 'all_day') {
          const dayStart = new Date(selectedDate + 'T00:00:00');
          baseData.start_time = dayStart.toISOString();
        }

        if (form.recurrencePattern === 'weekly') {
          baseData.recurrence_days_of_week = form.recurrenceDaysOfWeek;
        }

        if (mode === 'create') {
          await createTodo(baseData as any);
        } else if (editingTodo) {
          await updateTodo(editingTodo.id, baseData as Partial<Todo>);
        }

        haptic.success();
        bottomSheetRef.current?.close();
      } catch {
        haptic.error();
        Alert.alert('오류', '저장에 실패했습니다');
      } finally {
        setSaving(false);
      }
    }, [form, mode, editingTodo, selectedDate, createTodo, updateTodo, haptic]);

    const handleDelete = useCallback(() => {
      if (!editingTodo) return;
      const {deleteTodo} = useTodoStore.getState();

      Alert.alert('할일 삭제', '정말 삭제하시겠어요?', [
        {text: '취소', style: 'cancel'},
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            await deleteTodo(editingTodo.id);
            haptic.medium();
            bottomSheetRef.current?.close();
          },
        },
      ]);
    }, [editingTodo, haptic]);

    // ------------------------------------------
    // Render helpers
    // ------------------------------------------
    const renderBackdrop = useCallback(
      (props: any) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={0.4}
        />
      ),
      [],
    );

    const priorityLabel = useMemo(() => {
      if (form.importance && form.urgency) return '🔴 긴급 + 중요';
      if (form.importance) return '🟡 중요';
      if (form.urgency) return '🔵 긴급';
      return '⚪ 보통';
    }, [form.importance, form.urgency]);

    return (
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        handleIndicatorStyle={{backgroundColor: '#D1D5DB'}}
        backgroundStyle={styles.sheetBg}
        onClose={() => Keyboard.dismiss()}>
        <BottomSheetView style={styles.container}>
          {/* 헤더 */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              {mode === 'create' ? '새 할일' : '할일 편집'}
            </Text>
            <View style={styles.headerActions}>
              {mode === 'edit' && (
                <AnimatedPressable
                  onPress={handleDelete}
                  hapticType="light"
                  style={styles.deleteBtn}>
                  <Text style={styles.deleteBtnText}>삭제</Text>
                </AnimatedPressable>
              )}
              <AnimatedPressable
                onPress={handleSave}
                hapticType="medium"
                style={[styles.saveBtn, {backgroundColor: primaryColor}]}>
                <Text style={styles.saveBtnText}>
                  {saving ? '저장 중...' : '저장'}
                </Text>
              </AnimatedPressable>
            </View>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            {/* 제목 입력 */}
            <View style={styles.section}>
              <View style={styles.titleRow}>
                <AnimatedPressable
                  onPress={() => {
                    haptic.selection();
                    setShowIcons(v => !v);
                  }}
                  haptic={false}
                  style={styles.iconBtn}>
                  <Text style={styles.iconBtnText}>
                    {form.icon || '📋'}
                  </Text>
                </AnimatedPressable>
                <TextInput
                  ref={titleInputRef}
                  value={form.title}
                  onChangeText={v => updateField('title', v)}
                  placeholder="할일을 입력하세요"
                  placeholderTextColor="#9CA3AF"
                  style={styles.titleInput}
                  returnKeyType="done"
                  autoFocus={mode === 'create'}
                />
              </View>

              {/* 아이콘 선택 */}
              {showIcons && (
                <Animated.View
                  entering={FadeIn.duration(200)}
                  style={styles.iconGrid}>
                  {ICONS.map(icon => (
                    <AnimatedPressable
                      key={icon}
                      onPress={() => {
                        haptic.selection();
                        updateField('icon', icon === form.icon ? '' : icon);
                      }}
                      haptic={false}
                      style={[
                        styles.iconOption,
                        icon === form.icon && {
                          backgroundColor: primaryColor + '20',
                          borderColor: primaryColor,
                        },
                      ]}>
                      <Text style={styles.iconOptionText}>{icon}</Text>
                    </AnimatedPressable>
                  ))}
                </Animated.View>
              )}
            </View>

            {/* 스케줄 타입 */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>스케줄</Text>
              <View style={styles.chipRow}>
                {(['anytime', 'timed', 'all_day'] as ScheduleType[]).map(type => (
                  <AnimatedPressable
                    key={type}
                    onPress={() => handleScheduleTypeChange(type)}
                    haptic={false}
                    style={[
                      styles.chip,
                      form.scheduleType === type && {
                        backgroundColor: primaryColor,
                      },
                    ]}>
                    <Text
                      style={[
                        styles.chipText,
                        form.scheduleType === type && styles.chipTextActive,
                      ]}>
                      {type === 'anytime' ? '⏱ 시간 미정' : type === 'timed' ? '🕐 시간 지정' : '📅 종일'}
                    </Text>
                  </AnimatedPressable>
                ))}
              </View>
            </View>

            {/* 시간 설정 (timed) */}
            {form.scheduleType === 'timed' && form.startTime && (
              <Animated.View entering={FadeInDown.duration(250)} style={styles.section}>
                <Text style={styles.sectionLabel}>시간</Text>
                <View style={styles.timeRow}>
                  <AnimatedPressable
                    onPress={() => handleHourChange(-1)}
                    hapticType="selection"
                    style={styles.timeBtn}>
                    <Text style={styles.timeBtnText}>−</Text>
                  </AnimatedPressable>
                  <View style={styles.timeDisplay}>
                    <Text style={styles.timeText}>
                      {format(form.startTime, 'HH:mm')}
                    </Text>
                    {form.endTime && (
                      <Text style={styles.timeSep}>
                        {' → '}{format(form.endTime, 'HH:mm')}
                      </Text>
                    )}
                  </View>
                  <AnimatedPressable
                    onPress={() => handleHourChange(1)}
                    hapticType="selection"
                    style={styles.timeBtn}>
                    <Text style={styles.timeBtnText}>+</Text>
                  </AnimatedPressable>
                </View>
              </Animated.View>
            )}

            {/* 소요 시간 (anytime) */}
            {form.scheduleType === 'anytime' && (
              <Animated.View entering={FadeInDown.duration(250)} style={styles.section}>
                <Text style={styles.sectionLabel}>예상 소요 시간</Text>
                <View style={styles.chipRow}>
                  {DURATIONS.map(d => (
                    <AnimatedPressable
                      key={d}
                      onPress={() => {
                        haptic.selection();
                        updateField('anytimeDuration', form.anytimeDuration === d ? null : d);
                      }}
                      haptic={false}
                      style={[
                        styles.durationChip,
                        form.anytimeDuration === d && {
                          backgroundColor: primaryColor,
                        },
                      ]}>
                      <Text
                        style={[
                          styles.chipText,
                          form.anytimeDuration === d && styles.chipTextActive,
                        ]}>
                        {d >= 60 ? `${d / 60}시간` : `${d}분`}
                      </Text>
                    </AnimatedPressable>
                  ))}
                </View>
              </Animated.View>
            )}

            {/* 우선순위 (아이젠하워 매트릭스) */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>우선순위</Text>
              <Text style={[styles.priorityBadge, {color: primaryColor}]}>
                {priorityLabel}
              </Text>
              <View style={styles.priorityRow}>
                <AnimatedPressable
                  onPress={() => {
                    haptic.selection();
                    updateField('importance', !form.importance);
                  }}
                  haptic={false}
                  style={[
                    styles.priorityBtn,
                    form.importance && styles.priorityBtnActive,
                    form.importance && {borderColor: '#F59E0B'},
                  ]}>
                  <Text style={styles.priorityBtnText}>
                    ⭐ 중요
                  </Text>
                </AnimatedPressable>
                <AnimatedPressable
                  onPress={() => {
                    haptic.selection();
                    updateField('urgency', !form.urgency);
                  }}
                  haptic={false}
                  style={[
                    styles.priorityBtn,
                    form.urgency && styles.priorityBtnActive,
                    form.urgency && {borderColor: '#3B82F6'},
                  ]}>
                  <Text style={styles.priorityBtnText}>
                    ⚡ 긴급
                  </Text>
                </AnimatedPressable>
                <AnimatedPressable
                  onPress={() => {
                    haptic.selection();
                    updateField('isReluctantMustDo', !form.isReluctantMustDo);
                  }}
                  haptic={false}
                  style={[
                    styles.priorityBtn,
                    form.isReluctantMustDo && styles.priorityBtnActive,
                    form.isReluctantMustDo && {borderColor: '#EF4444'},
                  ]}>
                  <Text style={styles.priorityBtnText}>
                    😤 해야 할 일
                  </Text>
                </AnimatedPressable>
              </View>
            </View>

            {/* 반복 설정 */}
            <View style={styles.section}>
              <AnimatedPressable
                onPress={() => {
                  haptic.selection();
                  setShowRecurrence(v => !v);
                }}
                haptic={false}
                style={styles.expandRow}>
                <Text style={styles.sectionLabel}>반복</Text>
                <Text style={styles.expandArrow}>
                  {showRecurrence ? '▾' : '▸'}{' '}
                  {form.recurrencePattern === 'none' ? '없음' : form.recurrencePattern === 'daily' ? '매일' : form.recurrencePattern === 'weekly' ? '매주' : '매월'}
                </Text>
              </AnimatedPressable>

              {showRecurrence && (
                <Animated.View entering={FadeInDown.duration(200)}>
                  <View style={styles.chipRow}>
                    {(['none', 'daily', 'weekly', 'monthly'] as RecurrencePattern[]).map(
                      p => (
                        <AnimatedPressable
                          key={p}
                          onPress={() => {
                            haptic.selection();
                            updateField('recurrencePattern', p);
                          }}
                          haptic={false}
                          style={[
                            styles.chip,
                            form.recurrencePattern === p && {
                              backgroundColor: primaryColor,
                            },
                          ]}>
                          <Text
                            style={[
                              styles.chipText,
                              form.recurrencePattern === p && styles.chipTextActive,
                            ]}>
                            {p === 'none' ? '없음' : p === 'daily' ? '매일' : p === 'weekly' ? '매주' : '매월'}
                          </Text>
                        </AnimatedPressable>
                      ),
                    )}
                  </View>

                  {/* 요일 선택 (weekly) */}
                  {form.recurrencePattern === 'weekly' && (
                    <View style={styles.weekdayRow}>
                      {WEEKDAYS.map((day, i) => (
                        <AnimatedPressable
                          key={i}
                          onPress={() => toggleDay(i)}
                          haptic={false}
                          style={[
                            styles.weekdayBtn,
                            form.recurrenceDaysOfWeek.includes(i) && {
                              backgroundColor: primaryColor,
                            },
                          ]}>
                          <Text
                            style={[
                              styles.weekdayText,
                              form.recurrenceDaysOfWeek.includes(i) &&
                                styles.weekdayTextActive,
                            ]}>
                            {day}
                          </Text>
                        </AnimatedPressable>
                      ))}
                    </View>
                  )}
                </Animated.View>
              )}
            </View>
          </ScrollView>
        </BottomSheetView>
      </BottomSheet>
    );
  },
);

TodoFormBottomSheet.displayName = 'TodoFormBottomSheet';

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
  sheetBg: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deleteBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
  },
  deleteBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#EF4444',
  },
  saveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  section: {
    marginTop: 20,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  // Title
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnText: {
    fontSize: 24,
  },
  titleInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
    paddingVertical: 10,
    marginLeft: 4,
  },
  // Icon grid
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  iconOption: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  iconOptionText: {
    fontSize: 22,
  },
  // Chips
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#4B5563',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  durationChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
  },
  // Time
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  timeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeBtnText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#4B5563',
  },
  timeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
  },
  timeSep: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  // Priority
  priorityBadge: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  priorityBtnActive: {
    backgroundColor: '#FFF7ED',
  },
  priorityBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
  },
  // Recurrence
  expandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 0,
  },
  expandArrow: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  weekdayBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  weekdayText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
  },
  weekdayTextActive: {
    color: '#FFFFFF',
  },
});
