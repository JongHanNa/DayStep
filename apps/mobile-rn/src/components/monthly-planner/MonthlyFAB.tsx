import React from 'react';
import Animated, {FadeIn} from 'react-native-reanimated';
import {Text, StyleSheet} from 'react-native';
import {AnimatedPressable} from '@/components/core';
import {useTheme} from '@/theme';

interface MonthlyFABProps {
  onPress: () => void;
}

export function MonthlyFAB({onPress}: MonthlyFABProps) {
  const {primaryColor} = useTheme();
  return (
    <Animated.View entering={FadeIn.delay(400).duration(300)} style={styles.fabContainer}>
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
  fabContainer: {
    position: 'absolute',
    right: 20,
    bottom: 100,
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
