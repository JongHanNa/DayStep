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
  Keyboard,
  Alert,
  StyleSheet,
} from 'react-native';
import BottomSheet, {BottomSheetBackdrop, BottomSheetView} from '@gorhom/bottom-sheet';
import Animated, {FadeIn, FadeInDown} from 'react-native-reanimated';
import {AnimatedPressable} from '@/components/core';
import {SummaryRow} from './SummaryRow';
import {useHaptic} from '@/hooks/useHaptic';
import {useTodoStore} from '@/stores/todoStore';
import {useTheme} from '@/theme';
import {format, addHours, setMinutes, parseISO} from 'date-fns';
import {ko} from 'date-fns/locale';
import type {Todo} from '@daystep/shared-core';
import {resolveTodoIcon, ICON_CATEGORIES} from '@/lib/iconMap';
import {
  ClipboardList,
  Calendar,
  Clock,
  Repeat,
  CheckCircle,
} from 'lucide-react-native';

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
  scheduledDate: string; // yyyy-MM-dd
  scheduleType: ScheduleType;
  startTime: Date | null;
  endTime: Date | null;
  anytimeDuration: number | null; // minutes
  importance: boolean;
  urgency: boolean;
  isReluctantMustDo: boolean;
  recurrencePattern: RecurrencePattern;
  recurrenceDaysOfWeek: number[];
  completed: boolean;
}


const DURATIONS = [5, 10, 15, 20, 30, 45, 60, 90, 120];

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

const DEFAULT_FORM: FormData = {
  title: '',
  icon: '',
  scheduledDate: format(new Date(), 'yyyy-MM-dd'),
  scheduleType: 'anytime',
  startTime: null,
  endTime: null,
  anytimeDuration: null,
  importance: false,
  urgency: false,
  isReluctantMustDo: false,
  recurrencePattern: 'none',
  recurrenceDaysOfWeek: [],
  completed: false,
};

// ============================================
// Helpers
// ============================================

function getTimeLabel(form: FormData): string {
  if (form.scheduleType === 'timed' && form.startTime) {
    const start = format(form.startTime, 'HH:mm');
    const end = form.endTime ? format(form.endTime, 'HH:mm') : '';
    return end ? `${start} ~ ${end}` : start;
  }
  if (form.scheduleType === 'all_day') return '종일';
  if (form.scheduleType === 'anytime') {
    return form.anytimeDuration
      ? `시간 미정 (${form.anytimeDuration >= 60 ? `${form.anytimeDuration / 60}시간` : `${form.anytimeDuration}분`})`
      : '시간 미정';
  }
  return '시간 설정';
}

function getTimeSuffix(form: FormData): string | undefined {
  if (form.scheduleType === 'timed' && form.startTime && form.endTime) {
    const diffMin = Math.round(
      (form.endTime.getTime() - form.startTime.getTime()) / 60000,
    );
    if (diffMin > 0) {
      const h = Math.floor(diffMin / 60);
      const m = diffMin % 60;
      if (h > 0 && m > 0) return `${h}시간 ${m}분`;
      if (h > 0) return `${h}시간`;
      return `${m}분`;
    }
  }
  return undefined;
}

function getRecurrenceLabel(form: FormData): string {
  if (form.recurrencePattern === 'daily') return '매일';
  if (form.recurrencePattern === 'weekly') {
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    const days = form.recurrenceDaysOfWeek
      .sort()
      .map(d => dayNames[d])
      .join(', ');
    return days ? `매주 ${days}` : '매주';
  }
  if (form.recurrencePattern === 'monthly') return '매월';
  return '반복 없음';
}

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
    const [iconCategory, setIconCategory] = useState(0);
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
        setForm({...DEFAULT_FORM, scheduledDate: targetDate});
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
          scheduledDate: todo.start_time
            ? format(new Date(todo.start_time), 'yyyy-MM-dd')
            : selectedDate,
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
          completed: todo.completed ?? false,
        });
        setShowTimeSection(todo.schedule_type === 'timed');
        // timed인데 endTime이 없으면 자동 설정 (startTime + 1시간)
        if (todo.schedule_type === 'timed' && todo.start_time && !todo.end_time) {
          const start = new Date(todo.start_time);
          setForm(prev => ({...prev, endTime: addHours(start, 1)}));
        }
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
          completed: form.completed,
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
                  {(() => {
                    const ResolvedIcon = resolveTodoIcon(form.icon);
                    return ResolvedIcon ? (
                      <ResolvedIcon size={24} color="#6B7280" />
                    ) : (
                      <ClipboardList size={24} color="#9CA3AF" />
                    );
                  })()}
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

              {/* 루시드 아이콘 선택 */}
              {showIcons && (
                <Animated.View entering={FadeIn.duration(200)}>
                  {/* 카테고리 칩 */}
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.iconCategoryScroll}
                    contentContainerStyle={styles.iconCategoryContent}>
                    {ICON_CATEGORIES.map((cat, idx) => (
                      <AnimatedPressable
                        key={cat.label}
                        onPress={() => {
                          haptic.selection();
                          setIconCategory(idx);
                        }}
                        haptic={false}
                        style={[
                          styles.iconCategoryChip,
                          iconCategory === idx && {backgroundColor: primaryColor},
                        ]}>
                        <Text
                          style={[
                            styles.iconCategoryText,
                            iconCategory === idx && {color: '#FFFFFF'},
                          ]}>
                          {cat.label}
                        </Text>
                      </AnimatedPressable>
                    ))}
                  </ScrollView>
                  {/* 아이콘 그리드 */}
                  <View style={styles.iconGrid}>
                    {ICON_CATEGORIES[iconCategory]?.icons.map(({key, Icon}) => (
                      <AnimatedPressable
                        key={key}
                        onPress={() => {
                          haptic.selection();
                          updateField('icon', key === form.icon ? '' : key);
                        }}
                        haptic={false}
                        style={[
                          styles.iconOption,
                          key === form.icon && {
                            backgroundColor: primaryColor + '20',
                            borderColor: primaryColor,
                          },
                        ]}>
                        <Icon
                          size={22}
                          color={key === form.icon ? primaryColor : '#6B7280'}
                        />
                      </AnimatedPressable>
                    ))}
                  </View>
                </Animated.View>
              )}
            </View>

            {/* ──────── SummaryRow 섹션 ──────── */}
            <View style={styles.summarySection}>
              {/* 날짜 행 */}
              <SummaryRow
                Icon={Calendar}
                iconColor="#3B82F6"
                label={format(parseISO(form.scheduledDate), 'yyyy년 M월 d일 (EEE)', {locale: ko})}
                suffix={form.scheduledDate === format(new Date(), 'yyyy-MM-dd') ? '오늘' : undefined}
                showChevron={false}
              />

              {/* 시간 행 */}
              <SummaryRow
                Icon={Clock}
                iconColor="#F59E0B"
                label={getTimeLabel(form)}
                suffix={getTimeSuffix(form)}
                onPress={() => {
                  haptic.selection();
                  setShowTimeSection(v => !v);
                }}
              />

              {/* 반복 행 */}
              <SummaryRow
                Icon={Repeat}
                iconColor="#8B5CF6"
                label={getRecurrenceLabel(form)}
                onPress={() => {
                  haptic.selection();
                  setShowRecurrence(v => !v);
                }}
              />

              {/* 완료 토글 (편집 모드만) */}
              {mode === 'edit' && (
                <SummaryRow
                  Icon={CheckCircle}
                  iconColor={form.completed ? '#22C55E' : '#9CA3AF'}
                  label={form.completed ? '완료됨' : '미완료'}
                  switchValue={form.completed}
                  onSwitchChange={v => updateField('completed', v)}
                  primaryColor={primaryColor}
                  showChevron={false}
                />
              )}
            </View>

            {/* 시간 설정 패널 (펼침) */}
            {showTimeSection && (
              <Animated.View entering={FadeInDown.duration(250)} style={styles.section}>
                {/* 스케줄 타입 */}
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
                        {type === 'anytime' ? '시간 미정' : type === 'timed' ? '시간 지정' : '종일'}
                      </Text>
                    </AnimatedPressable>
                  ))}
                </View>

                {/* timed: 시작/종료 시간 */}
                {form.scheduleType === 'timed' && form.startTime && (
                  <View style={[styles.timeRow, {marginTop: 12}]}>
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
                          {' ~ '}{format(form.endTime, 'HH:mm')}
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
                )}

                {/* anytime: 소요 시간 */}
                {form.scheduleType === 'anytime' && (
                  <View style={[styles.chipRow, {marginTop: 12}]}>
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
                )}
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

            {/* 반복 설정 패널 (펼침) */}
            {showRecurrence && (
              <Animated.View entering={FadeInDown.duration(200)} style={styles.section}>
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
  summarySection: {
    marginTop: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 12,
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
  iconCategoryScroll: {
    marginTop: 12,
    marginBottom: 8,
  },
  iconCategoryContent: {
    gap: 6,
    paddingRight: 8,
  },
  iconCategoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
  },
  iconCategoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
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
