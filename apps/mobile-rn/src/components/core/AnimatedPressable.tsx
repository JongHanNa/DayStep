/**
 * AnimatedPressable
 * 스프링 터치 피드백 + 햅틱 — 모든 터치 요소의 기본 빌딩 블록
 */
import React, {useCallback} from 'react';
import {Pressable, PressableProps, ViewStyle, StyleProp} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import {useHaptic} from '@/hooks/useHaptic';
import {springs, scales} from '@/theme/animations';

const AnimatedPressableBase = Animated.createAnimatedComponent(Pressable);

interface AnimatedPressableProps extends Omit<PressableProps, 'style'> {
  /** 눌렀을 때 스케일 값 (default: 0.97) */
  scaleValue?: number;
  /** 스프링 프리셋 */
  springPreset?: keyof typeof springs;
  /** 햅틱 피드백 활성화 (default: true) */
  haptic?: boolean;
  /** 햅틱 타입 */
  hapticType?: 'light' | 'medium' | 'selection';
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

export function AnimatedPressable({
  scaleValue = scales.pressIn,
  springPreset = 'press',
  haptic = true,
  hapticType = 'light',
  onPressIn,
  onPressOut,
  onPress,
  style,
  children,
  ...props
}: AnimatedPressableProps) {
  const scale = useSharedValue(1);
  const {light, medium, selection} = useHaptic();

  const hapticFn = hapticType === 'medium' ? medium : hapticType === 'selection' ? selection : light;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{scale: scale.value}],
  }));

  const handlePressIn = useCallback(
    (e: any) => {
      scale.value = withSpring(scaleValue, springs[springPreset]);
      if (haptic) {
        hapticFn();
      }
      onPressIn?.(e);
    },
    [scale, scaleValue, springPreset, haptic, hapticFn, onPressIn],
  );

  const handlePressOut = useCallback(
    (e: any) => {
      scale.value = withSpring(1, springs[springPreset]);
      onPressOut?.(e);
    },
    [scale, springPreset, onPressOut],
  );

  return (
    <AnimatedPressableBase
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      style={[animatedStyle, style]}
      {...props}>
      {children}
    </AnimatedPressableBase>
  );
}
