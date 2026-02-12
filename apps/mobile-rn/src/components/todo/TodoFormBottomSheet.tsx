/**
 * TodoFormBottomSheet
 * 할일 생성/편집 바텀시트
 * - @gorhom/bottom-sheet 기반
 * - 요약 뷰 + 서브시트 패턴 (시간, 반복, 우선순위, 아이콘)
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
} from 'react-native';
import BottomSheet, {BottomSheetBackdrop, BottomSheetView} from '@gorhom/bottom-sheet';
import {AnimatedPressable} from '@/components/core';
import {SummaryRow} from './SummaryRow';
import {TimePickerSheet, type TimePickerSheetRef} from './sheets/TimePickerSheet';
import {RecurrencePickerSheet, type RecurrencePickerSheetRef} from './sheets/RecurrencePickerSheet';
import {PriorityPickerSheet, type PriorityPickerSheetRef} from './sheets/PriorityPickerSheet';
import {IconPickerSheet, type IconPickerSheetRef} from './sheets/IconPickerSheet';
import {useHaptic} from '@/hooks/useHaptic';
import {useTodoStore} from '@/stores/todoStore';
import {useTheme} from '@/theme';
import {format, addHours, parseISO} from 'date-fns';
import {ko} from 'date-fns/locale';
import type {Todo} from '@daystep/shared-core';
import {resolveTodoIcon} from '@/lib/iconMap';
import {
  ClipboardList,
  Calendar,
  Clock,
  Repeat,
  Flag,
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

function getPriorityLabel(form: FormData): string {
  if (form.importance && form.urgency) return '🔴 긴급 + 중요';
  if (form.importance) return '🟡 중요';
  if (form.urgency) return '🔵 긴급';
  return '⚪ 보통';
}

function getPriorityIconColor(form: FormData): string {
  if (form.importance && form.urgency) return '#EF4444';
  if (form.importance) return '#F59E0B';
  if (form.urgency) return '#3B82F6';
  return '#9CA3AF';
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

    const {createTodo, updateTodo, selectedDate} = useTodoStore();

    const [mode, setMode] = useState<'create' | 'edit'>('create');
    const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
    const [form, setForm] = useState<FormData>({...DEFAULT_FORM});
    const [saving, setSaving] = useState(false);

    const snapPoints = useMemo(() => ['55%', '75%'], []);

    // ------------------------------------------
    // Imperative handle
    // ------------------------------------------
    useImperativeHandle(ref, () => ({
      openCreate: (date?: string) => {
        const targetDate = date ?? selectedDate;
        setMode('create');
        setEditingTodo(null);
        setForm({...DEFAULT_FORM, scheduledDate: targetDate});
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
        // timed인데 endTime이 없으면 자동 설정 (startTime + 1시간)
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
                    returnKeyType="done"
                    autoFocus={mode === 'create'}
                  />
                </View>
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

                {/* 시간 행 → TimePickerSheet */}
                <SummaryRow
                  Icon={Clock}
                  iconColor="#F59E0B"
                  label={getTimeLabel(form)}
                  suffix={getTimeSuffix(form)}
                  onPress={() => {
                    haptic.selection();
                    timeSheetRef.current?.open();
                  }}
                />

                {/* 반복 행 → RecurrencePickerSheet */}
                <SummaryRow
                  Icon={Repeat}
                  iconColor="#8B5CF6"
                  label={getRecurrenceLabel(form)}
                  onPress={() => {
                    haptic.selection();
                    recurrenceSheetRef.current?.open();
                  }}
                />

                {/* 우선순위 행 → PriorityPickerSheet */}
                <SummaryRow
                  Icon={Flag}
                  iconColor={getPriorityIconColor(form)}
                  label={getPriorityLabel(form)}
                  onPress={() => {
                    haptic.selection();
                    prioritySheetRef.current?.open();
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
  titleInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
    paddingVertical: 10,
    marginLeft: 4,
  },
});
