import React from 'react';
import {Text, View} from 'react-native';
import {ScreenContainer} from '@/components/core';
import {AnimatedCard} from '@/components/core';
import {useTheme} from '@/theme';
import Animated, {FadeInDown} from 'react-native-reanimated';

export default function SettingsScreen() {
  const {colorTheme} = useTheme();

  return (
    <ScreenContainer>
      <View className="flex-1 px-4">
        <Animated.Text
          entering={FadeInDown.duration(500)}
          className="text-2xl font-bold text-gray-800 mt-4 mb-6">
          ⚙️ 설정
        </Animated.Text>

        <AnimatedCard enterDelay={100} style={{marginBottom: 12}}>
          <Text className="text-base font-medium text-gray-700">
            현재 테마
          </Text>
          <Text className="text-sm text-gray-500 mt-1">
            {colorTheme.icon} {colorTheme.nameKo}
          </Text>
        </AnimatedCard>

        <AnimatedCard enterDelay={200} style={{marginBottom: 12}}>
          <Text className="text-base font-medium text-gray-700">
            Phase 6에서 전체 설정 구현
          </Text>
          <Text className="text-sm text-gray-500 mt-1">
            테마, 폰트, 알림, 구독 관리
          </Text>
        </AnimatedCard>
      </View>
    </ScreenContainer>
  );
}
