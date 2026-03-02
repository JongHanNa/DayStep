import React from 'react';
import {View, Text, TouchableOpacity} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {Lock} from 'lucide-react-native';
import {SCREEN_REGISTRY, type ADHDSubViewId} from '@daystep/shared-core/constants';
import {useSubscriptionStore} from '@/stores/subscriptionStore';
import {ScreenContainer} from '@/components/core';

interface ProScreenGuardProps {
  screenId: ADHDSubViewId;
  children: React.ReactNode;
}

export function ProScreenGuard({screenId, children}: ProScreenGuardProps) {
  const {hasActiveSubscription} = useSubscriptionStore();
  const navigation = useNavigation();
  const screen = SCREEN_REGISTRY[screenId];

  if (screen?.isPro && !hasActiveSubscription) {
    return (
      <ScreenContainer gradient="warmBackground">
        <View className="flex-1 items-center justify-center px-8">
          <Lock size={48} color="#9CA3AF" />
          <Text className="text-lg font-bold text-gray-700 mt-4">
            Pro 기능입니다
          </Text>
          <Text className="text-sm text-gray-500 text-center mt-2 leading-5">
            {screen.label}은{'\n'}Pro 구독에서 이용할 수 있어요.
          </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('Settings' as never)}
            className="bg-blue-500 rounded-xl py-3 px-6 mt-6">
            <Text className="text-white font-semibold">구독 알아보기</Text>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    );
  }

  return <>{children}</>;
}
