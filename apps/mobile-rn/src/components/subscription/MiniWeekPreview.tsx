/**
 * MiniWeekPreview — 주 뷰 페이월용 미리보기
 * 상단 종일 라인(칩 2개) + 7컬럼 시간 그리드 + 카드 long-press → 다른 날로 이동
 */
import React, {useEffect} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import {hexWithOpacity} from '@/lib/todoUtils';
import {fixedColors} from '@/theme/colors';

interface MiniWeekPreviewProps {
  primaryColor: string;
}

const HOURS = ['09', '10', '11'];
const HOUR_HEIGHT = 22;
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const COLUMN_WIDTH = 22; // 근사값 — translate 이동량 계산용

export function MiniWeekPreview({primaryColor}: MiniWeekPreviewProps) {
  const cardShift = useSharedValue(0); // 0..3 컬럼만큼 이동
  const liftY = useSharedValue(0);
  const cardScale = useSharedValue(1);
  const cardOpacity = useSharedValue(1);

  useEffect(() => {
    cardScale.value = withRepeat(
      withSequence(
        withTiming(1, {duration: 1000}),
        withTiming(1.1, {duration: 300, easing: Easing.out(Easing.quad)}),
        withDelay(700, withTiming(1, {duration: 300})),
      ),
      -1,
      false,
    );
    liftY.value = withRepeat(
      withSequence(
        withTiming(0, {duration: 1000}),
        withTiming(-3, {duration: 300}),
        withDelay(700, withTiming(0, {duration: 300})),
      ),
      -1,
      false,
    );
    cardOpacity.value = withRepeat(
      withSequence(
        withTiming(1, {duration: 1000}),
        withTiming(0.85, {duration: 300}),
        withDelay(700, withTiming(1, {duration: 300})),
      ),
      -1,
      false,
    );
    // 화(2) → 금(5): +3 컬럼
    cardShift.value = withRepeat(
      withSequence(
        withTiming(0, {duration: 1300}),
        withTiming(3, {duration: 700, easing: Easing.inOut(Easing.cubic)}),
      ),
      -1,
      false,
    );
  }, [cardShift, liftY, cardScale, cardOpacity]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      {translateX: cardShift.value * COLUMN_WIDTH},
      {translateY: liftY.value},
      {scale: cardScale.value},
    ],
    opacity: cardOpacity.value,
  }));

  return (
    <View style={styles.container}>
      {/* 요일 헤더 */}
      <View style={styles.header}>
        <View style={styles.hoursPlaceholder} />
        {WEEKDAYS.map((d, i) => (
          <View key={d} style={styles.headerCell}>
            <Text
              style={[
                styles.headerText,
                i === 0 && {color: fixedColors.calendarSunday},
                i === 6 && {color: fixedColors.calendarSaturday},
                i === 3 && {color: primaryColor, fontWeight: '700'},
              ]}>
              {d}
            </Text>
          </View>
        ))}
      </View>

      {/* 종일 라인 — 노동, 주말 칩 */}
      <View style={styles.allDayLine}>
        <View style={styles.hoursPlaceholder} />
        <View style={styles.allDayContent}>
          <View
            style={[
              styles.allDayChip,
              {
                left: COLUMN_WIDTH * 1, // 월(1)부터
                width: COLUMN_WIDTH * 5, // 월~금 5일
                backgroundColor: hexWithOpacity(primaryColor, 0.2),
              },
            ]}>
            <Text style={[styles.allDayText, {color: primaryColor}]} numberOfLines={1}>
              노동
            </Text>
          </View>
          <View
            style={[
              styles.allDayChip,
              {
                top: 14,
                left: 0, // 일(0)
                width: COLUMN_WIDTH * 1,
                backgroundColor: hexWithOpacity(fixedColors.calendarSunday, 0.18),
              },
            ]}>
            <Text
              style={[
                styles.allDayText,
                {color: fixedColors.calendarSunday},
              ]}
              numberOfLines={1}>
              주말
            </Text>
          </View>
          <View
            style={[
              styles.allDayChip,
              {
                top: 14,
                left: COLUMN_WIDTH * 6, // 토(6)
                width: COLUMN_WIDTH * 1,
                backgroundColor: hexWithOpacity(fixedColors.calendarSaturday, 0.18),
              },
            ]}>
            <Text
              style={[
                styles.allDayText,
                {color: fixedColors.calendarSaturday},
              ]}
              numberOfLines={1}>
              주말
            </Text>
          </View>
        </View>
      </View>

      {/* 시간 그리드 */}
      <View style={styles.gridArea}>
        <View style={styles.hoursColumn}>
          {HOURS.map(h => (
            <View key={h} style={[styles.hourRow, {height: HOUR_HEIGHT}]}>
              <Text style={styles.hourLabel}>{h}</Text>
            </View>
          ))}
        </View>

        {WEEKDAYS.map((d, ci) => (
          <View key={d} style={styles.dayColumn}>
            {HOURS.map(h => (
              <View key={h} style={[styles.gridCell, {height: HOUR_HEIGHT}]} />
            ))}

            {/* 화요일(2)에 카드 — translateX로 금요일까지 이동 */}
            {ci === 2 && (
              <Animated.View
                style={[
                  styles.card,
                  {
                    top: HOUR_HEIGHT * 0.5,
                    height: HOUR_HEIGHT * 1.0,
                    backgroundColor: hexWithOpacity(primaryColor, 0.2),
                    borderColor: hexWithOpacity(primaryColor, 0.4),
                  },
                  cardStyle,
                ]}>
                <Text
                  style={[styles.cardTitle, {color: primaryColor}]}
                  numberOfLines={1}>
                  회의
                </Text>
              </Animated.View>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 6,
    paddingTop: 8,
  },
  header: {
    flexDirection: 'row',
    paddingBottom: 4,
  },
  hoursPlaceholder: {
    width: 18,
  },
  headerCell: {
    flex: 1,
    alignItems: 'center',
  },
  headerText: {
    fontSize: 8,
    color: '#6B7280',
    fontWeight: '500',
  },
  allDayLine: {
    flexDirection: 'row',
    height: 30,
    paddingVertical: 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  allDayContent: {
    flex: 1,
    position: 'relative',
  },
  allDayChip: {
    position: 'absolute',
    top: 1,
    height: 12,
    borderRadius: 3,
    paddingHorizontal: 3,
    justifyContent: 'center',
  },
  allDayText: {
    fontSize: 7,
    fontWeight: '600',
  },
  gridArea: {
    flex: 1,
    flexDirection: 'row',
    paddingTop: 2,
  },
  hoursColumn: {
    width: 18,
  },
  hourRow: {
    justifyContent: 'flex-start',
  },
  hourLabel: {
    fontSize: 8,
    color: '#9CA3AF',
    textAlign: 'right',
    paddingRight: 3,
    marginTop: -3,
  },
  dayColumn: {
    flex: 1,
    position: 'relative',
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: '#F3F4F6',
  },
  gridCell: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#F3F4F6',
  },
  card: {
    position: 'absolute',
    left: 1,
    right: 1,
    borderRadius: 4,
    borderWidth: 1,
    paddingHorizontal: 2,
    paddingVertical: 1,
  },
  cardTitle: {
    fontSize: 7,
    fontWeight: '600',
  },
});
