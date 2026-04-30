/**
 * MiniThreeDayPreview — 3일 뷰 페이월용 미리보기
 * 3컬럼 시간 그리드 + 카드 long-press → 다른 컬럼으로 드래그 이동 애니메이션
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

interface MiniThreeDayPreviewProps {
  primaryColor: string;
}

const HOURS = ['09', '10', '11', '12'];
const HOUR_HEIGHT = 26;
const COLUMNS = ['수 29', '목 30', '금 1'];

export function MiniThreeDayPreview({primaryColor}: MiniThreeDayPreviewProps) {
  // 카드는 첫 컬럼(0) → 두 번째(1) → 세 번째(2) → 다시 0
  const colShift = useSharedValue(0); // 0..2
  const liftY = useSharedValue(0); // long-press 시 살짝 들어올림
  const cardScale = useSharedValue(1);
  const cardOpacity = useSharedValue(1);

  useEffect(() => {
    // 사이클: 정상 1s → long-press(scale up + 살짝 들기) 0.3s
    //         → 옆 컬럼으로 슬라이드 0.7s → drop(scale down) 0.3s → 정상 1s → 반복
    cardScale.value = withRepeat(
      withSequence(
        withTiming(1, {duration: 1000}),
        withTiming(1.08, {duration: 300, easing: Easing.out(Easing.quad)}),
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

    // 컬럼 위치는 매 사이클 +1 (0 → 1 → 2 → 0 모듈로)
    colShift.value = withRepeat(
      withSequence(
        withTiming(0, {duration: 1300}),
        withTiming(1, {duration: 700, easing: Easing.inOut(Easing.cubic)}),
      ),
      -1,
      false,
    );
  }, [colShift, liftY, cardScale, cardOpacity]);

  // 컬럼 폭은 layout 측정 없이 고정값으로 (PhoneMockup 폭의 비율)
  // 3컬럼 폭 = (전체폭 - hours라벨 22) / 3
  // 컬럼 간 이동량 = 컬럼 폭
  const COLUMN_WIDTH = 50; // 대략적 — flex로 자라기 때문에 시각적 근사

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      {translateX: colShift.value * COLUMN_WIDTH},
      {translateY: liftY.value},
      {scale: cardScale.value},
    ],
    opacity: cardOpacity.value,
  }));

  return (
    <View style={styles.container}>
      {/* 헤더 — 3일 라벨 */}
      <View style={styles.header}>
        <View style={styles.hoursPlaceholder} />
        {COLUMNS.map((c, i) => (
          <View key={c} style={styles.headerCell}>
            <Text
              style={[
                styles.headerText,
                i === 0 && {color: primaryColor, fontWeight: '700'},
              ]}>
              {c}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.gridArea}>
        {/* 시간 라벨 */}
        <View style={styles.hoursColumn}>
          {HOURS.map(h => (
            <View key={h} style={[styles.hourRow, {height: HOUR_HEIGHT}]}>
              <Text style={styles.hourLabel}>{h}</Text>
            </View>
          ))}
        </View>

        {/* 3컬럼 그리드 */}
        {COLUMNS.map((c, ci) => (
          <View key={c} style={styles.dayColumn}>
            {HOURS.map(h => (
              <View
                key={h}
                style={[styles.gridCell, {height: HOUR_HEIGHT}]}
              />
            ))}

            {/* 첫 컬럼에만 카드 — translateX로 이동 */}
            {ci === 0 && (
              <Animated.View
                style={[
                  styles.card,
                  {
                    top: HOUR_HEIGHT * 0.4,
                    height: HOUR_HEIGHT * 1.2,
                    backgroundColor: hexWithOpacity(primaryColor, 0.18),
                    borderColor: hexWithOpacity(primaryColor, 0.4),
                  },
                  cardStyle,
                ]}>
                <Text
                  style={[styles.cardTitle, {color: primaryColor}]}
                  numberOfLines={1}>
                  운동
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
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  header: {
    flexDirection: 'row',
    marginBottom: 4,
    paddingBottom: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  hoursPlaceholder: {
    width: 22,
  },
  headerCell: {
    flex: 1,
    alignItems: 'center',
  },
  headerText: {
    fontSize: 9,
    color: '#6B7280',
    fontWeight: '500',
  },
  gridArea: {
    flex: 1,
    flexDirection: 'row',
  },
  hoursColumn: {
    width: 22,
  },
  hourRow: {
    justifyContent: 'flex-start',
  },
  hourLabel: {
    fontSize: 9,
    color: '#9CA3AF',
    textAlign: 'right',
    paddingRight: 4,
    marginTop: -4,
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
    left: 2,
    right: 2,
    borderRadius: 5,
    borderWidth: 1,
    paddingHorizontal: 4,
    paddingVertical: 3,
  },
  cardTitle: {
    fontSize: 8,
    fontWeight: '600',
  },
});
