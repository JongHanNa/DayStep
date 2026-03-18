/**
 * PhoneMockup — 재사용 가능한 iPhone 프레임 컴포넌트
 * 부드럽게 위아래로 떠다니는(bobbing) 애니메이션 적용
 */
import React, {useEffect} from 'react';
import {View, Dimensions, StyleSheet} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';

const SCREEN_WIDTH = Dimensions.get('window').width;

interface PhoneMockupProps {
  children: React.ReactNode;
  width?: number;
}

export function PhoneMockup({
  children,
  width = SCREEN_WIDTH * 0.55,
}: PhoneMockupProps) {
  const height = width * 2;
  const translateY = useSharedValue(0);

  useEffect(() => {
    translateY.value = withRepeat(
      withSequence(
        withTiming(-8, {
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
        }),
        withTiming(0, {
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
        }),
      ),
      -1,
      true,
    );
  }, [translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{translateY: translateY.value}],
  }));

  return (
    <Animated.View style={[styles.wrapper, animatedStyle]}>
      <View
        style={[
          styles.frame,
          {width, height},
        ]}>
        {/* 다이나믹 아일랜드 */}
        <View style={styles.notchContainer}>
          <View style={styles.dynamicIsland} />
        </View>

        {/* 컨텐츠 영역 */}
        <View style={styles.content}>{children}</View>

        {/* 하단 홈 인디케이터 */}
        <View style={styles.homeIndicatorContainer}>
          <View style={styles.homeIndicator} />
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
  },
  frame: {
    backgroundColor: '#FFFFFF',
    borderRadius: 36,
    borderWidth: 3,
    borderColor: '#1F2937',
    overflow: 'hidden',
    // 그림자
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  notchContainer: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 6,
  },
  dynamicIsland: {
    width: 72,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#1F2937',
  },
  content: {
    flex: 1,
    overflow: 'hidden',
  },
  homeIndicatorContainer: {
    alignItems: 'center',
    paddingBottom: 8,
    paddingTop: 4,
  },
  homeIndicator: {
    width: 100,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
  },
});
