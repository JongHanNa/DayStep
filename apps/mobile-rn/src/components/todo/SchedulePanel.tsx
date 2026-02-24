/**
 * SchedulePanel
 * 통합 일정 패널 — BottomSheetModal로 독립 시트
 * 캘린더 + 지속시간 탭 + 설정 행 (시간/알림/반복)
 * TodoCreatePanel 위에 별도 시트로 열림 → create UI를 완전히 덮음
 */
import React, {useCallback, useMemo, useState, useRef, forwardRef, useImperativeHandle} from 'react';
import {View, Text, StyleSheet, Pressable} from 'react-native';
import {BottomSheetModal, BottomSheetBackdrop, BottomSheetView} from '@gorhom/bottom-sheet';
import {AnimatedPressable} from '@/components/core';
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
import {getAlarmLabel} from '@/lib/notifications';
import type {FormData} from './useTodoForm';

// ============================================
// Types
// ============================================

export interface SchedulePanelRef {
  open: () => void;
  close: () => void;
}

type TabType = 'date' | 'duration';

interface SchedulePanelProps {
  form: FormData;
  updateField: <K extends keyof FormData>(field: K, value: FormData[K]) => void;
  onTimePress: () => void;
  onAlarmPress: () => void;
  onRecurrencePress: () => void;
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
// Component — BottomSheetModal 래핑
// ============================================

export const SchedulePanel = forwardRef<SchedulePanelRef, SchedulePanelProps>(
  function SchedulePanel(
    {form, updateField, onTimePress, onAlarmPress, onRecurrencePress},
    ref,
  ) {
    const bottomSheetRef = useRef<BottomSheetModal>(null);
    const {primaryColor} = useTheme();
    const haptic = useHaptic();
    const [activeTab, setActiveTab] = useState<TabType>('date');
    const snapPoints = useMemo(() => ['75%'], []);

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
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        handleComponent={null}
        backgroundStyle={sheetStyles.sheetBg}>
        <BottomSheetView style={sheetStyles.sheetContent}>
          {/* Tab Header */}
          <View style={styles.tabHeader}>
            <AnimatedPressable onPress={handleClose} hapticType="light" style={styles.headerBtn}>
              <X size={20} color="#6B7280" />
            </AnimatedPressable>

            <View style={styles.tabGroup}>
              <Pressable
                onPress={() => {
                  haptic.selection();
                  setActiveTab('date');
                }}
                style={[
                  styles.tab,
                  activeTab === 'date' && {borderBottomColor: primaryColor},
                ]}>
                <Text
                  style={[
                    styles.tabText,
                    activeTab === 'date' && {color: primaryColor, fontWeight: '700'},
                  ]}>
                  날짜
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  haptic.selection();
                  setActiveTab('duration');
                }}
                style={[
                  styles.tab,
                  activeTab === 'duration' && {borderBottomColor: primaryColor},
                ]}>
                <Text
                  style={[
                    styles.tabText,
                    activeTab === 'duration' && {color: primaryColor, fontWeight: '700'},
                  ]}>
                  지속 시간
                </Text>
              </Pressable>
            </View>

            <AnimatedPressable onPress={handleConfirm} hapticType="light" style={styles.headerBtn}>
              <Check size={20} color={primaryColor} />
            </AnimatedPressable>
          </View>

          {/* Tab Content */}
          <View style={styles.tabContent}>
            {activeTab === 'date' ? (
              <CalendarGrid
                selectedDate={form.scheduledDate}
                onSelectDate={handleDateSelect}
                primaryColor={primaryColor}
              />
            ) : (
              <DurationTab
                form={form}
                updateField={updateField}
                primaryColor={primaryColor}
              />
            )}
          </View>

          {/* Setting Rows */}
          <View style={styles.settingsSection}>
            <SettingRow
              icon={Clock}
              label="시간"
              value={getTimeLabel(form)}
              onPress={onTimePress}
            />
            <SettingRow
              icon={Bell}
              label="알림"
              value={getAlarmLabel(form.alarmOffsetMinutes)}
              onPress={onAlarmPress}
            />
            <SettingRow
              icon={Repeat}
              label="반복"
              value={getRecurrenceLabel(form)}
              onPress={onRecurrencePress}
            />
          </View>
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
// DurationTab — 스케줄타입 칩 + 시간/소요시간 인라인
// ============================================

function DurationTab({
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
    <View>
      {/* Schedule type chips */}
      <View style={durationStyles.chipRow}>
        {(['anytime', 'timed', 'all_day'] as const).map(type => (
          <AnimatedPressable
            key={type}
            onPress={() => handleTypeChange(type)}
            haptic={false}
            style={[
              durationStyles.chip,
              form.scheduleType === type && {backgroundColor: primaryColor},
            ]}>
            <Text
              style={[
                durationStyles.chipText,
                form.scheduleType === type && {color: '#FFFFFF'},
              ]}>
              {type === 'anytime' ? '시간 미정' : type === 'timed' ? '시간 지정' : '종일'}
            </Text>
          </AnimatedPressable>
        ))}
      </View>

      {/* Timed: time display */}
      {form.scheduleType === 'timed' && form.startTime && (
        <View style={durationStyles.timeRow}>
          <AnimatedPressable
            onPress={() => {
              haptic.selection();
                            updateField('startTime', addHours(form.startTime!, -1));
              if (form.endTime) updateField('endTime', addHours(form.endTime, -1));
            }}
            hapticType="selection"
            style={durationStyles.timeBtn}>
            <Text style={durationStyles.timeBtnText}>-</Text>
          </AnimatedPressable>
          <View style={durationStyles.timeDisplay}>
            <Text style={durationStyles.timeText}>
              {format(form.startTime, 'HH:mm')}
            </Text>
            {form.endTime && (
              <Text style={durationStyles.timeSep}>
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
            style={durationStyles.timeBtn}>
            <Text style={durationStyles.timeBtnText}>+</Text>
          </AnimatedPressable>
        </View>
      )}

      {/* Anytime: duration chips */}
      {form.scheduleType === 'anytime' && (
        <View style={durationStyles.durationGrid}>
          {DURATIONS.map(d => (
            <AnimatedPressable
              key={d}
              onPress={() => {
                haptic.selection();
                updateField('anytimeDuration', form.anytimeDuration === d ? null : d);
              }}
              haptic={false}
              style={[
                durationStyles.durationChip,
                form.anytimeDuration === d && {backgroundColor: primaryColor},
              ]}>
              <Text
                style={[
                  durationStyles.chipText,
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

const durationStyles = StyleSheet.create({
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
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
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  timeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeBtnText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4B5563',
  },
  timeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
  },
  timeSep: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  durationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  durationChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
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
// Styles
// ============================================

const styles = StyleSheet.create({
  // Tab header
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
  tabGroup: {
    flexDirection: 'row',
    gap: 16,
  },
  tab: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#9CA3AF',
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
