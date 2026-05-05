/**
 * MiniDayPreview — 일 뷰 페이월용 미리보기
 * 단일 컬럼 시간 그리드 + 카드 + 위/아래 핸들 점
 * 자동 반복 애니메이션: 핸들 fade-in → 아래 핸들이 아래로 이동(시간 늘림) → 원위치
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

interface MiniDayPreviewProps {
  primaryColor: string;
}

const HOURS = ['09', '10', '11', '12', '13'];
const HOUR_HEIGHT = 28;
const CARD_TOP = HOUR_HEIGHT * 0.5; // 09:30
const CARD_BASE_HEIGHT = HOUR_HEIGHT; // 1시간 (09:30~10:30)
const CARD_EXTENDED = HOUR_HEIGHT * 2.5; // 늘어났을 때 09:30~12:00

export function MiniDayPreview({primaryColor}: MiniDayPreviewProps) {
  const handleOpacity = useSharedValue(0);
  const cardHeight = useSharedValue(CARD_BASE_HEIGHT);
  const cardScale = useSharedValue(1);

  useEffect(() => {
    // 사이클: (1) 정상 1s → (2) long-press: 핸들 fade-in + 카드 살짝 확대 0.4s
    //         → (3) 아래로 늘어남 0.9s → (4) hold 0.6s → (5) 원위치 0.6s → 반복
    handleOpacity.value = withRepeat(
      withSequence(
        withTiming(0, {duration: 1000}),
        withTiming(1, {duration: 400, easing: Easing.out(Easing.quad)}),
        withDelay(1500, withTiming(0, {duration: 600})),
      ),
      -1,
      false,
    );

    cardScale.value = withRepeat(
      withSequence(
        withTiming(1, {duration: 1000}),
        withTiming(1.04, {duration: 400, easing: Easing.out(Easing.quad)}),
        withDelay(1500, withTiming(1, {duration: 600})),
      ),
      -1,
      false,
    );

    cardHeight.value = withRepeat(
      withSequence(
        withTiming(CARD_BASE_HEIGHT, {duration: 1400}),
        withTiming(CARD_EXTENDED, {
          duration: 900,
          easing: Easing.out(Easing.cubic),
        }),
        withDelay(600, withTiming(CARD_BASE_HEIGHT, {duration: 600})),
      ),
      -1,
      false,
    );
  }, [handleOpacity, cardScale, cardHeight]);

  const cardAnimStyle = useAnimatedStyle(() => ({
    height: cardHeight.value,
    transform: [{scale: cardScale.value}],
  }));

  const handleAnimStyle = useAnimatedStyle(() => ({
    opacity: handleOpacity.value,
  }));

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.headerText}>4월 29일 (수)</Text>
      </View>

      <View style={styles.gridArea}>
        {/* 시간 라벨 + 그리드 라인 */}
        <View style={styles.hoursColumn}>
          {HOURS.map(h => (
            <View key={h} style={[styles.hourRow, {height: HOUR_HEIGHT}]}>
              <Text style={styles.hourLabel}>{h}</Text>
            </View>
          ))}
        </View>

        {/* 그리드 + 카드 */}
        <View style={styles.gridColumn}>
          {HOURS.map(h => (
            <View
              key={h}
              style={[styles.gridLine, {height: HOUR_HEIGHT}]}
            />
          ))}

          {/* 할일 카드 */}
          <Animated.View
            style={[
              styles.card,
              {
                top: CARD_TOP,
                backgroundColor: hexWithOpacity(primaryColor, 0.18),
                borderColor: hexWithOpacity(primaryColor, 0.4),
              },
              cardAnimStyle,
            ]}>
            <Text style={[styles.cardTitle, {color: primaryColor}]} numberOfLines={1}>
              회의 준비
            </Text>

            {/* 위쪽 핸들 점 */}
            <Animated.View
              style={[
                styles.handleTop,
                {backgroundColor: primaryColor},
                handleAnimStyle,
              ]}
            />
            {/* 아래쪽 핸들 점 */}
            <Animated.View
              style={[
                styles.handleBottom,
                {backgroundColor: primaryColor},
                handleAnimStyle,
              ]}
            />
          </Animated.View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  header: {
    alignItems: 'center',
    marginBottom: 6,
  },
  headerText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1F2937',
  },
  gridArea: {
    flexDirection: 'row',
    flex: 1,
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
    fontWeight: '500',
    textAlign: 'right',
    paddingRight: 4,
    marginTop: -4,
  },
  gridColumn: {
    flex: 1,
    position: 'relative',
  },
  gridLine: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
  },
  card: {
    position: 'absolute',
    left: 4,
    right: 4,
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingTop: 4,
  },
  cardTitle: {
    fontSize: 9,
    fontWeight: '600',
  },
  handleTop: {
    position: 'absolute',
    top: -4,
    alignSelf: 'center',
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  handleBottom: {
    position: 'absolute',
    bottom: -4,
    alignSelf: 'center',
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
});
