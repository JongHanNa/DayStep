/**
 * AnimatedCard
 * 카드 컨테이너 — 그림자 + 프레스 피드백 + 입장 애니메이션
 */
import React from 'react';
import {ViewStyle, StyleProp} from 'react-native';
import Animated, {
  FadeInDown,
  type AnimatedStyle,
} from 'react-native-reanimated';
import {AnimatedPressable} from './AnimatedPressable';
import {shadows, radius, spacing} from '@/theme/tokens';

interface AnimatedCardProps {
  children: React.ReactNode;
  onPress?: () => void;
  /** 입장 딜레이 (stagger용, ms) */
  enterDelay?: number;
  /** 프레스 가능 여부 (default: true if onPress provided) */
  pressable?: boolean;
  style?: StyleProp<ViewStyle>;
  className?: string;
}

const cardBaseStyle: ViewStyle = {
  borderRadius: radius.card,
  padding: spacing.lg,
  backgroundColor: '#FFFFFF',
  ...shadows.md,
};

export function AnimatedCard({
  children,
  onPress,
  enterDelay = 0,
  pressable,
  style,
  className,
}: AnimatedCardProps) {
  const isPressable = pressable ?? !!onPress;

  const entering = FadeInDown.delay(enterDelay)
    .duration(400)
    .springify()
    .damping(25)
    .stiffness(300);

  if (isPressable) {
    return (
      <Animated.View entering={entering}>
        <AnimatedPressable
          onPress={onPress}
          style={[cardBaseStyle, style]}
          className={className}>
          {children}
        </AnimatedPressable>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      entering={entering}
      style={[cardBaseStyle, style]}
      className={className}>
      {children}
    </Animated.View>
  );
}
