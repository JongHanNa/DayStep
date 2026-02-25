/**
 * SchedulePanel
 * 통합 일정 패널 — BottomSheetModal로 독립 시트
 * 캘린더 + 설정 행 (시간/알림/반복) + 인라인 팝오버
 * TodoCreatePanel 위에 별도 시트로 열림 → create UI를 완전히 덮음
 */
import React, {useCallback, useMemo, useState, useRef, forwardRef, useImperativeHandle} from 'react';
import {View, Text, StyleSheet, Pressable} from 'react-native';
import {BottomSheetModal, BottomSheetBackdrop, BottomSheetView} from '@gorhom/bottom-sheet';
import {AnimatedPressable, Popover} from '@/components/core';
import {useTheme} from '@/theme';
import {useHaptic} from '@/hooks/useHaptic';
import {
  X,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Bell,
  Repeat,
} from 'lucide-react-native';
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addHours,
  addMonths,
  isSameDay,
  isSameMonth,
  isToday,
} from 'date-fns';
import {ko} from 'date-fns/locale';
import {ALARM_OPTIONS, getAlarmLabel} from '@/lib/notifications';
import type {FormData} from './useTodoForm';

// ============================================
// Types
// ============================================

export interface SchedulePanelRef {
  open: () => void;
  close: () => void;
}

interface SchedulePanelProps {
  form: FormData;
  updateField: <K extends keyof FormData>(field: K, value: FormData[K]) => void;
}

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
  return '없음';
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
  return '없음';
}

// ============================================
// Calendar Grid
// ============================================

function CalendarGrid({
  selectedDate,
  onSelectDate,
  primaryColor,
}: {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  primaryColor: string;
}) {
  const haptic = useHaptic();
  const [viewMonth, setViewMonth] = useState(() => {
    return startOfMonth(parseISO(selectedDate));
  });

  const weeks = useMemo(() => {
    const monthStart = startOfMonth(viewMonth);
    const monthEnd = endOfMonth(viewMonth);
    const calStart = startOfWeek(monthStart, {weekStartsOn: 0});
    const calEnd = endOfWeek(monthEnd, {weekStartsOn: 0});

    const result: Date[][] = [];
    let day = calStart;
    while (day <= calEnd) {
      const week: Date[] = [];
      for (let i = 0; i < 7; i++) {
        week.push(day);
        day = addDays(day, 1);
      }
      result.push(week);
    }
    return result;
  }, [viewMonth]);

  const selectedParsed = parseISO(selectedDate);

  return (
    <View>
      {/* Month nav */}
      <View style={calStyles.monthNav}>
        <AnimatedPressable
          onPress={() => {
            haptic.selection();
            setViewMonth(m => addMonths(m, -1));
          }}
          hapticType="selection"
          style={calStyles.navBtn}>
          <ChevronLeft size={18} color="#4B5563" />
        </AnimatedPressable>
        <Text style={calStyles.monthTitle}>
          {format(viewMonth, 'yyyy년 M월', {locale: ko})}
        </Text>
        <AnimatedPressable
          onPress={() => {
            haptic.selection();
            setViewMonth(m => addMonths(m, 1));
          }}
          hapticType="selection"
          style={calStyles.navBtn}>
          <ChevronRight size={18} color="#4B5563" />
        </AnimatedPressable>
      </View>

      {/* Weekday headers */}
      <View style={calStyles.weekdayRow}>
        {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => (
          <Text
            key={d}
            style={[
              calStyles.weekdayText,
              i === 0 && {color: '#EF4444'},
              i === 6 && {color: '#3B82F6'},
            ]}>
            {d}
          </Text>
        ))}
      </View>

      {/* Day grid */}
      {weeks.map((week, wi) => (
        <View key={wi} style={calStyles.weekRow}>
          {week.map((day, di) => {
            const inMonth = isSameMonth(day, viewMonth);
            const selected = isSameDay(day, selectedParsed);
            const today = isToday(day);
            const dateStr = format(day, 'yyyy-MM-dd');

            return (
              <Pressable
                key={di}
                onPress={() => {
                  haptic.selection();
                  onSelectDate(dateStr);
                }}
                style={[
                  calStyles.dayCell,
                  selected && {backgroundColor: primaryColor},
                  today && !selected && calStyles.todayCell,
                ]}>
                <Text
                  style={[
                    calStyles.dayText,
                    !inMonth && {color: '#D1D5DB'},
                    di === 0 && inMonth && {color: '#EF4444'},
                    di === 6 && inMonth && {color: '#3B82F6'},
                    selected && {color: '#FFFFFF', fontWeight: '700'},
                  ]}>
                  {format(day, 'd')}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const calStyles = StyleSheet.create({
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  navBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  weekdayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '500',
    color: '#9CA3AF',
  },
  weekRow: {
    flexDirection: 'row',
  },
  dayCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: 20,
  },
  todayCell: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  dayText: {
    fontSize: 14,
    color: '#374151',
  },
});

// ============================================
// TimePopoverContent
// ============================================

function TimePopoverContent({
  form,
  updateField,
  primaryColor,
}: {
  form: FormData;
  updateField: <K extends keyof FormData>(field: K, value: FormData[K]) => void;
  primaryColor: string;
}) {
  const haptic = useHaptic();
  const DURATIONS = [5, 10, 15, 20, 30, 45, 60, 90, 120];

  const handleTypeChange = useCallback(
    (type: 'anytime' | 'timed' | 'all_day') => {
      haptic.selection();
      updateField('scheduleType', type);
      if (type === 'timed' && !form.startTime) {
        const now = new Date();
        const nextHour = new Date(now);
        nextHour.setMinutes(0, 0, 0);
        nextHour.setHours(now.getHours() + 1);
        updateField('startTime', nextHour);
        updateField('endTime', addHours(nextHour, 1));
      }
    },
    [haptic, updateField, form.startTime],
  );

  return (
    <View style={popContentStyles.container}>
      {/* Schedule type chips */}
      <View style={popContentStyles.chipRow}>
        {(['anytime', 'timed', 'all_day'] as const).map(type => (
          <AnimatedPressable
            key={type}
            onPress={() => handleTypeChange(type)}
            haptic={false}
            style={[
              popContentStyles.chip,
              form.scheduleType === type && {backgroundColor: primaryColor},
            ]}>
            <Text
              style={[
                popContentStyles.chipText,
                form.scheduleType === type && {color: '#FFFFFF'},
              ]}>
              {type === 'anytime' ? '시간 미정' : type === 'timed' ? '시간 지정' : '종일'}
            </Text>
          </AnimatedPressable>
        ))}
      </View>

      {/* Timed: time display with +/- */}
      {form.scheduleType === 'timed' && form.startTime && (
        <View style={popContentStyles.timeRow}>
          <AnimatedPressable
            onPress={() => {
              haptic.selection();
              updateField('startTime', addHours(form.startTime!, -1));
              if (form.endTime) updateField('endTime', addHours(form.endTime, -1));
            }}
            hapticType="selection"
            style={popContentStyles.timeBtn}>
            <Text style={popContentStyles.timeBtnText}>−</Text>
          </AnimatedPressable>
          <View style={popContentStyles.timeDisplay}>
            <Text style={popContentStyles.timeText}>
              {format(form.startTime, 'HH:mm')}
            </Text>
            {form.endTime && (
              <Text style={popContentStyles.timeSep}>
                {' ~ '}{format(form.endTime, 'HH:mm')}
              </Text>
            )}
          </View>
          <AnimatedPressable
            onPress={() => {
              haptic.selection();
              updateField('startTime', addHours(form.startTime!, 1));
              if (form.endTime) updateField('endTime', addHours(form.endTime, 1));
            }}
            hapticType="selection"
            style={popContentStyles.timeBtn}>
            <Text style={popContentStyles.timeBtnText}>+</Text>
          </AnimatedPressable>
        </View>
      )}

      {/* Anytime: duration chips */}
      {form.scheduleType === 'anytime' && (
        <View style={popContentStyles.durationGrid}>
          {DURATIONS.map(d => (
            <AnimatedPressable
              key={d}
              onPress={() => {
                haptic.selection();
                updateField('anytimeDuration', form.anytimeDuration === d ? null : d);
              }}
              haptic={false}
              style={[
                popContentStyles.durationChip,
                form.anytimeDuration === d && {backgroundColor: primaryColor},
              ]}>
              <Text
                style={[
                  popContentStyles.chipText,
                  form.anytimeDuration === d && {color: '#FFFFFF'},
                ]}>
                {d >= 60 ? `${d / 60}시간` : `${d}분`}
              </Text>
            </AnimatedPressable>
          ))}
        </View>
      )}
    </View>
  );
}

// ============================================
// AlarmPopoverContent
// ============================================

function AlarmPopoverContent({
  alarmOffsetMinutes,
  onSelect,
  primaryColor,
}: {
  alarmOffsetMinutes: number | null;
  onSelect: (value: number | null) => void;
  primaryColor: string;
}) {
  const haptic = useHaptic();

  return (
    <View style={popContentStyles.listContainer}>
      {ALARM_OPTIONS.map(option => {
        const selected = option.value === alarmOffsetMinutes;
        return (
          <Pressable
            key={String(option.value)}
            onPress={() => {
              haptic.selection();
              onSelect(option.value);
            }}
            style={popContentStyles.listRow}>
            <Text
              style={[
                popContentStyles.listLabel,
                selected && {color: primaryColor, fontWeight: '600'},
              ]}>
              {option.label}
            </Text>
            {selected && <Check size={16} color={primaryColor} />}
          </Pressable>
        );
      })}
    </View>
  );
}

// ============================================
// RecurrencePopoverContent
// ============================================

function RecurrencePopoverContent({
  form,
  updateField,
  onClose,
  primaryColor,
}: {
  form: FormData;
  updateField: <K extends keyof FormData>(field: K, value: FormData[K]) => void;
  onClose: () => void;
  primaryColor: string;
}) {
  const haptic = useHaptic();
  const patterns = [
    {label: '없음', value: 'none'},
    {label: '매일', value: 'daily'},
    {label: '매주', value: 'weekly'},
    {label: '매월', value: 'monthly'},
  ] as const;

  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];

  const toggleDay = useCallback(
    (dayIndex: number) => {
      haptic.selection();
      const current = form.recurrenceDaysOfWeek;
      const next = current.includes(dayIndex)
        ? current.filter(d => d !== dayIndex)
        : [...current, dayIndex].sort();
      updateField('recurrenceDaysOfWeek', next);
    },
    [haptic, form.recurrenceDaysOfWeek, updateField],
  );

  return (
    <View style={popContentStyles.listContainer}>
      {patterns.map(p => {
        const selected = form.recurrencePattern === p.value;
        return (
          <Pressable
            key={p.value}
            onPress={() => {
              haptic.selection();
              updateField('recurrencePattern', p.value);
              // "매주" 외 패턴 선택 시 즉시 닫힘
              if (p.value !== 'weekly') {
                onClose();
              }
            }}
            style={popContentStyles.listRow}>
            <Text
              style={[
                popContentStyles.listLabel,
                selected && {color: primaryColor, fontWeight: '600'},
              ]}>
              {p.label}
            </Text>
            {selected && <Check size={16} color={primaryColor} />}
          </Pressable>
        );
      })}

      {/* "매주" 선택 시 요일 토글 */}
      {form.recurrencePattern === 'weekly' && (
        <View style={popContentStyles.dayToggleRow}>
          {dayNames.map((name, i) => {
            const active = form.recurrenceDaysOfWeek.includes(i);
            return (
              <Pressable
                key={i}
                onPress={() => toggleDay(i)}
                style={[
                  popContentStyles.dayToggle,
                  active && {backgroundColor: primaryColor},
                ]}>
                <Text
                  style={[
                    popContentStyles.dayToggleText,
                    active && {color: '#FFFFFF'},
                  ]}>
                  {name}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

const popContentStyles = StyleSheet.create({
  // Time popover
  container: {
    padding: 12,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#4B5563',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  timeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4B5563',
  },
  timeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  timeSep: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  durationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  durationChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
  },
  // List popovers (alarm, recurrence)
  listContainer: {
    paddingVertical: 4,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  listLabel: {
    fontSize: 14,
    color: '#374151',
  },
  // Recurrence day toggles
  dayToggleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#F3F4F6',
  },
  dayToggle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayToggleText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },
});

// ============================================
// SettingRow
// ============================================

function SettingRow({
  icon: IconComponent,
  label,
  value,
  onPress,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.settingRow}>
      <View style={styles.settingLeft}>
        <IconComponent size={16} color="#6B7280" />
        <Text style={styles.settingLabel}>{label}</Text>
      </View>
      <View style={styles.settingRight}>
        <Text style={styles.settingValue}>{value}</Text>
        <ChevronRight size={14} color="#9CA3AF" />
      </View>
    </Pressable>
  );
}

// ============================================
// Component — BottomSheetModal 래핑
// ============================================

export const SchedulePanel = forwardRef<SchedulePanelRef, SchedulePanelProps>(
  function SchedulePanel({form, updateField}, ref) {
    const bottomSheetRef = useRef<BottomSheetModal>(null);
    const {primaryColor} = useTheme();
    const haptic = useHaptic();
    const snapPoints = useMemo(() => ['75%'], []);

    // 팝오버 state
    const [activePopover, setActivePopover] = useState<'none' | 'time' | 'alarm' | 'recurrence'>('none');
    const [popoverAnchor, setPopoverAnchor] = useState({x: 0, y: 0, width: 0, height: 0});

    // 각 행의 위치 측정용 refs
    const timeRowRef = useRef<View>(null);
    const alarmRowRef = useRef<View>(null);
    const recurrenceRowRef = useRef<View>(null);

    useImperativeHandle(ref, () => ({
      open: () => bottomSheetRef.current?.present(),
      close: () => bottomSheetRef.current?.dismiss(),
    }));

    const handleClose = useCallback(() => {
      bottomSheetRef.current?.dismiss();
    }, []);

    const handleConfirm = useCallback(() => {
      bottomSheetRef.current?.dismiss();
    }, []);

    const handleDateSelect = useCallback(
      (dateStr: string) => {
        updateField('scheduledDate', dateStr);
      },
      [updateField],
    );

    // 팝오버 열기/닫기
    const openPopover = useCallback(
      (type: 'time' | 'alarm' | 'recurrence', rowRef: React.RefObject<View | null>) => {
        haptic.selection();
        rowRef.current?.measureInWindow((x, y, width, height) => {
          setPopoverAnchor({x, y, width, height});
          setActivePopover(type);
        });
      },
      [haptic],
    );

    const closePopover = useCallback(() => setActivePopover('none'), []);

    // 알림 선택 콜백
    const handleAlarmSelect = useCallback(
      (value: number | null) => {
        updateField('alarmOffsetMinutes', value);
        closePopover();
      },
      [updateField, closePopover],
    );

    const renderBackdrop = useCallback(
      (props: any) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={0.3}
        />
      ),
      [],
    );

    return (
      <BottomSheetModal
        ref={bottomSheetRef}
        snapPoints={snapPoints}
        enableDynamicSizing={false}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        handleComponent={null}
        backgroundStyle={sheetStyles.sheetBg}>
        <BottomSheetView style={sheetStyles.sheetContent}>
          {/* Header */}
          <View style={styles.tabHeader}>
            <AnimatedPressable onPress={handleClose} hapticType="light" style={styles.headerBtn}>
              <X size={20} color="#6B7280" />
            </AnimatedPressable>
            <Text style={styles.headerTitle}>날짜</Text>
            <AnimatedPressable onPress={handleConfirm} hapticType="light" style={styles.headerBtn}>
              <Check size={20} color={primaryColor} />
            </AnimatedPressable>
          </View>

          {/* Calendar */}
          <View style={styles.tabContent}>
            <CalendarGrid
              selectedDate={form.scheduledDate}
              onSelectDate={handleDateSelect}
              primaryColor={primaryColor}
            />
          </View>

          {/* Setting Rows */}
          <View style={styles.settingsSection}>
            <View ref={timeRowRef}>
              <SettingRow
                icon={Clock}
                label="시간"
                value={getTimeLabel(form)}
                onPress={() => openPopover('time', timeRowRef)}
              />
            </View>
            <View ref={alarmRowRef}>
              <SettingRow
                icon={Bell}
                label="알림"
                value={getAlarmLabel(form.alarmOffsetMinutes)}
                onPress={() => openPopover('alarm', alarmRowRef)}
              />
            </View>
            <View ref={recurrenceRowRef}>
              <SettingRow
                icon={Repeat}
                label="반복"
                value={getRecurrenceLabel(form)}
                onPress={() => openPopover('recurrence', recurrenceRowRef)}
              />
            </View>
          </View>

          {/* 팝오버들 — Modal이므로 BottomSheetModal 위에 렌더됨 */}
          <Popover
            visible={activePopover === 'time'}
            onClose={closePopover}
            anchorPosition={popoverAnchor}
            width={260}>
            <TimePopoverContent form={form} updateField={updateField} primaryColor={primaryColor} />
          </Popover>

          <Popover
            visible={activePopover === 'alarm'}
            onClose={closePopover}
            anchorPosition={popoverAnchor}
            width={200}>
            <AlarmPopoverContent
              alarmOffsetMinutes={form.alarmOffsetMinutes}
              onSelect={handleAlarmSelect}
              primaryColor={primaryColor}
            />
          </Popover>

          <Popover
            visible={activePopover === 'recurrence'}
            onClose={closePopover}
            anchorPosition={popoverAnchor}
            width={220}>
            <RecurrencePopoverContent
              form={form}
              updateField={updateField}
              onClose={closePopover}
              primaryColor={primaryColor}
            />
          </Popover>
        </BottomSheetView>
      </BottomSheetModal>
    );
  },
);

const sheetStyles = StyleSheet.create({
  sheetBg: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  sheetContent: {
    flex: 1,
  },
});

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
  // Header
  tabHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  // Tab content
  tabContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  // Settings
  settingsSection: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F3F4F6',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  settingLabel: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  settingValue: {
    fontSize: 13,
    color: '#9CA3AF',
  },
});
