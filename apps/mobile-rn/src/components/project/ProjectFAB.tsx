/**
 * ProjectFAB — 프로젝트 추가 플로팅 액션 버튼
 * MonthlyFAB 패턴 동일
 */
import React from 'react';
import {Text, StyleSheet} from 'react-native';
import Animated, {FadeIn} from 'react-native-reanimated';
import {AnimatedPressable} from '@/components/core';
import {useTheme} from '@/theme';

interface ProjectFABProps {
  onPress: () => void;
}

export function ProjectFAB({onPress}: ProjectFABProps) {
  const {primaryColor} = useTheme();
  return (
    <Animated.View entering={FadeIn.delay(400).duration(300)} style={styles.container}>
      <AnimatedPressable
        onPress={onPress}
        hapticType="medium"
        scaleValue={0.9}
        style={[styles.fab, {backgroundColor: primaryColor}]}>
        <Text style={styles.fabText}>+</Text>
      </AnimatedPressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 20,
    bottom: 75,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  fabText: {
    fontSize: 28,
    fontWeight: '300',
    color: '#FFFFFF',
    marginTop: -2,
  },
});
