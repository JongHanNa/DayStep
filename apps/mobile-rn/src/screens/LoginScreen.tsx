import React from 'react';
import {Text, View} from 'react-native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {ScreenContainer} from '@/components/core';
import {AnimatedPressable} from '@/components/core';
import {GradientBackground} from '@/components/core';
import Animated, {FadeInDown, FadeIn} from 'react-native-reanimated';

type Props = {
  navigation: NativeStackNavigationProp<any>;
};

export default function LoginScreen({navigation}: Props) {
  const handleLogin = () => {
    // TODO: Phase 1에서 실제 인증 로직 구현
    navigation.replace('Main');
  };

  return (
    <ScreenContainer gradient="warmBackground" edges={['top', 'bottom', 'left', 'right']}>
      <View className="flex-1 justify-center items-center px-6">
        <Animated.Text
          entering={FadeIn.duration(600)}
          className="text-4xl font-bold text-gray-900 mb-2">
          DayStep
        </Animated.Text>
        <Animated.Text
          entering={FadeInDown.delay(200).duration(500)}
          className="text-base text-gray-500 mb-10">
          오늘 하루를 차분하게 시작하세요
        </Animated.Text>

        <Animated.View entering={FadeInDown.delay(400).duration(500)}>
          <AnimatedPressable
            onPress={handleLogin}
            hapticType="medium"
            className="bg-blue-500 px-8 py-4 rounded-2xl">
            <Text className="text-white text-base font-semibold">
              로그인 (개발용 스킵)
            </Text>
          </AnimatedPressable>
        </Animated.View>
      </View>
    </ScreenContainer>
  );
}
