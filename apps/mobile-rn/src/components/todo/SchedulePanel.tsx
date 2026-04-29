/**
 * SchedulePanel
 * 통합 일정 패널 — BottomSheetModal로 독립 시트
 * 캘린더 + 설정 행 (시간/알림/반복) + 인라인 팝오버
 * TodoCreatePanel 위에 별도 시트로 열림 → create UI를 완전히 덮음
 */
import React, {useCallback, useMemo, useState, useRef, forwardRef, useImperativeHandle} from 'react';
import {View, Text, StyleSheet, Pressable, ScrollView} from 'react-native';
import {BottomSheetModal, BottomSheetBackdrop, BottomSheetView} from '@gorhom/bottom-sheet';
import {AnimatedPressable, Popover} from '@/components/core';
import {useTheme} from '@/theme';
import {fixedColors} from '@/theme/colors';
import {useHaptic} from '@/hooks/useHaptic';
import {InlineTimePicker} from '@/components/native/InlineTimePicker';
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
  startOfDay,
  addDays,
  addHours,
  addMonths,
  isSameDay,
  isSameMonth,
  isToday,
} from 'date-fns';
import {ko} from 'date-fns/locale';
import {ALARM_OPTIONS, getAlarmsLabel} from '@/lib/notifications';
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
  onDismiss?: () => void;
}

// ============================================
// Helpers
// ============================================

function getTimeLabel(form: FormData): string {
  if (form.scheduleType === 'timed' && form.startTime) {
    const start = format(form.startTime, 'HH:mm');
    if (!form.endTime) return start;
    if (isSameDay(form.startTime, form.endTime)) {
      return `${start} ~ ${format(form.endTime, 'HH:mm')}`;
    }
    return `${format(form.startTime, 'M/d HH:mm')} → ${format(form.endTime, 'M/d HH:mm')}`;
  }
  if (form.scheduleType === 'all_day') {
    if (
      form.startTime &&
      form.endTime &&
      !isSameDay(form.startTime, form.endTime)
    ) {
      return `${format(form.startTime, 'M/d')} ~ ${format(form.endTime, 'M/d')} 종일`;
    }
    return '종일';
  }
  if (form.scheduleType === 'anytime') {
    return form.anytimeDuration ? `언제든지 · ${form.anytimeDuration}분` : '언제든지';
  }
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
              i === 0 && {color: fixedColors.calendarSunday},
              i === 6 && {color: fixedColors.calendarSaturday},
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
                    di === 0 && inMonth && {color: fixedColors.calendarSunday},
                    di === 6 && inMonth && {color: fixedColors.calendarSaturday},
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

/**
 * 분 단위 시간을 일/시간/분으로 포맷
 * 1시간 → "1시간", 25시간 → "1일 1시간", 90분 → "1시간 30분"
 */
function getDurLabel(mins: number): string {
  if (mins <= 0) return '0분';
  const days = Math.floor(mins / (60 * 24));
  const rest = mins - days * 60 * 24;
  const hours = Math.floor(rest / 60);
  const m = rest % 60;
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}일`);
  if (hours > 0) parts.push(`${hours}시간`);
  if (m > 0) parts.push(`${m}분`);
  return parts.join(' ');
}

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
  const QUICK_END_DURATIONS = [15, 30, 60, 90, 120];

  // 시작/끝 탭 상태
  const [activeTab, setActiveTab] = useState<'start' | 'end'>('start');

  // 현재 소요 시간 (분)
  const durMins =
    form.startTime && form.endTime
      ? Math.round((form.endTime.getTime() - form.startTime.getTime()) / 60000)
      : 60;

  const isMultiDay =
    !!form.startTime &&
    !!form.endTime &&
    !isSameDay(form.startTime, form.endTime);

  const isInverted =
    !!form.startTime &&
    !!form.endTime &&
    form.endTime.getTime() < form.startTime.getTime();

  // 빠른 끝 시각 칩
  const setQuickEnd = useCallback(
    (mins: number) => {
      haptic.selection();
      if (!form.startTime) return;
      updateField('endTime', new Date(form.startTime.getTime() + mins * 60000));
    },
    [haptic, form.startTime, updateField],
  );

  const handleTypeChange = useCallback(
    (type: 'anytime' | 'timed' | 'all_day') => {
      haptic.selection();
      updateField('scheduleType', type);
      if (type === 'timed' && !form.startTime) {
        const now = new Date();
        const nextHour = new Date(now);
        nextHour.setMinutes(0, 0, 0);
        nextHour.setHours(now.getHours() + 1);
        // scheduledDate의 날짜로 맞춤
        const [y, m, d] = form.scheduledDate.split('-').map(Number);
        nextHour.setFullYear(y, m - 1, d);
        updateField('startTime', nextHour);
        updateField('endTime', addHours(nextHour, 1));
        return;
      }
      if (type === 'all_day') {
        // 시작·끝을 그 날 00:00으로 정규화. startTime이 없으면 scheduledDate에서 생성.
        let baseStart = form.startTime;
        if (!baseStart) {
          const [y, m, d] = form.scheduledDate.split('-').map(Number);
          baseStart = new Date(y, m - 1, d, 0, 0, 0, 0);
        }
        const normalizedStart = new Date(baseStart);
        normalizedStart.setHours(0, 0, 0, 0);

        // endTime이 있으면 dayDiff 보존하면서 00:00 정규화, 없으면 startTime과 같은 날
        const baseEnd = form.endTime ?? baseStart;
        const normalizedEnd = new Date(baseEnd);
        normalizedEnd.setHours(0, 0, 0, 0);

        updateField('startTime', normalizedStart);
        updateField('endTime', normalizedEnd);
        return;
      }
    },
    [haptic, updateField, form.startTime, form.endTime, form.scheduledDate],
  );

  // 시작 시각 변경 — 끝 시각이 시작 시각보다 빨라지면 동일한 dayDiff·시간차 보존
  const handleStartChange = useCallback(
    (date: Date) => {
      const prevStart = form.startTime;
      updateField('startTime', date);
      if (prevStart && form.endTime) {
        const dur = form.endTime.getTime() - prevStart.getTime();
        updateField('endTime', new Date(date.getTime() + dur));
      }
    },
    [form.startTime, form.endTime, updateField],
  );

  return (
    <ScrollView style={popContentStyles.container} showsVerticalScrollIndicator={false}>
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
              {type === 'anytime' ? '언제든지' : type === 'timed' ? '시간 지정' : '종일'}
            </Text>
          </AnimatedPressable>
        ))}
      </View>

      {/* Timed: 시작/끝 탭 + datetime 휠피커 */}
      {form.scheduleType === 'timed' && form.startTime && form.endTime && (
        <>
          {/* 시작/끝 세그먼트 */}
          <View style={popContentStyles.segmentRow}>
            {(['start', 'end'] as const).map(tab => (
              <Pressable
                key={tab}
                onPress={() => {
                  haptic.selection();
                  setActiveTab(tab);
                }}
                style={[
                  popContentStyles.segmentBtn,
                  activeTab === tab && {backgroundColor: primaryColor},
                ]}>
                <Text
                  style={[
                    popContentStyles.segmentText,
                    activeTab === tab && {color: '#FFFFFF', fontWeight: '700'},
                  ]}>
                  {tab === 'start' ? '시작' : '끝'}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* datetime 휠피커 — 활성 탭에 따라 시작/끝 편집 */}
          <InlineTimePicker
            mode="datetime"
            value={activeTab === 'start' ? form.startTime : form.endTime}
            onChange={(date) => {
              if (activeTab === 'start') {
                handleStartChange(date);
              } else {
                updateField('endTime', date);
              }
            }}
            height={180}
            style={popContentStyles.datetimePicker}
          />

          {/* 끝 탭에서만 빠른 끝 시각 칩 노출 */}
          {activeTab === 'end' && (
            <>
              <Text style={popContentStyles.sectionLabel}>시작 + N분</Text>
              <View style={popContentStyles.durChipRow}>
                {QUICK_END_DURATIONS.map(d => (
                  <AnimatedPressable
                    key={d}
                    onPress={() => setQuickEnd(d)}
                    haptic={false}
                    style={[
                      popContentStyles.durationChip,
                      !isMultiDay && durMins === d && {backgroundColor: primaryColor},
                    ]}>
                    <Text
                      style={[
                        popContentStyles.chipText,
                        !isMultiDay && durMins === d && {color: '#FFFFFF'},
                      ]}>
                      {d >= 60 ? `${d / 60}시간` : `${d}분`}
                    </Text>
                  </AnimatedPressable>
                ))}
              </View>
            </>
          )}

          {/* Preview bar — 다일이면 날짜+시간, 같은 날이면 시간만 */}
          <View
            style={[
              popContentStyles.previewBar,
              {
                borderColor: isInverted ? '#DC262633' : primaryColor + '33',
                backgroundColor: isInverted ? '#DC262614' : primaryColor + '14',
              },
            ]}>
            {isMultiDay ? (
              <Text
                style={[
                  popContentStyles.previewText,
                  {color: isInverted ? '#DC2626' : primaryColor},
                ]}>
                {format(form.startTime, 'M/d HH:mm')} → {format(form.endTime, 'M/d HH:mm')}
              </Text>
            ) : (
              <>
                <Text style={[popContentStyles.previewText, {color: primaryColor}]}>
                  {format(form.startTime, 'HH:mm')}
                </Text>
                <Text style={popContentStyles.previewSep}> ~ </Text>
                <Text style={[popContentStyles.previewText, {color: primaryColor}]}>
                  {format(form.endTime, 'HH:mm')}
                </Text>
              </>
            )}
            <Text
              style={[
                popContentStyles.previewDur,
                isInverted && {color: '#DC2626'},
              ]}>
              {' '}
              ({isInverted ? '시작이 끝보다 늦음' : getDurLabel(durMins)})
            </Text>
          </View>
        </>
      )}

      {/* All-day: 시작/끝 날짜 탭 + date 휠피커 */}
      {form.scheduleType === 'all_day' && form.startTime && form.endTime && (
        <>
          <View style={popContentStyles.segmentRow}>
            {(['start', 'end'] as const).map(tab => (
              <Pressable
                key={tab}
                onPress={() => {
                  haptic.selection();
                  setActiveTab(tab);
                }}
                style={[
                  popContentStyles.segmentBtn,
                  activeTab === tab && {backgroundColor: primaryColor},
                ]}>
                <Text
                  style={[
                    popContentStyles.segmentText,
                    activeTab === tab && {color: '#FFFFFF', fontWeight: '700'},
                  ]}>
                  {tab === 'start' ? '시작' : '끝'}
                </Text>
              </Pressable>
            ))}
          </View>

          <InlineTimePicker
            mode="date"
            value={activeTab === 'start' ? form.startTime : form.endTime}
            onChange={(date) => {
              const normalized = new Date(date);
              normalized.setHours(0, 0, 0, 0);
              if (activeTab === 'start') {
                // 시작일 변경 — 끝 날짜는 dayDiff 보존
                const prevStart = form.startTime!;
                updateField('startTime', normalized);
                if (form.endTime) {
                  const diff = form.endTime.getTime() - prevStart.getTime();
                  updateField('endTime', new Date(normalized.getTime() + diff));
                }
              } else {
                updateField('endTime', normalized);
              }
            }}
            height={180}
            style={popContentStyles.datetimePicker}
          />

          {/* 미리보기 바 — 다일이면 두 날짜 모두, 같은 날이면 하나만 */}
          <View
            style={[
              popContentStyles.previewBar,
              {
                borderColor: isInverted ? '#DC262633' : primaryColor + '33',
                backgroundColor: isInverted ? '#DC262614' : primaryColor + '14',
              },
            ]}>
            {isMultiDay ? (
              <Text
                style={[
                  popContentStyles.previewText,
                  {color: isInverted ? '#DC2626' : primaryColor},
                ]}>
                {format(form.startTime, 'M월 d일 (EEE)', {locale: ko})}
                {' → '}
                {format(form.endTime, 'M월 d일 (EEE)', {locale: ko})} 종일
              </Text>
            ) : (
              <Text style={[popContentStyles.previewText, {color: primaryColor}]}>
                {format(form.startTime, 'M월 d일 (EEE)', {locale: ko})} 종일
              </Text>
            )}
            {isInverted && (
              <Text style={[popContentStyles.previewDur, {color: '#DC2626'}]}>
                {' '}(시작이 끝보다 늦음)
              </Text>
            )}
          </View>
        </>
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
    </ScrollView>
  );
}

// ============================================
// AlarmPopoverContent
// ============================================

function AlarmPopoverContent({
  alarmOffsets,
  onToggle,
  primaryColor,
}: {
  alarmOffsets: number[];
  onToggle: (value: number | null) => void;
  primaryColor: string;
}) {
  const haptic = useHaptic();

  return (
    <View style={popContentStyles.listContainer}>
      {ALARM_OPTIONS.map(option => {
        const selected =
          option.value === null
            ? alarmOffsets.length === 0
            : alarmOffsets.includes(option.value);
        return (
          <Pressable
            key={String(option.value)}
            onPress={() => {
              haptic.selection();
              onToggle(option.value);
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
  // Timed time stepper
  sectionLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
    marginTop: 4,
  },
  // Start/End segment (datetime 휠피커 위)
  segmentRow: {
    flexDirection: 'row',
    alignSelf: 'center',
    gap: 4,
    backgroundColor: '#F3F4F6',
    borderRadius: 18,
    padding: 3,
    marginBottom: 8,
  },
  segmentBtn: {
    paddingHorizontal: 18,
    paddingVertical: 5,
    borderRadius: 15,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
  },
  datetimePicker: {
    alignSelf: 'center',
    width: '100%',
    marginBottom: 4,
  },
  durChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginBottom: 6,
  },
  previewBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginTop: 8,
  },
  previewText: {
    fontSize: 13,
    fontWeight: '700',
  },
  previewSep: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  previewDur: {
    fontSize: 11,
    color: '#9CA3AF',
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
  function SchedulePanel({form, updateField, onDismiss}, ref) {
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
        const oldStart = form.startTime;
        const oldEnd = form.endTime;
        updateField('scheduledDate', dateStr);
        if (!oldStart) return;

        // 시작↔끝 일수 차이 보존
        const dayMs = 86_400_000;
        const dayDiff = oldEnd
          ? Math.round(
              (startOfDay(oldEnd).getTime() - startOfDay(oldStart).getTime()) /
                dayMs,
            )
          : 0;

        const [y, m, d] = dateStr.split('-').map(Number);
        const newStart = new Date(oldStart);
        newStart.setFullYear(y, m - 1, d);
        updateField('startTime', newStart);

        if (oldEnd) {
          const newEnd = new Date(oldEnd);
          newEnd.setFullYear(y, m - 1, d + dayDiff);
          updateField('endTime', newEnd);
        }
      },
      [updateField, form.startTime, form.endTime],
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

    // 알림 토글 콜백 (다중 선택)
    const handleAlarmToggle = useCallback(
      (value: number | null) => {
        if (value === null) {
          // '없음' 선택 시 전체 초기화 + 팝오버 닫기
          updateField('alarmOffsets', []);
          closePopover();
        } else {
          const cur = form.alarmOffsets;
          const next = cur.includes(value)
            ? cur.filter(o => o !== value)
            : [...cur, value].sort((a, b) => b - a);
          updateField('alarmOffsets', next);
          // 팝오버 유지 (다중 선택)
        }
      },
      [updateField, closePopover, form.alarmOffsets],
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
        backgroundStyle={sheetStyles.sheetBg}
        onDismiss={onDismiss}>
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
                value={getAlarmsLabel(form.alarmOffsets)}
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
            width={320}>
            <TimePopoverContent form={form} updateField={updateField} primaryColor={primaryColor} />
          </Popover>

          <Popover
            visible={activePopover === 'alarm'}
            onClose={closePopover}
            anchorPosition={popoverAnchor}
            width={200}>
            <AlarmPopoverContent
              alarmOffsets={form.alarmOffsets}
              onToggle={handleAlarmToggle}
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
