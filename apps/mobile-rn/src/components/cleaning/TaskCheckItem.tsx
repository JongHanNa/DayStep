/**
 * TaskCheckItem — 체크박스 + 주기 뱃지
 * TodoCard withSequence 바운스 패턴 사용
 */
import React from 'react';
import {View, Text} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import {Check} from 'lucide-react-native';
import {AnimatedPressable} from '@/components/core';
import {useHaptic} from '@/hooks/useHaptic';
import {useTheme} from '@/theme';
import {springs} from '@/theme/animations';
import {FREQUENCY_LABELS, FREQUENCY_COLORS} from '@/constants/cleaning-data';
import type {CleaningTask} from '@/constants/cleaning-data';

interface TaskCheckItemProps {
  task: CleaningTask;
  isCompleted: boolean;
  onToggle: () => void;
}

export function TaskCheckItem({task, isCompleted, onToggle}: TaskCheckItemProps) {
  const {primaryColor} = useTheme();
  const haptic = useHaptic();
  const checkScale = useSharedValue(1);

  const checkAnimStyle = useAnimatedStyle(() => ({
    transform: [{scale: checkScale.value}],
  }));

  const handleToggle = () => {
    checkScale.value = withSequence(
      withSpring(0.8, springs.snappy),
      withSpring(1.2, springs.bouncy),
      withSpring(1, springs.default),
    );
    haptic.selection();
    onToggle();
  };

  return (
    <AnimatedPressable
      hapticType="light"
      onPress={handleToggle}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 12,
        gap: 10,
      }}>
      {/* 체크박스 */}
      <Animated.View
        style={[
          checkAnimStyle,
          {
            width: 22,
            height: 22,
            borderRadius: 6,
            borderWidth: 2,
            borderColor: isCompleted ? primaryColor : '#D1D5DB',
            backgroundColor: isCompleted ? primaryColor : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
          },
        ]}>
        {isCompleted && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
      </Animated.View>

      {/* 태스크명 */}
      <Text
        style={{
          flex: 1,
          fontSize: 14,
          color: isCompleted ? '#9CA3AF' : '#374151',
          textDecorationLine: isCompleted ? 'line-through' : 'none',
        }}>
        {task.title}
      </Text>

      {/* 예상시간 */}
      <Text style={{fontSize: 11, color: '#9CA3AF', marginRight: 4}}>
        {task.estimatedMinutes}분
      </Text>

      {/* 주기 뱃지 */}
      <View
        style={{
          paddingHorizontal: 6,
          paddingVertical: 2,
          borderRadius: 8,
          backgroundColor: FREQUENCY_COLORS[task.frequency] + '15',
        }}>
        <Text
          style={{
            fontSize: 10,
            fontWeight: '600',
            color: FREQUENCY_COLORS[task.frequency],
          }}>
          {FREQUENCY_LABELS[task.frequency]}
        </Text>
      </View>
    </AnimatedPressable>
  );
}
