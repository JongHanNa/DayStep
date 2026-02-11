import React from 'react';
import {Text, View} from 'react-native';
import {ScreenContainer} from '@/components/core';
import Animated, {FadeInDown} from 'react-native-reanimated';

export default function ExecutionScreen() {
  return (
    <ScreenContainer gradient="executionBackground">
      <View className="flex-1 justify-center items-center px-4">
        <Animated.Text
          entering={FadeInDown.duration(500)}
          className="text-2xl font-bold text-gray-800 mb-2">
          🎯 실행 모드
        </Animated.Text>
        <Animated.Text
          entering={FadeInDown.delay(100).duration(500)}
          className="text-sm text-gray-500 text-center">
          Phase 3에서 구현됩니다{'\n'}
          스마트 추천 · 단일 작업 집중 · 포모도로
        </Animated.Text>
      </View>
    </ScreenContainer>
  );
}
