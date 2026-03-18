/**
 * MiniCalendarPreview — 폰 목업 안에 들어갈 정적 미니 캘린더
 * 순수 View 렌더링, 스토어 연결 없음
 */
import React from 'react';
import {View, Text, StyleSheet} from 'react-native';

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

const TODAY = 19;

interface MiniCalendarPreviewProps {
  primaryColor?: string;
}

export function MiniCalendarPreview({primaryColor = '#6366F1'}: MiniCalendarPreviewProps) {
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
        <View key={wi} style={styles.weekRow}>
          {week.map((day, di) => {
            const isToday = day === TODAY;
            const dots = day > 0 ? EVENT_DOTS[day] : undefined;
            return (
              <View key={di} style={styles.cell}>
                {day > 0 ? (
                  <>
                    <View
                      style={[
                        styles.dayCircle,
                        isToday && {backgroundColor: primaryColor},
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
});
