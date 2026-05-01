/**
 * SleepRecordScreen — 수면 기록 비주얼 캘린더
 * 월간 캘린더 + 요약 통계 + 일자 상세 + 추세 차트
 */
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {View, Text, ScrollView, StyleSheet, Pressable} from 'react-native';
import Animated, {FadeInDown} from 'react-native-reanimated';
import {ScreenContainer, AnimatedPressable, AnimatedCard} from '@/components/core';
import {
  SleepInputBottomSheet,
  type SleepInputBottomSheetRef,
} from '@/components/sleep/SleepInputBottomSheet';
import {useSleepStore} from '@/stores/sleepStore';
import type {SleepMood, SleepRecordInput, SleepRecord} from '@/stores/sleepStore';
import {useTheme} from '@/theme';
import {useHaptic} from '@/hooks/useHaptic';
import {ChevronLeft, ChevronRight, Moon, Sun, Clock, Percent, Plus, Pill, Leaf} from 'lucide-react-native';
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  getDay,
  eachDayOfInterval,
  isToday,
  isSameMonth,
} from 'date-fns';
import {ko} from 'date-fns/locale';

// ============================================
// 상수
// ============================================

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

const MOOD_CONFIG: Record<SleepMood, {emoji: string; color: string; bg: string; label: string}> = {
  great: {emoji: '😴', color: '#059669', bg: '#D1FAE5', label: '좋음'},
  good: {emoji: '🙂', color: '#2563EB', bg: '#DBEAFE', label: '보통'},
  fair: {emoji: '😐', color: '#D97706', bg: '#FEF3C7', label: '부족'},
  poor: {emoji: '😫', color: '#DC2626', bg: '#FEE2E2', label: '나쁨'},
};

const QUALITY_COLORS: Record<string, string> = {
  great: '#D1FAE5',
  good: '#DBEAFE',
  fair: '#FEF3C7',
  poor: '#FEE2E2',
  none: 'transparent',
};

// ============================================
// Helper
// ============================================

function getDurationQuality(minutes: number): SleepMood {
  if (minutes >= 420) return 'great'; // 7h+
  if (minutes >= 360) return 'good'; // 6h+
  if (minutes >= 300) return 'fair'; // 5h+
  return 'poor';
}

function formatHour(hour: number): string {
  const h = Math.floor(hour);
  const m = Math.round((hour - h) * 60);
  const period = h < 12 ? '오전' : '오후';
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return m > 0 ? `${period} ${displayH}:${String(m).padStart(2, '0')}` : `${period} ${displayH}시`;
}

// ============================================
// Screen
// ============================================

export default function SleepRecordScreen() {
  const {primaryColor} = useTheme();
  const haptic = useHaptic();
  const sheetRef = useRef<SleepInputBottomSheetRef>(null);

  const {
    records,
    selectedDate,
    isLoading,
    fetchMonthRecords,
    insertRecord,
    setSelectedDate,
  } = useSleepStore();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth() + 1;

  useEffect(() => {
    fetchMonthRecords(year, month);
  }, [year, month, fetchMonthRecords]);

  const getMonthStats = useSleepStore(s => s.getMonthStats);
  const stats = useMemo(() => getMonthStats(year, month), [getMonthStats, year, month, records]);
  // 다중 세션: 첫 번째 completed 세션 또는 마지막 세션 표시
  const selectedRecords = records[selectedDate] ?? [];
  const selectedRecord = selectedRecords.find(r => r.session_outcome === 'completed') ?? selectedRecords[selectedRecords.length - 1] ?? null;

  // 월 네비게이션
  const goToPrevMonth = useCallback(() => {
    haptic.selection();
    setCurrentMonth(prev => subMonths(prev, 1));
  }, [haptic]);

  const goToNextMonth = useCallback(() => {
    haptic.selection();
    setCurrentMonth(prev => addMonths(prev, 1));
  }, [haptic]);

  // 캘린더 날짜 배열
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const days = eachDayOfInterval({start: monthStart, end: monthEnd});
    const startPadding = getDay(monthStart); // 0(일) ~ 6(토)
    const paddedDays: (Date | null)[] = Array(startPadding).fill(null);
    return [...paddedDays, ...days];
  }, [currentMonth]);

  // 추세 데이터 (일별 수면시간)
  const trendData = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const days = eachDayOfInterval({start: monthStart, end: monthEnd});
    return days.map(d => {
      const key = format(d, 'yyyy-MM-dd');
      const sessions = records[key] ?? [];
      // completed 세션들의 총 수면 시간
      const totalMinutes = sessions
        .filter(r => r.session_outcome === 'completed')
        .reduce((sum, r) => sum + r.duration_minutes, 0);
      return {
        day: d.getDate(),
        minutes: totalMinutes,
        date: key,
      };
    });
  }, [currentMonth, records]);

  const maxMinutes = useMemo(
    () => Math.max(...trendData.map(d => d.minutes), 480),
    [trendData],
  );

  const handleDatePress = useCallback(
    (date: Date) => {
      haptic.selection();
      const dateStr = format(date, 'yyyy-MM-dd');
      setSelectedDate(dateStr);
    },
    [haptic, setSelectedDate],
  );

  const handleFABPress = useCallback(() => {
    haptic.medium();
    sheetRef.current?.openCreate(selectedDate);
  }, [haptic, selectedDate]);

  const handleEditPress = useCallback(() => {
    if (selectedRecord) {
      haptic.medium();
      sheetRef.current?.openEdit(selectedRecord);
    }
  }, [haptic, selectedRecord]);

  const handleSubmit = useCallback(
    async (input: SleepRecordInput) => {
      await insertRecord(input);
    },
    [insertRecord],
  );

  return (
    <ScreenContainer gradient="warmBackground">
      <ScrollView
        contentContainerStyle={{paddingBottom: 120}}
        showsVerticalScrollIndicator={false}>
        {/* 월 네비게이터 */}
        <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.monthNav}>
          <AnimatedPressable onPress={goToPrevMonth} scaleValue={0.9} haptic={false}>
            <ChevronLeft size={22} color="#6B7280" />
          </AnimatedPressable>
          <Text style={styles.monthText}>
            {format(currentMonth, 'yyyy년 M월', {locale: ko})}
          </Text>
          <AnimatedPressable onPress={goToNextMonth} scaleValue={0.9} haptic={false}>
            <ChevronRight size={22} color="#6B7280" />
          </AnimatedPressable>
        </Animated.View>

        {/* 요약 4칸 */}
        <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.statsRow}>
          <View style={styles.statCard}>
            <Clock size={16} color={primaryColor} />
            <Text style={styles.statValue}>
              {stats.avgDuration > 0
                ? `${Math.floor(stats.avgDuration / 60)}h ${stats.avgDuration % 60}m`
                : '-'}
            </Text>
            <Text style={styles.statLabel}>평균 수면</Text>
          </View>
          <View style={styles.statCard}>
            <Moon size={16} color="#6366F1" />
            <Text style={styles.statValue}>
              {stats.recordedDays > 0 ? formatHour(stats.avgSleepHour) : '-'}
            </Text>
            <Text style={styles.statLabel}>평균 취침</Text>
          </View>
          <View style={styles.statCard}>
            <Sun size={16} color="#F59E0B" />
            <Text style={styles.statValue}>
              {stats.recordedDays > 0 ? formatHour(stats.avgWakeHour) : '-'}
            </Text>
            <Text style={styles.statLabel}>평균 기상</Text>
          </View>
          <View style={styles.statCard}>
            <Percent size={16} color="#10B981" />
            <Text style={styles.statValue}>
              {stats.totalDays > 0 ? `${Math.round(stats.recordRate * 100)}%` : '-'}
            </Text>
            <Text style={styles.statLabel}>기록률</Text>
          </View>
        </Animated.View>

        {/* 범례 */}
        <Animated.View entering={FadeInDown.delay(250).duration(400)} style={styles.legendRow}>
          {Object.entries(MOOD_CONFIG).map(([key, cfg]) => (
            <View key={key} style={styles.legendItem}>
              <View style={[styles.legendDot, {backgroundColor: cfg.bg}]} />
              <Text style={styles.legendText}>{cfg.label}</Text>
            </View>
          ))}
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, {backgroundColor: '#F3F4F6'}]} />
            <Text style={styles.legendText}>미기록</Text>
          </View>
        </Animated.View>

        {/* 캘린더 그리드 */}
        <Animated.View entering={FadeInDown.delay(300).duration(400)} style={styles.calendarWrap}>
          {/* 요일 헤더 */}
          <View style={styles.weekdayRow}>
            {WEEKDAYS.map((d, i) => (
              <Text
                key={d}
                style={[styles.weekdayText, i === 0 && {color: '#EF4444'}, i === 6 && {color: '#3B82F6'}]}>
                {d}
              </Text>
            ))}
          </View>
          {/* 날짜 그리드 */}
          <View style={styles.calendarGrid}>
            {calendarDays.map((date, i) => {
              if (!date) {
                return <View key={`pad-${i}`} style={styles.dayCell} />;
              }
              const dateStr = format(date, 'yyyy-MM-dd');
              const dateSessions = records[dateStr] ?? [];
              // 대표 세션: completed 우선, 없으면 마지막 세션
              const record = dateSessions.find(r => r.session_outcome === 'completed') ?? dateSessions[dateSessions.length - 1] ?? null;
              const quality = record
                ? record.mood ?? getDurationQuality(record.duration_minutes)
                : null;
              const bgColor = quality ? QUALITY_COLORS[quality] : '#F9FAFB';
              const isSelected = dateStr === selectedDate;
              const todayDate = isToday(date);

              return (
                <Pressable
                  key={dateStr}
                  onPress={() => handleDatePress(date)}
                  style={[
                    styles.dayCell,
                    {backgroundColor: bgColor},
                    isSelected && {borderColor: primaryColor, borderWidth: 2},
                    todayDate && !isSelected && {borderColor: primaryColor + '60', borderWidth: 1},
                  ]}>
                  <Text
                    style={[
                      styles.dayNumber,
                      todayDate && {color: primaryColor, fontWeight: '700'},
                    ]}>
                    {date.getDate()}
                  </Text>
                  {record?.mood && (
                    <Text style={styles.dayEmoji}>{MOOD_CONFIG[record.mood].emoji}</Text>
                  )}
                </Pressable>
              );
            })}
          </View>
        </Animated.View>

        {/* 선택 일자 상세 카드 */}
        <Animated.View entering={FadeInDown.delay(400).duration(400)} className="px-4 mt-4">
          <AnimatedCard enterDelay={0}>
            <Text style={styles.detailDate}>
              {format(new Date(selectedDate), 'M월 d일 (EEEE)', {locale: ko})}
            </Text>
            {selectedRecord ? (
              <Pressable onPress={handleEditPress}>
                {/* 수면 타임라인 바 */}
                <View style={styles.timelineBar}>
                  <View
                    style={[
                      styles.timelineFill,
                      {
                        backgroundColor: primaryColor + '30',
                        width: `${Math.min(100, (selectedRecord.duration_minutes / 600) * 100)}%`,
                      },
                    ]}
                  />
                </View>
                <View style={styles.detailRow}>
                  <View style={styles.detailItem}>
                    <Moon size={14} color="#6366F1" />
                    <Text style={styles.detailLabel}>취침</Text>
                    <Text style={styles.detailValue}>
                      {format(new Date(selectedRecord.sleep_time), 'a h:mm', {locale: ko})}
                    </Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Sun size={14} color="#F59E0B" />
                    <Text style={styles.detailLabel}>기상</Text>
                    <Text style={styles.detailValue}>
                      {format(new Date(selectedRecord.wake_time), 'a h:mm', {locale: ko})}
                    </Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Clock size={14} color={primaryColor} />
                    <Text style={styles.detailLabel}>수면</Text>
                    <Text style={styles.detailValue}>
                      {Math.floor(selectedRecord.duration_minutes / 60)}h{' '}
                      {selectedRecord.duration_minutes % 60}m
                    </Text>
                  </View>
                </View>
                {/* 태그 */}
                <View style={styles.tagRow}>
                  {selectedRecord.mood && (
                    <View style={[styles.tag, {backgroundColor: MOOD_CONFIG[selectedRecord.mood].bg}]}>
                      <Text style={{fontSize: 12}}>
                        {MOOD_CONFIG[selectedRecord.mood].emoji} {MOOD_CONFIG[selectedRecord.mood].label}
                      </Text>
                    </View>
                  )}
                  {selectedRecord.took_rx && (
                    <View style={[styles.tag, {backgroundColor: '#EDE9FE'}]}>
                      <Pill size={12} color="#7C3AED" />
                      <Text style={styles.tagText}>수면제</Text>
                    </View>
                  )}
                  {selectedRecord.took_supplement && (
                    <View style={[styles.tag, {backgroundColor: '#D1FAE5'}]}>
                      <Leaf size={12} color="#059669" />
                      <Text style={styles.tagText}>영양제</Text>
                    </View>
                  )}
                </View>
              </Pressable>
            ) : (
              <View style={styles.emptyDetail}>
                <Text style={styles.emptyText}>기록이 없습니다</Text>
                <AnimatedPressable
                  onPress={() => sheetRef.current?.openCreate(selectedDate)}
                  scaleValue={0.95}
                  haptic
                  style={[styles.addBtn, {backgroundColor: primaryColor + '15'}]}>
                  <Text style={[styles.addBtnText, {color: primaryColor}]}>+ 기록하기</Text>
                </AnimatedPressable>
              </View>
            )}
          </AnimatedCard>
        </Animated.View>

        {/* 추세 바 차트 */}
        <Animated.View entering={FadeInDown.delay(500).duration(400)} className="px-4 mt-4">
          <AnimatedCard enterDelay={100}>
            <Text style={styles.chartTitle}>이번 달 수면 추세</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.chartContainer}>
                {trendData.map(item => {
                  const height = item.minutes > 0 ? (item.minutes / maxMinutes) * 100 : 0;
                  const quality = item.minutes > 0 ? getDurationQuality(item.minutes) : 'none';
                  const barColor = quality !== 'none' ? MOOD_CONFIG[quality as SleepMood].color + '80' : '#E5E7EB';
                  return (
                    <Pressable
                      key={item.date}
                      onPress={() => {
                        haptic.selection();
                        setSelectedDate(item.date);
                      }}
                      style={styles.barWrap}>
                      <View style={styles.barTrack}>
                        <View
                          style={[styles.bar, {height: `${height}%`, backgroundColor: barColor}]}
                        />
                      </View>
                      <Text style={styles.barLabel}>{item.day}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          </AnimatedCard>
        </Animated.View>
      </ScrollView>

      {/* FAB */}
      <AnimatedPressable
        onPress={handleFABPress}
        scaleValue={0.9}
        haptic
        style={[styles.fab, {backgroundColor: primaryColor}]}>
        <Plus size={24} color="#FFFFFF" />
      </AnimatedPressable>

      {/* Bottom Sheet */}
      <SleepInputBottomSheet ref={sheetRef} onSubmit={handleSubmit} />
    </ScreenContainer>
  );
}

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    paddingVertical: 12,
  },
  monthText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1F2937',
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 12,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
  },
  statLabel: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 11,
    color: '#6B7280',
  },
  calendarWrap: {
    paddingHorizontal: 16,
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekdayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    marginBottom: 4,
  },
  dayNumber: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
  },
  dayEmoji: {
    fontSize: 10,
    marginTop: 1,
  },
  detailDate: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  timelineBar: {
    height: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 3,
    marginBottom: 12,
    overflow: 'hidden',
  },
  timelineFill: {
    height: '100%',
    borderRadius: 3,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  detailItem: {
    alignItems: 'center',
    gap: 4,
  },
  detailLabel: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  tagRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
  },
  emptyDetail: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 12,
  },
  addBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  addBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  chartTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 120,
    gap: 2,
    paddingRight: 16,
  },
  barWrap: {
    alignItems: 'center',
    width: 18,
  },
  barTrack: {
    width: 10,
    height: 100,
    justifyContent: 'flex-end',
    borderRadius: 5,
    backgroundColor: '#F3F4F6',
    overflow: 'hidden',
  },
  bar: {
    width: '100%',
    borderRadius: 5,
  },
  barLabel: {
    fontSize: 9,
    color: '#9CA3AF',
    marginTop: 4,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 75,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
});
