/**
 * Quick Action Grid
 * 홈 화면 퀵 액션 — [계획 세우기] [생각과 기억] [일상 돌보기] + α
 */
import React from 'react';
import {View, Text} from 'react-native';
import Animated, {FadeInDown} from 'react-native-reanimated';
import {AnimatedPressable} from '@/components/core';
import {GradientBackground} from '@/components/core';

interface QuickAction {
  id: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  gradient: string[];
  onPress: () => void;
}

interface QuickActionGridProps {
  actions: QuickAction[];
}

export function QuickActionGrid({actions}: QuickActionGridProps) {
  return (
    <View className="flex-row flex-wrap gap-3">
      {actions.map((action, index) => (
        <Animated.View
          key={action.id}
          entering={FadeInDown.delay(200 + index * 80).duration(400)}
          className="flex-1"
          style={{minWidth: '45%'}}>
          <AnimatedPressable
            onPress={action.onPress}
            hapticType="light"
            style={{borderRadius: 16, overflow: 'hidden'}}>
            <GradientBackground
              colors={action.gradient}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 1}}
              style={{
                padding: 16,
                borderRadius: 16,
                minHeight: 100,
              }}>
              <View className="mb-2">{action.icon}</View>
              <Text className="text-sm font-semibold text-white">
                {action.title}
              </Text>
              <Text className="text-xs text-white/70 mt-1">
                {action.subtitle}
              </Text>
            </GradientBackground>
          </AnimatedPressable>
        </Animated.View>
      ))}
    </View>
  );
}
