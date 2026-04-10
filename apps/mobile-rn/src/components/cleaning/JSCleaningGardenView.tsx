/**
 * JSCleaningGardenView — Android용 JS 기반 청소 정원 뷰
 * iOS SwiftUI NativeCleaningGarden과 동일한 기능:
 * - 5×5 아이소메트릭 정원 (Skia Canvas)
 * - 날짜 네비게이션 (< > 버튼)
 * - 뷰모드 전환 (일/주/월/년) — 세그먼트 탭
 * - 완료 수 텍스트
 */
import React, {useMemo, useState, useCallback} from 'react';
import {View, Text, StyleSheet, Pressable} from 'react-native';
import Animated, {FadeIn} from 'react-native-reanimated';
import {ChevronLeft, ChevronRight} from 'lucide-react-native';
import {IsometricGardenCanvas} from './IsometricGardenCanvas';
import {
  format,
  addDays,
  addWeeks,
  addMonths,
  addYears,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  isSameDay,
} from 'date-fns';
import {ko} from 'date-fns/locale';
import type {CleaningTreeInfo, CleaningGardenPayload} from '@/stores/cleaningStore';

type ViewMode = 'day' | 'week' | 'month' | 'year';

interface JSCleaningGardenViewProps {
  gardenDataJson: string;
  viewMode: ViewMode;
  primaryColor: string;
  screenWidth: number;
  onViewModeChange?: (mode: ViewMode) => void;
  onMonthChange?: (year: number, month: number) => void;
}

const VIEW_MODE_LABELS: {key: ViewMode; label: string}[] = [
  {key: 'day', label: '일'},
  {key: 'week', label: '주'},
  {key: 'month', label: '월'},
  {key: 'year', label: '년'},
];

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

export function JSCleaningGardenView({
  gardenDataJson,
  viewMode,
  primaryColor,
  screenWidth,
  onViewModeChange,
  onMonthChange,
}: JSCleaningGardenViewProps) {
  const [offset, setOffset] = useState(0);

  // 파싱된 정원 데이터
  const parsedDays = useMemo(() => {
    try {
      const payload: CleaningGardenPayload = JSON.parse(gardenDataJson);
      const map: Record<string, CleaningTreeInfo[]> = {};
      for (const day of payload.days) {
        map[day.date] = day.trees;
      }
      return map;
    } catch {
      return {};
    }
  }, [gardenDataJson]);

  // 뷰모드 변경 시 offset 리셋
  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setOffset(0);
    onViewModeChange?.(mode);
  }, [onViewModeChange]);

  // 현재 기간의 날짜 목록
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

  // 현재 기간의 트리들 (최대 25개)
  const trees = useMemo(() => {
    const all = currentDates.flatMap(date => parsedDays[date] ?? []);
    if (all.length <= 25) return all;
    return [...all].sort((a, b) => b.durationSeconds - a.durationSeconds).slice(0, 25);
  }, [currentDates, parsedDays]);

  // 완료 수
  const completedCount = useMemo(
    () => trees.filter(t => t.outcome === 'completed').length,
    [trees],
  );

  // 헤더 라벨
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

  // 완료 수 프리픽스
  const completedPrefix = useMemo(() => {
    if (offset !== 0) return '';
    switch (viewMode) {
      case 'day': return '오늘';
      case 'week': return '이번 주';
      case 'month': return '이번 달';
      case 'year': return '올해';
    }
  }, [viewMode, offset]);

  // 네비게이션
  const navigateBack = useCallback(() => {
    const newOffset = offset - 1;
    setOffset(newOffset);
    // fetch 트리거
    const today = new Date();
    switch (viewMode) {
      case 'day': {
        const date = addDays(today, newOffset);
        onMonthChange?.(date.getFullYear(), date.getMonth() + 1);
        break;
      }
      case 'week': {
        const date = addWeeks(today, newOffset);
        onMonthChange?.(date.getFullYear(), date.getMonth() + 1);
        break;
      }
      case 'month': {
        const date = addMonths(today, newOffset);
        onMonthChange?.(date.getFullYear(), date.getMonth() + 1);
        break;
      }
      case 'year': {
        const date = addYears(today, newOffset);
        onMonthChange?.(date.getFullYear(), 0);
        break;
      }
    }
  }, [offset, viewMode, onMonthChange]);

  const navigateForward = useCallback(() => {
    if (offset >= 0) return;
    const newOffset = offset + 1;
    setOffset(newOffset);
    const today = new Date();
    switch (viewMode) {
      case 'day': {
        const date = addDays(today, newOffset);
        onMonthChange?.(date.getFullYear(), date.getMonth() + 1);
        break;
      }
      case 'week': {
        const date = addWeeks(today, newOffset);
        onMonthChange?.(date.getFullYear(), date.getMonth() + 1);
        break;
      }
      case 'month': {
        const date = addMonths(today, newOffset);
        onMonthChange?.(date.getFullYear(), date.getMonth() + 1);
        break;
      }
      case 'year': {
        const date = addYears(today, newOffset);
        onMonthChange?.(date.getFullYear(), 0);
        break;
      }
    }
  }, [offset, viewMode, onMonthChange]);

  // ─── 주/월/년 뷰 서브 렌더링 ───

  const renderWeekView = () => {
    const today = new Date();
    const weekDate = addWeeks(today, offset);
    const sunday = startOfWeek(weekDate, {weekStartsOn: 0});

    return (
      <View style={s.weekContainer}>
        {Array.from({length: 7}, (_, i) => {
          const date = addDays(sunday, i);
          const dateStr = format(date, 'yyyy-MM-dd');
          const dayTrees = (parsedDays[dateStr] ?? []).filter(t => t.outcome !== 'skipped');
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
              {/* 나무 미니 미리보기 (최대 3개 점) */}
              <View style={s.weekTreeDots}>
                {dayTrees.slice(0, 3).map((t, ti) => (
                  <View
                    key={ti}
                    style={[
                      s.weekTreeDot,
                      {backgroundColor: getTreeDotColor(t)},
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
    const startDayOfWeek = firstDay.getDay(); // 0=일요일

    const cells: (Date | null)[] = [];
    // 첫 주 빈 칸
    for (let i = 0; i < startDayOfWeek; i++) cells.push(null);
    // 날짜들
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
        {/* 요일 헤더 */}
        <View style={s.monthWeekRow}>
          {DAY_LABELS.map(label => (
            <View key={label} style={s.monthCell}>
              <Text style={s.monthDayHeader}>{label}</Text>
            </View>
          ))}
        </View>
        {/* 날짜 그리드 */}
        {weeks.map((week, wi) => (
          <View key={wi} style={s.monthWeekRow}>
            {Array.from({length: 7}, (_, ci) => {
              const cell = week[ci] ?? null;
              if (!cell) return <View key={ci} style={s.monthCell} />;

              const dateStr = format(cell, 'yyyy-MM-dd');
              const dayTrees = (parsedDays[dateStr] ?? []).filter(t => t.outcome !== 'skipped');
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
                      {backgroundColor: hasCompleted ? '#D97706' : '#D1D5DB'},
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

          // 미니 히트맵 (7열)
          const heatCells: string[] = [];
          for (let i = 0; i < startDow; i++) heatCells.push('empty');
          for (let d = 1; d <= totalDays; d++) {
            const dateStr = `${year}-${String(monthIdx + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
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
      {/* 뷰모드 세그먼트 탭 */}
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

      {/* 날짜 헤더 + 네비게이션 */}
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

      {/* 뷰 본문 */}
      {viewMode === 'day' && (
        <IsometricGardenCanvas trees={trees} width={screenWidth - 32} />
      )}
      {viewMode === 'week' && renderWeekView()}
      {viewMode === 'month' && renderMonthView()}
      {viewMode === 'year' && renderYearView()}

      {/* 완료 수 텍스트 */}
      <View style={s.completedRow}>
        {completedCount > 0 ? (
          <Text style={[s.completedText, {color: primaryColor}]}>
            {completedPrefix ? `${completedPrefix} ` : ''}{completedCount}개 완료
          </Text>
        ) : (
          <Text style={s.emptyText}>완료한 태스크가 없습니다</Text>
        )}
      </View>
    </Animated.View>
  );
}

// ─── 헬퍼 ───

function getTreeDotColor(tree: CleaningTreeInfo): string {
  if (tree.outcome === 'abandoned') return '#9CA3AF';
  switch (tree.tab) {
    case 'digital': return '#3B82F6';
    case 'belongings': return '#8B5CF6';
    default: return '#22C55E';
  }
}

function getHeatColor(status: string, primaryColor: string): string {
  switch (status) {
    case 'today': return primaryColor;
    case 'healthy': return '#D97706';
    case 'wilted': return '#D1D5DB';
    default: return '#F3F4F6';
  }
}

// ─── 스타일 ───

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

  // 주 뷰
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

  // 월 뷰
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

  // 년 뷰
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
