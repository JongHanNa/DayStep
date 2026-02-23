/**
 * TodoFormBottomSheet
 * 할일 생성/편집 바텀시트 — Progressive Disclosure 패턴
 * - Create: 제목 auto-focus + 설명 + AttributeToolbar
 * - Edit: 날짜 요약 + Hero 제목 + 설명 + AttributeToolbar + 완료 토글
 * - 기본값: timed(다음 정시 ~ +1hr), 알람 정각
 */
import React, {
  useCallback,
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
  Switch,
} from 'react-native';
import BottomSheet, {BottomSheetBackdrop, BottomSheetView} from '@gorhom/bottom-sheet';
import {AnimatedPressable} from '@/components/core';
import {AttributeToolbar} from './AttributeToolbar';
import {TimePickerSheet, type TimePickerSheetRef} from './sheets/TimePickerSheet';
import {RecurrencePickerSheet, type RecurrencePickerSheetRef} from './sheets/RecurrencePickerSheet';
import {PriorityPickerSheet, type PriorityPickerSheetRef} from './sheets/PriorityPickerSheet';
import {IconPickerSheet, type IconPickerSheetRef} from './sheets/IconPickerSheet';
import {AlarmPickerSheet, type AlarmPickerSheetRef} from './sheets/AlarmPickerSheet';
import {useHaptic} from '@/hooks/useHaptic';
import {useTodoStore} from '@/stores/todoStore';
import {useTheme} from '@/theme';
import {format, addHours, parseISO, isToday} from 'date-fns';
import {ko} from 'date-fns/locale';
import type {Todo} from '@daystep/shared-core';
import {resolveTodoIcon} from '@/lib/iconMap';
import {getAlarmLabel} from '@/lib/notifications';
import {ClipboardList} from 'lucide-react-native';

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
  content: string;
  icon: string;
  scheduledDate: string; // yyyy-MM-dd
  scheduleType: ScheduleType;
  startTime: Date | null;
  endTime: Date | null;
  anytimeDuration: number | null; // minutes
  alarmOffsetMinutes: number | null;
  importance: boolean;
  urgency: boolean;
  isReluctantMustDo: boolean;
  recurrencePattern: RecurrencePattern;
  recurrenceDaysOfWeek: number[];
  completed: boolean;
}

/** 다음 정시 계산 */
function getNextHour(): Date {
  const now = new Date();
  const next = new Date(now);
  next.setMinutes(0, 0, 0);
  next.setHours(now.getHours() + 1);
  return next;
}

const DEFAULT_FORM: FormData = {
  title: '',
  content: '',
  icon: '',
  scheduledDate: format(new Date(), 'yyyy-MM-dd'),
  scheduleType: 'timed',
  startTime: getNextHour(),
  endTime: addHours(getNextHour(), 1),
  anytimeDuration: null,
  alarmOffsetMinutes: 0, // 정각에
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
  return '';
}

function getDateSummary(form: FormData): string {
  const parts: string[] = [];

  // 날짜
  const date = parseISO(form.scheduledDate);
  if (isToday(date)) {
    parts.push(`오늘, ${format(date, 'M월 d일', {locale: ko})}`);
  } else {
    parts.push(format(date, 'M월 d일 (EEE)', {locale: ko}));
  }

  // 시간
  if (form.scheduleType === 'timed' && form.startTime) {
    parts[0] += ` ${format(form.startTime, 'HH:mm')}`;
  }

  return parts.join(' ');
}

function getDateSummaryExtras(form: FormData): string[] {
  const extras: string[] = [];
  if (form.alarmOffsetMinutes !== null) {
    extras.push(`🔔 ${getAlarmLabel(form.alarmOffsetMinutes)}`);
  }
  const recLabel = getRecurrenceLabel(form);
  if (recLabel) {
    extras.push(`🔄 ${recLabel}`);
  }
  return extras;
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

    // 서브시트 refs
    const timeSheetRef = useRef<TimePickerSheetRef>(null);
    const recurrenceSheetRef = useRef<RecurrencePickerSheetRef>(null);
    const prioritySheetRef = useRef<PriorityPickerSheetRef>(null);
    const iconSheetRef = useRef<IconPickerSheetRef>(null);
    const alarmSheetRef = useRef<AlarmPickerSheetRef>(null);

    const {createTodo, updateTodo, selectedDate} = useTodoStore();

    const [mode, setMode] = useState<'create' | 'edit'>('create');
    const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
    const [form, setForm] = useState<FormData>({...DEFAULT_FORM});
    const [saving, setSaving] = useState(false);

    const snapPoints = useMemo(
      () => (mode === 'create' ? ['50%'] : ['55%', '85%']),
      [mode],
    );

    // ------------------------------------------
    // Imperative handle
    // ------------------------------------------
    useImperativeHandle(ref, () => ({
      openCreate: (date?: string) => {
        const targetDate = date ?? selectedDate;
        const nextHour = getNextHour();
        setMode('create');
        setEditingTodo(null);
        setForm({
          ...DEFAULT_FORM,
          scheduledDate: targetDate,
          startTime: nextHour,
          endTime: addHours(nextHour, 1),
        });
        bottomSheetRef.current?.snapToIndex(0);
        setTimeout(() => titleInputRef.current?.focus(), 300);
      },
      openEdit: (todo: Todo) => {
        setMode('edit');
        setEditingTodo(todo);
        setForm({
          title: todo.title,
          content: (todo as any).content ?? '',
          icon: todo.icon ?? '',
          scheduledDate: todo.start_time
            ? format(new Date(todo.start_time), 'yyyy-MM-dd')
            : selectedDate,
          scheduleType: (todo.schedule_type as ScheduleType) ?? 'timed',
          startTime: todo.start_time ? new Date(todo.start_time) : null,
          endTime: todo.end_time ? new Date(todo.end_time) : null,
          anytimeDuration: todo.anytime_duration ?? null,
          alarmOffsetMinutes: (todo as any).alarm_offset_minutes ?? null,
          importance: (todo as any).importance ?? false,
          urgency: (todo as any).urgency ?? false,
          isReluctantMustDo: (todo as any).is_reluctant_must_do ?? false,
          recurrencePattern: (todo.recurrence_pattern as RecurrencePattern) ?? 'none',
          recurrenceDaysOfWeek: Array.isArray(todo.recurrence_days_of_week)
            ? (todo.recurrence_days_of_week as number[])
            : [],
          completed: todo.completed ?? false,
        });
        // timed인데 endTime이 없으면 자동 설정
        if (todo.schedule_type === 'timed' && todo.start_time && !todo.end_time) {
          const start = new Date(todo.start_time);
          setForm(prev => ({...prev, endTime: addHours(start, 1)}));
        }
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
          content: form.content.trim() || null,
          icon: form.icon || null,
          schedule_type: form.scheduleType,
          importance: form.importance || null,
          urgency: form.urgency || null,
          is_reluctant_must_do: form.isReluctantMustDo,
          recurrence_pattern: form.recurrencePattern,
          completed: form.completed,
          alarm_offset_minutes: form.alarmOffsetMinutes,
        };

        if (form.scheduleType === 'timed' && form.startTime) {
          baseData.start_time = form.startTime.toISOString();
          baseData.end_time = form.endTime?.toISOString() ?? null;
        } else if (form.scheduleType === 'anytime') {
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

        let savedTodoId: string | null = null;

        if (mode === 'create') {
          const result = await createTodo(baseData as any);
          savedTodoId = result?.id ?? null;
        } else if (editingTodo) {
          await updateTodo(editingTodo.id, baseData as Partial<Todo>);
          savedTodoId = editingTodo.id;
        }

        // 알림 스케줄링
        if (savedTodoId) {
          const {scheduleTodoAlarm, cancelTodoAlarm} = await import('@/lib/notifications');
          if (
            form.alarmOffsetMinutes !== null &&
            form.scheduleType === 'timed' &&
            form.startTime
          ) {
            await scheduleTodoAlarm(
              savedTodoId,
              trimmed,
              form.startTime,
              form.alarmOffsetMinutes,
            );
          } else {
            await cancelTodoAlarm(savedTodoId);
          }
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
            // 알림 취소
            const {cancelTodoAlarm} = await import('@/lib/notifications');
            await cancelTodoAlarm(editingTodo.id);

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

    const dateSummary = getDateSummary(form);
    const dateSummaryExtras = getDateSummaryExtras(form);

    return (
      <>
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
            {/* ──────── 헤더 ──────── */}
            <View style={styles.header}>
              {mode === 'edit' ? (
                <View style={styles.headerLeft}>
                  {(() => {
                    const ResolvedIcon = resolveTodoIcon(form.icon);
                    return ResolvedIcon ? (
                      <ResolvedIcon size={20} color="#6B7280" />
                    ) : (
                      <ClipboardList size={20} color="#9CA3AF" />
                    );
                  })()}
                  <Text style={styles.headerTitle}>할일 편집</Text>
                </View>
              ) : (
                <Text style={styles.headerTitle}>새 할일</Text>
              )}
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

              {/* ──────── Edit: 날짜/시간 요약 라인 ──────── */}
              {mode === 'edit' && (
                <View style={styles.dateSummaryRow}>
                  <Text style={styles.dateSummaryText}>
                    📅 {dateSummary}
                  </Text>
                  {dateSummaryExtras.map((extra, i) => (
                    <React.Fragment key={i}>
                      <Text style={styles.dateSummaryDot}>·</Text>
                      <Text style={styles.dateSummaryText}>{extra}</Text>
                    </React.Fragment>
                  ))}
                </View>
              )}

              {/* ──────── 제목 입력 ──────── */}
              {mode === 'create' ? (
                <View style={styles.titleSection}>
                  <View style={styles.titleRow}>
                    <AnimatedPressable
                      onPress={() => {
                        haptic.selection();
                        iconSheetRef.current?.open();
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
                      returnKeyType="next"
                    />
                  </View>
                </View>
              ) : (
                /* Edit: Hero Title */
                <View style={styles.heroSection}>
                  <TextInput
                    ref={titleInputRef}
                    value={form.title}
                    onChangeText={v => updateField('title', v)}
                    placeholder="할일을 입력하세요"
                    placeholderTextColor="#9CA3AF"
                    style={styles.heroTitle}
                    multiline
                  />
                </View>
              )}

              {/* ──────── 설명 입력 ──────── */}
              <View style={styles.descSection}>
                <TextInput
                  value={form.content}
                  onChangeText={v => updateField('content', v)}
                  placeholder="설명"
                  placeholderTextColor="#D1D5DB"
                  style={styles.descInput}
                  multiline
                  numberOfLines={2}
                />
              </View>

              {/* ──────── 속성 툴바 ──────── */}
              <View style={styles.toolbarBorder} />
              <AttributeToolbar
                form={form}
                onDatePress={() => {
                  haptic.selection();
                  // TODO: DatePickerSheet (현재는 날짜 고정)
                }}
                onTimePress={() => {
                  haptic.selection();
                  timeSheetRef.current?.open();
                }}
                onAlarmPress={() => {
                  haptic.selection();
                  alarmSheetRef.current?.open();
                }}
                onRecurrencePress={() => {
                  haptic.selection();
                  recurrenceSheetRef.current?.open();
                }}
                onPriorityPress={() => {
                  haptic.selection();
                  prioritySheetRef.current?.open();
                }}
              />

              {/* ──────── 완료 토글 (편집 모드만) ──────── */}
              {mode === 'edit' && (
                <View style={styles.completionRow}>
                  <Text style={styles.completionLabel}>
                    {form.completed ? '✅ 완료됨' : '⭕ 미완료'}
                  </Text>
                  <Switch
                    value={form.completed}
                    onValueChange={v => updateField('completed', v)}
                    trackColor={{false: '#E5E7EB', true: primaryColor}}
                    thumbColor="#FFFFFF"
                  />
                </View>
              )}
            </ScrollView>
          </BottomSheetView>
        </BottomSheet>

        {/* ──────── 서브시트 (메인시트 외부에 렌더) ──────── */}
        <TimePickerSheet
          ref={timeSheetRef}
          scheduleType={form.scheduleType}
          startTime={form.startTime}
          endTime={form.endTime}
          anytimeDuration={form.anytimeDuration}
          onScheduleTypeChange={v => updateField('scheduleType', v)}
          onStartTimeChange={v => updateField('startTime', v)}
          onEndTimeChange={v => updateField('endTime', v)}
          onAnytimeDurationChange={v => updateField('anytimeDuration', v)}
        />

        <RecurrencePickerSheet
          ref={recurrenceSheetRef}
          recurrencePattern={form.recurrencePattern}
          recurrenceDaysOfWeek={form.recurrenceDaysOfWeek}
          onPatternChange={v => updateField('recurrencePattern', v)}
          onDaysChange={v => updateField('recurrenceDaysOfWeek', v)}
        />

        <PriorityPickerSheet
          ref={prioritySheetRef}
          importance={form.importance}
          urgency={form.urgency}
          isReluctantMustDo={form.isReluctantMustDo}
          onImportanceChange={v => updateField('importance', v)}
          onUrgencyChange={v => updateField('urgency', v)}
          onReluctantChange={v => updateField('isReluctantMustDo', v)}
        />

        <IconPickerSheet
          ref={iconSheetRef}
          selectedIcon={form.icon}
          onIconChange={v => updateField('icon', v)}
        />

        <AlarmPickerSheet
          ref={alarmSheetRef}
          alarmOffsetMinutes={form.alarmOffsetMinutes}
          onAlarmChange={v => updateField('alarmOffsetMinutes', v)}
        />
      </>
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
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
    paddingBottom: 40,
  },
  // Date summary (edit mode)
  dateSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 6,
  },
  dateSummaryText: {
    fontSize: 13,
    color: '#6B7280',
  },
  dateSummaryDot: {
    fontSize: 13,
    color: '#D1D5DB',
  },
  // Create: Title row
  titleSection: {
    marginTop: 16,
    paddingHorizontal: 20,
  },
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
  titleInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
    paddingVertical: 10,
    marginLeft: 4,
  },
  // Edit: Hero title
  heroSection: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    paddingVertical: 4,
  },
  // Description
  descSection: {
    paddingHorizontal: 20,
  },
  descInput: {
    fontSize: 14,
    color: '#6B7280',
    paddingVertical: 6,
    textAlignVertical: 'top',
  },
  // Toolbar border
  toolbarBorder: {
    height: 1,
    backgroundColor: '#F3F4F6',
  },
  // Completion toggle
  completionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  completionLabel: {
    fontSize: 15,
    color: '#4B5563',
    fontWeight: '500',
  },
});
