/**
 * StreakBar — 연속일 표시
 */
import React from 'react';
import {View, Text} from 'react-native';
import Animated, {FadeInDown} from 'react-native-reanimated';
import {Flame} from 'lucide-react-native';

interface StreakBarProps {
  streak: number;
}

export function StreakBar({streak}: StreakBarProps) {
  if (streak <= 0) return null;

  return (
    <Animated.View
      entering={FadeInDown.delay(400).duration(400)}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        gap: 6,
      }}>
      <Flame size={16} color="#F59E0B" fill="#F59E0B" />
      <Text style={{fontSize: 13, fontWeight: '600', color: '#D97706'}}>
        {streak}일 연속 청소!
      </Text>
    </Animated.View>
  );
}
