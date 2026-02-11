import React from 'react';
import {Text, View} from 'react-native';
import {ScreenContainer} from '@/components/core';
import Animated, {FadeInDown} from 'react-native-reanimated';

export default function TodoListScreen() {
  return (
    <ScreenContainer gradient="calmBackground">
      <View className="flex-1 justify-center items-center px-4">
        <Animated.Text
          entering={FadeInDown.duration(500)}
          className="text-2xl font-bold text-gray-800 mb-2">
          📅 데일리 플래너
        </Animated.Text>
        <Animated.Text
          entering={FadeInDown.delay(100).duration(500)}
          className="text-sm text-gray-500">
          Phase 2에서 구현됩니다
        </Animated.Text>
      </View>
    </ScreenContainer>
  );
}
