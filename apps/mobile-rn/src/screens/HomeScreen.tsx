import React from 'react';
import {Text, View, ScrollView} from 'react-native';
import {ScreenContainer} from '@/components/core';
import {AnimatedCard} from '@/components/core';
import Animated, {FadeInDown} from 'react-native-reanimated';

export default function HomeScreen() {
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? '좋은 아침이에요 ☀️' : hour < 18 ? '좋은 오후예요 🌤' : '편안한 저녁이에요 🌙';

  return (
    <ScreenContainer gradient="warmBackground">
      <ScrollView
        className="flex-1 px-4"
        contentContainerStyle={{paddingBottom: 100}}
        showsVerticalScrollIndicator={false}>
        <Animated.Text
          entering={FadeInDown.duration(500)}
          className="text-3xl font-bold text-gray-900 mt-4 mb-6">
          {greeting}
        </Animated.Text>

        <AnimatedCard enterDelay={100} style={{marginBottom: 12}}>
          <Text className="text-lg font-semibold text-gray-800 mb-1">
            📋 계획 세우기
          </Text>
          <Text className="text-sm text-gray-500">
            오늘의 할일을 정리해보세요
          </Text>
        </AnimatedCard>

        <AnimatedCard enterDelay={200} style={{marginBottom: 12}}>
          <Text className="text-lg font-semibold text-gray-800 mb-1">
            💭 생각과 기억
          </Text>
          <Text className="text-sm text-gray-500">
            떠오르는 아이디어를 기록하세요
          </Text>
        </AnimatedCard>

        <AnimatedCard enterDelay={300} style={{marginBottom: 12}}>
          <Text className="text-lg font-semibold text-gray-800 mb-1">
            🌿 일상 돌보기
          </Text>
          <Text className="text-sm text-gray-500">
            소중한 일상을 가꿔보세요
          </Text>
        </AnimatedCard>
      </ScrollView>
    </ScreenContainer>
  );
}
