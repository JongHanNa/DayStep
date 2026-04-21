/**
 * JSFocusGardenView — JS 기반 집중 정원 뷰 (Android + iOS 폴백)
 * 청소 정원의 JSCleaningGardenView 구조를 단순화:
 *   - tab 개념 제거 → primaryColor 단일 팔레트
 *   - outcome: 'completed' | 'abandoned' (skipped 없음)
 */
import React, {useMemo, useState, useCallback} from 'react';
import {View, Text, StyleSheet, Pressable} from 'react-native';
import Animated, {FadeIn} from 'react-native-reanimated';
import {ChevronLeft, ChevronRight} from 'lucide-react-native';
import {IsometricFocusGardenCanvas} from './IsometricFocusGardenCanvas';
import {
  format,
  addDays,
  addWeeks,
  addMonths,
  addYears,
  startOfWeek,
  endOfMonth,
  startOfMonth,
  isSameDay,
} from 'date-fns';
import {ko} from 'date-fns/locale';
import type {FocusTreeInfo, FocusGardenPayload, FocusGardenViewMode} from '@/stores/pomodoroStore';

interface JSFocusGardenViewProps {
  gardenDataJson: string;
  viewMode: FocusGardenViewMode;
  primaryColor: string;
  screenWidth: number;
  onViewModeChange?: (mode: FocusGardenViewMode) => void;
}

const VIEW_MODE_LABELS: {key: FocusGardenViewMode; label: string}[] = [
  {key: 'day', label: '일'},
  {key: 'week', label: '주'},
  {key: 'month', label: '월'},
  {key: 'year', label: '년'},
];

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

export function JSFocusGardenView({
  gardenDataJson,
  viewMode,
  primaryColor,
  screenWidth,
  onViewModeChange,
}: JSFocusGardenViewProps) {
  const [offset, setOffset] = useState(0);

  const parsedDays = useMemo(() => {
    try {
      const payload: FocusGardenPayload = JSON.parse(gardenDataJson);
      const map: Record<string, FocusTreeInfo[]> = {};
      for (const day of payload.days) {
        map[day.date] = day.trees;
      }
      return map;
    } catch {
      return {};
    }
  }, [gardenDataJson]);

  const handleViewModeChange = useCallback((mode: FocusGardenViewMode) => {
    setOffset(0);
    onViewModeChange?.(mode);
  }, [onViewModeChange]);

  const currentDates = useMemo(() => {
    const today = new Date();
    switch (viewMode) {
      case 'day': {
        const date = addDays(today, offset);
        return [format(date, 'yyyy-MM-dd')];
      }
      case 'week': {
        const weekDate = addWeeks(today, offset);
        const sunday = startOfWeek(weekDate, {weekStartsOn: 0});
        return Array.from({length: 7}, (_, i) =>
          format(addDays(sunday, i), 'yyyy-MM-dd'),
        );
      }
      case 'month': {
        const monthDate = addMonths(today, offset);
        const start = startOfMonth(monthDate);
        const end = endOfMonth(monthDate);
        const dates: string[] = [];
        let d = start;
        while (d <= end) {
          dates.push(format(d, 'yyyy-MM-dd'));
          d = addDays(d, 1);
        }
        return dates;
      }
      case 'year': {
        const yearDate = addYears(today, offset);
        const year = yearDate.getFullYear();
        const dates: string[] = [];
        for (let month = 0; month < 12; month++) {
          const start = new Date(year, month, 1);
          const end = endOfMonth(start);
          let d = start;
          while (d <= end) {
            dates.push(format(d, 'yyyy-MM-dd'));
            d = addDays(d, 1);
          }
        }
        return dates;
      }
    }
  }, [viewMode, offset]);

  const trees = useMemo(() => {
    const all = currentDates.flatMap(date => parsedDays[date] ?? []);
    if (all.length <= 25) return all;
    return [...all].sort((a, b) => b.durationSeconds - a.durationSeconds).slice(0, 25);
  }, [currentDates, parsedDays]);

  const completedCount = useMemo(
    () => trees.filter(t => t.outcome === 'completed').length,
    [trees],
  );

  const headerLabel = useMemo(() => {
    const today = new Date();
    switch (viewMode) {
      case 'day': {
        const date = addDays(today, offset);
        const label = format(date, 'yyyy년 M월 d일', {locale: ko});
        return offset === 0 ? `${label} (오늘)` : label;
      }
      case 'week': {
        const weekDate = addWeeks(today, offset);
        const sunday = startOfWeek(weekDate, {weekStartsOn: 0});
        const saturday = addDays(sunday, 6);
        return `${format(sunday, 'M월 d일', {locale: ko})}~${format(saturday, 'M월 d일', {locale: ko})}`;
      }
      case 'month': {
        const monthDate = addMonths(today, offset);
        return format(monthDate, 'yyyy년 M월', {locale: ko});
      }
      case 'year': {
        const yearDate = addYears(today, offset);
        return format(yearDate, 'yyyy년', {locale: ko});
      }
    }
  }, [viewMode, offset]);

  const completedPrefix = useMemo(() => {
    if (offset !== 0) return '';
    switch (viewMode) {
      case 'day': return '오늘';
      case 'week': return '이번 주';
      case 'month': return '이번 달';
      case 'year': return '올해';
    }
  }, [viewMode, offset]);

  const navigateBack = useCallback(() => {
    setOffset(o => o - 1);
  }, []);

  const navigateForward = useCallback(() => {
    setOffset(o => (o >= 0 ? o : o + 1));
  }, []);

  // ─── 서브 뷰 ───

  const renderWeekView = () => {
    const today = new Date();
    const weekDate = addWeeks(today, offset);
    const sunday = startOfWeek(weekDate, {weekStartsOn: 0});

    return (
      <View style={s.weekContainer}>
        {Array.from({length: 7}, (_, i) => {
          const date = addDays(sunday, i);
          const dateStr = format(date, 'yyyy-MM-dd');
          const dayTrees = parsedDays[dateStr] ?? [];
          const isToday = isSameDay(date, today);
          const completed = dayTrees.filter(t => t.outcome === 'completed').length;

          return (
            <View key={i} style={s.weekDay}>
              <Text style={[s.weekDayLabel, isToday && {color: primaryColor, fontWeight: '700'}]}>
                {DAY_LABELS[i]}
              </Text>
              <View style={[
                s.weekDateCircle,
                isToday && {backgroundColor: primaryColor},
              ]}>
                <Text style={[s.weekDateText, isToday && {color: '#FFFFFF'}]}>
                  {date.getDate()}
                </Text>
              </View>
              <View style={s.weekTreeDots}>
                {dayTrees.slice(0, 3).map((t, ti) => (
                  <View
                    key={ti}
                    style={[
                      s.weekTreeDot,
                      {backgroundColor: t.outcome === 'abandoned' ? '#9CA3AF' : primaryColor},
                    ]}
                  />
                ))}
                {dayTrees.length > 3 && (
                  <Text style={s.weekMoreText}>+{dayTrees.length - 3}</Text>
                )}
              </View>
              {completed > 0 && (
                <Text style={[s.weekCount, {color: primaryColor}]}>{completed}</Text>
              )}
            </View>
          );
        })}
      </View>
    );
  };

  const renderMonthView = () => {
    const today = new Date();
    const monthDate = addMonths(today, offset);
    const firstDay = startOfMonth(monthDate);
    const lastDay = endOfMonth(monthDate);
    const startDayOfWeek = firstDay.getDay();

    const cells: (Date | null)[] = [];
    for (let i = 0; i < startDayOfWeek; i++) cells.push(null);
    let d = firstDay;
    while (d <= lastDay) {
      cells.push(new Date(d));
      d = addDays(d, 1);
    }

    const weeks: (Date | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) {
      weeks.push(cells.slice(i, i + 7));
    }

    return (
      <View style={s.monthContainer}>
        <View style={s.monthWeekRow}>
          {DAY_LABELS.map(label => (
            <View key={label} style={s.monthCell}>
              <Text style={s.monthDayHeader}>{label}</Text>
            </View>
          ))}
        </View>
        {weeks.map((week, wi) => (
          <View key={wi} style={s.monthWeekRow}>
            {Array.from({length: 7}, (_, ci) => {
              const cell = week[ci] ?? null;
              if (!cell) return <View key={ci} style={s.monthCell} />;

              const dateStr = format(cell, 'yyyy-MM-dd');
              const dayTrees = parsedDays[dateStr] ?? [];
              const isToday = isSameDay(cell, today);
              const hasCompleted = dayTrees.some(t => t.outcome === 'completed');

              return (
                <View key={ci} style={s.monthCell}>
                  <View style={[
                    s.monthDateWrap,
                    isToday && {backgroundColor: primaryColor, borderRadius: 12},
                  ]}>
                    <Text style={[
                      s.monthDateText,
                      isToday && {color: '#FFFFFF', fontWeight: '700'},
                    ]}>
                      {cell.getDate()}
                    </Text>
                  </View>
                  {dayTrees.length > 0 && (
                    <View style={[
                      s.monthDot,
                      {backgroundColor: hasCompleted ? primaryColor : '#D1D5DB'},
                    ]} />
                  )}
                  {dayTrees.length > 1 && (
                    <Text style={s.monthCountBadge}>{dayTrees.length}</Text>
                  )}
                </View>
              );
            })}
          </View>
        ))}
      </View>
    );
  };

  const renderYearView = () => {
    const today = new Date();
    const yearDate = addYears(today, offset);
    const year = yearDate.getFullYear();
    const todayStr = format(today, 'yyyy-MM-dd');

    return (
      <View style={s.yearContainer}>
        {Array.from({length: 12}, (_, monthIdx) => {
          const firstDay = new Date(year, monthIdx, 1);
          const lastDay = endOfMonth(firstDay);
          const startDow = firstDay.getDay();
          const totalDays = lastDay.getDate();

          const heatCells: string[] = [];
          for (let i = 0; i < startDow; i++) heatCells.push('empty');
          for (let dd = 1; dd <= totalDays; dd++) {
            const dateStr = `${year}-${String(monthIdx + 1).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
            if (dateStr === todayStr) {
              heatCells.push('today');
            } else {
              const dayTrees = parsedDays[dateStr] ?? [];
              if (dayTrees.length === 0) {
                heatCells.push('empty');
              } else if (dayTrees.some(t => t.outcome === 'completed')) {
                heatCells.push('healthy');
              } else {
                heatCells.push('wilted');
              }
            }
          }

          const rows: string[][] = [];
          for (let i = 0; i < heatCells.length; i += 7) {
            rows.push(heatCells.slice(i, i + 7));
          }

          return (
            <View key={monthIdx} style={s.yearMonth}>
              <Text style={s.yearMonthLabel}>{monthIdx + 1}월</Text>
              <View style={s.yearGrid}>
                {rows.map((row, ri) => (
                  <View key={ri} style={s.yearRow}>
                    {Array.from({length: 7}, (_, ci) => {
                      const status = row[ci] ?? 'empty';
                      return (
                        <View
                          key={ci}
                          style={[
                            s.yearCell,
                            {backgroundColor: getHeatColor(status, primaryColor)},
                          ]}
                        />
                      );
                    })}
                  </View>
                ))}
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <Animated.View entering={FadeIn.duration(300)} style={s.root}>
      <View style={s.segmentRow}>
        {VIEW_MODE_LABELS.map(tab => {
          const isActive = viewMode === tab.key;
          return (
            <Pressable
              key={tab.key}
              onPress={() => handleViewModeChange(tab.key)}
              style={[
                s.segmentTab,
                isActive && {backgroundColor: primaryColor + '20'},
              ]}>
              <Text style={[
                s.segmentText,
                isActive && {color: primaryColor, fontWeight: '700'},
              ]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={s.headerRow}>
        <Pressable onPress={navigateBack} style={s.navButton} hitSlop={12}>
          <ChevronLeft size={18} color="#6B7280" />
        </Pressable>
        <Text style={s.headerLabel}>{headerLabel}</Text>
        {offset < 0 ? (
          <Pressable onPress={navigateForward} style={s.navButton} hitSlop={12}>
            <ChevronRight size={18} color="#6B7280" />
          </Pressable>
        ) : (
          <View style={s.navButton}>
            <ChevronRight size={18} color="transparent" />
          </View>
        )}
      </View>

      {viewMode === 'day' && (
        <IsometricFocusGardenCanvas
          trees={trees}
          width={screenWidth - 32}
          primaryColor={primaryColor}
        />
      )}
      {viewMode === 'week' && renderWeekView()}
      {viewMode === 'month' && renderMonthView()}
      {viewMode === 'year' && renderYearView()}

      <View style={s.completedRow}>
        {completedCount > 0 ? (
          <Text style={[s.completedText, {color: primaryColor}]}>
            {completedPrefix ? `${completedPrefix} ` : ''}{completedCount}개 집중 완료
          </Text>
        ) : (
          <Text style={s.emptyText}>집중한 세션이 없습니다</Text>
        )}
      </View>
    </Animated.View>
  );
}

function getHeatColor(status: string, primaryColor: string): string {
  switch (status) {
    case 'today': return primaryColor;
    case 'healthy': return primaryColor;
    case 'wilted': return '#D1D5DB';
    default: return '#F3F4F6';
  }
}

const s = StyleSheet.create({
  root: {
    paddingHorizontal: 16,
  },
  segmentRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
    marginBottom: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    padding: 3,
  },
  segmentTab: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: 'center',
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  navButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1F2937',
    paddingHorizontal: 8,
  },
  completedRow: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  completedText: {
    fontSize: 15,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
  },

  weekContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  weekDay: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  weekDayLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  weekDateCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekDateText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  weekTreeDots: {
    flexDirection: 'row',
    gap: 2,
    height: 14,
    alignItems: 'center',
  },
  weekTreeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  weekMoreText: {
    fontSize: 8,
    color: '#9CA3AF',
  },
  weekCount: {
    fontSize: 12,
    fontWeight: '600',
  },

  monthContainer: {
    paddingVertical: 8,
  },
  monthWeekRow: {
    flexDirection: 'row',
  },
  monthCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
    minHeight: 36,
  },
  monthDayHeader: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  monthDateWrap: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthDateText: {
    fontSize: 13,
    color: '#374151',
  },
  monthDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginTop: 2,
  },
  monthCountBadge: {
    fontSize: 8,
    color: '#9CA3AF',
    marginTop: 1,
  },

  yearContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  yearMonth: {
    width: '23%',
    marginBottom: 12,
    alignItems: 'center',
  },
  yearMonthLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  yearGrid: {
    gap: 1,
  },
  yearRow: {
    flexDirection: 'row',
    gap: 1,
  },
  yearCell: {
    width: 6,
    height: 6,
    borderRadius: 1,
  },
});
