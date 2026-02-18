/**
 * GroupSection — 3그룹 공용 섹션 컴포넌트
 * 컬러 도트 + 제목 + 기능 그리드
 */
import React from 'react';
import {View, Text} from 'react-native';
import Animated, {FadeInDown} from 'react-native-reanimated';
import {AnimatedPressable, GradientBackground} from '@/components/core';

export interface FeatureItem {
  id: string;
  emoji: string;
  label: string;
  gradientColors: string[];
  onPress: () => void;
}

interface GroupSectionProps {
  dotColor: string;
  title: string;
  items: FeatureItem[];
  numColumns?: 2 | 3;
  enterDelay?: number;
}

export function GroupSection({
  dotColor,
  title,
  items,
  numColumns = 3,
  enterDelay = 0,
}: GroupSectionProps) {
  const itemWidth = numColumns === 2 ? '48%' : '31%';

  return (
    <Animated.View
      entering={FadeInDown.delay(enterDelay).duration(400)}
      className="mx-4">
      {/* 헤더: 도트 + 제목 */}
      <View className="flex-row items-center mb-2">
        <View
          style={{
            width: 10,
            height: 10,
            borderRadius: 5,
            backgroundColor: dotColor,
            marginRight: 8,
          }}
        />
        <Text className="text-base font-semibold text-gray-800">{title}</Text>
      </View>

      {/* 구분선 */}
      <View
        style={{
          height: 1,
          backgroundColor: dotColor + '33',
          marginBottom: 12,
        }}
      />

      {/* 기능 그리드 */}
      <View className="flex-row flex-wrap" style={{gap: 8}}>
        {items.map((item, index) => (
          <Animated.View
            key={item.id}
            entering={FadeInDown.delay(enterDelay + 50 + index * 60).duration(350)}
            style={{width: itemWidth}}>
            <AnimatedPressable
              onPress={item.onPress}
              hapticType="light"
              scaleValue={0.97}
              style={{borderRadius: 14, overflow: 'hidden'}}>
              <GradientBackground
                colors={item.gradientColors}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 1}}
                style={{
                  borderRadius: 14,
                  paddingVertical: 16,
                  paddingHorizontal: 8,
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: 80,
                }}>
                <Text style={{fontSize: 24, marginBottom: 6}}>{item.emoji}</Text>
                <Text className="text-xs font-medium text-white text-center">
                  {item.label}
                </Text>
              </GradientBackground>
            </AnimatedPressable>
          </Animated.View>
        ))}
      </View>
    </Animated.View>
  );
}
