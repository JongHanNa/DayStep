/**
 * FuelCard — 원동력 인라인 카드
 * BannerPage.tsx amber 카드를 독립 컴포넌트로 추출
 */
import React from 'react';
import {View, Text} from 'react-native';
import Animated, {FadeInDown} from 'react-native-reanimated';
import {GradientBackground} from '@/components/core';
import {Flame} from 'lucide-react-native';
import type {Note} from '@/stores/noteStore';

interface FuelCardProps {
  note: Note | null;
  enterDelay?: number;
}

export function FuelCard({note, enterDelay = 0}: FuelCardProps) {
  return (
    <Animated.View entering={FadeInDown.delay(enterDelay).duration(400)}>
      <GradientBackground
        colors={['#FEF3C7', '#FDE68A', '#FBBF24']}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
        style={{borderRadius: 16, padding: 16}}>
        <View className="flex-row items-center mb-3">
          <Flame size={22} color="#92400E" />
          <Text className="text-lg font-semibold text-amber-900 ml-2">
            나의 원동력
          </Text>
        </View>
        {note ? (
          <>
            {note.title && (
              <Text className="text-base font-medium text-amber-900 mb-1">
                {note.title}
              </Text>
            )}
            <Text className="text-sm text-amber-800/80 leading-5">
              {note.content}
            </Text>
          </>
        ) : (
          <Text className="text-sm text-amber-800/60">
            아직 원동력이 없어요.{'\n'}
            Notes에서 원동력을 기록해보세요.
          </Text>
        )}
      </GradientBackground>
    </Animated.View>
  );
}
