/**
 * MiniCalendarPreview — 폰 목업 안에 들어갈 미니 캘린더
 * 자동 순환 애니메이션으로 날짜 선택 + 상세 행 확장 시뮬레이션
 */
import React, {useEffect, useState, useRef} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

// 3월 2026 하드코딩 (일요일 시작)
const WEEKS = [
  [0, 0, 0, 0, 0, 0, 1],
  [2, 3, 4, 5, 6, 7, 8],
  [9, 10, 11, 12, 13, 14, 15],
  [16, 17, 18, 19, 20, 21, 22],
  [23, 24, 25, 26, 27, 28, 29],
  [30, 31, 0, 0, 0, 0, 0],
];

// 일정 시뮬레이션 도트
const EVENT_DOTS: Record<number, string[]> = {
  3: ['#EF4444'],
  7: ['#3B82F6', '#F59E0B'],
  12: ['#EF4444'],
  15: ['#3B82F6'],
  19: ['#F59E0B', '#EF4444'],
  22: ['#3B82F6'],
  25: ['#EF4444', '#3B82F6', '#F59E0B'],
  28: ['#3B82F6'],
};

// 상세 행에 표시할 할 일 목록
const SAMPLE_TODOS: Record<number, {color: string; title: string}[]> = {
  3: [{color: '#EF4444', title: '팀 미팅 준비'}],
  7: [
    {color: '#3B82F6', title: '프로젝트 리뷰'},
    {color: '#F59E0B', title: '운동하기'},
  ],
  12: [{color: '#EF4444', title: '보고서 작성'}],
  15: [{color: '#3B82F6', title: '디자인 검토'}],
  19: [
    {color: '#F59E0B', title: '운동하기'},
    {color: '#EF4444', title: '팀 미팅 준비'},
  ],
  22: [{color: '#3B82F6', title: '프로젝트 리뷰'}],
  25: [
    {color: '#EF4444', title: '보고서 작성'},
    {color: '#3B82F6', title: '디자인 검토'},
    {color: '#F59E0B', title: '운동하기'},
  ],
  28: [{color: '#3B82F6', title: '코드 리뷰'}],
};

const EVENT_DAYS = Object.keys(SAMPLE_TODOS).map(Number);

const TODAY = 19;

/** 날짜가 속한 주(week) 인덱스 반환 */
function getWeekIndex(day: number): number {
  return WEEKS.findIndex(week => week.includes(day));
}

interface MiniCalendarPreviewProps {
  primaryColor?: string;
}

export function MiniCalendarPreview({
  primaryColor = '#6366F1',
}: MiniCalendarPreviewProps) {
  const [activeDay, setActiveDay] = useState<number | null>(null);
  const [activeWeekIndex, setActiveWeekIndex] = useState<number>(-1);
  const cycleIndexRef = useRef(0);

  const detailHeight = useSharedValue(0);
  const detailOpacity = useSharedValue(0);

  const detailAnimStyle = useAnimatedStyle(() => ({
    height: detailHeight.value,
    opacity: detailOpacity.value,
    overflow: 'hidden' as const,
  }));

  useEffect(() => {
    const timingConfig = {easing: Easing.out(Easing.cubic)};

    function applyNewDay(day: number) {
      setActiveDay(day);
      setActiveWeekIndex(getWeekIndex(day));
    }

    function runCycle() {
      const day = EVENT_DAYS[cycleIndexRef.current];
      const isFirst = activeDay === null;

      if (isFirst) {
        // 첫 진입: 바로 펼치기
        applyNewDay(day);
        detailHeight.value = withDelay(
          100,
          withTiming(28, {duration: 300, ...timingConfig}),
        );
        detailOpacity.value = withDelay(
          100,
          withTiming(1, {duration: 300, ...timingConfig}),
        );
      } else {
        // 접기 → state 업데이트 → 펼치기
        detailHeight.value = withTiming(0, {duration: 200, ...timingConfig});
        detailOpacity.value = withTiming(0, {
          duration: 200,
          ...timingConfig,
        });

        // 접힌 후 state 업데이트 + 펼치기
        setTimeout(() => {
          applyNewDay(day);
          detailHeight.value = withDelay(
            100,
            withTiming(28, {duration: 300, ...timingConfig}),
          );
          detailOpacity.value = withDelay(
            100,
            withTiming(1, {duration: 300, ...timingConfig}),
          );
        }, 300);
      }

      cycleIndexRef.current =
        (cycleIndexRef.current + 1) % EVENT_DAYS.length;
    }

    // 초기 딜레이 후 첫 번째 실행
    const initTimer = setTimeout(runCycle, 800);

    // 이후 2.5초 간격 순환
    const interval = setInterval(runCycle, 2500);

    return () => {
      clearTimeout(initTimer);
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeTodos = activeDay ? SAMPLE_TODOS[activeDay] ?? [] : [];

  return (
    <View style={styles.container}>
      {/* 월 헤더 */}
      <Text style={styles.monthHeader}>3월</Text>

      {/* 요일 헤더 */}
      <View style={styles.weekdayRow}>
        {WEEKDAYS.map((day, i) => (
          <View key={i} style={styles.cell}>
            <Text style={[styles.weekdayText, i === 0 && styles.sundayText]}>
              {day}
            </Text>
          </View>
        ))}
      </View>

      {/* 날짜 그리드 */}
      {WEEKS.map((week, wi) => (
        <React.Fragment key={wi}>
          <View style={styles.weekRow}>
            {week.map((day, di) => {
              const isToday = day === TODAY;
              const isSelected = day === activeDay && day > 0;
              const dots = day > 0 ? EVENT_DOTS[day] : undefined;
              return (
                <View key={di} style={styles.cell}>
                  {day > 0 ? (
                    <>
                      <View
                        style={[
                          styles.dayCircle,
                          isToday && {backgroundColor: primaryColor},
                          isSelected &&
                            !isToday && {
                              backgroundColor: `${primaryColor}20`,
                              borderWidth: 1.5,
                              borderColor: primaryColor,
                            },
                        ]}>
                        <Text
                          style={[
                            styles.dayText,
                            di === 0 && styles.sundayText,
                            isToday && styles.todayText,
                          ]}>
                          {day}
                        </Text>
                      </View>
                      {dots && (
                        <View style={styles.dotsRow}>
                          {dots.map((color, ci) => (
                            <View
                              key={ci}
                              style={[styles.dot, {backgroundColor: color}]}
                            />
                          ))}
                        </View>
                      )}
                    </>
                  ) : null}
                </View>
              );
            })}
          </View>

          {/* 선택된 주에만 상세 행 렌더링 */}
          {wi === activeWeekIndex && (
            <Animated.View style={[styles.detailRow, detailAnimStyle]}>
              {activeTodos.map((item, idx) => (
                <View key={idx} style={styles.todoItem}>
                  <View
                    style={[styles.todoBar, {backgroundColor: item.color}]}
                  />
                  <Text style={styles.todoTitle}>{item.title}</Text>
                </View>
              ))}
            </Animated.View>
          )}
        </React.Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 8,
    backgroundColor: '#FFFFFF',
  },
  monthHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 6,
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  weekRow: {
    flexDirection: 'row',
  },
  cell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 2,
  },
  weekdayText: {
    fontSize: 9,
    fontWeight: '500',
    color: '#9CA3AF',
  },
  sundayText: {
    color: '#EF4444',
  },
  dayCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    fontSize: 10,
    fontWeight: '400',
    color: '#374151',
  },
  todayText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 1,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    gap: 8,
  },
  todoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  todoBar: {
    width: 2.5,
    height: 10,
    borderRadius: 1,
  },
  todoTitle: {
    fontSize: 8,
    color: '#374151',
  },
});
