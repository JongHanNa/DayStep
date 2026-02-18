/**
 * ContactNudge — 연락 추천 인라인 카드
 * BannerPage.tsx pink 카드를 독립 컴포넌트로 추출
 */
import React from 'react';
import {View, Text} from 'react-native';
import Animated, {FadeInDown} from 'react-native-reanimated';
import {GradientBackground} from '@/components/core';
import {Heart, Phone} from 'lucide-react-native';

interface ContactRecommendation {
  person: {
    name: string;
    nickname?: string;
    relationships: string[];
  };
  daysSinceContact: number;
  priority: 'high' | 'medium' | 'normal';
}

interface ContactNudgeProps {
  recommendation: ContactRecommendation | null;
  enterDelay?: number;
}

export function ContactNudge({recommendation, enterDelay = 0}: ContactNudgeProps) {
  return (
    <Animated.View entering={FadeInDown.delay(enterDelay).duration(400)}>
      <GradientBackground
        colors={['#FCE7F3', '#FBCFE8', '#F9A8D4']}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
        style={{borderRadius: 16, padding: 16, marginHorizontal: 16}}>
        <View className="flex-row items-center mb-3">
          <Heart size={22} color="#9D174D" />
          <Text className="text-lg font-semibold text-pink-900 ml-2">
            소중한 사람
          </Text>
        </View>
        {recommendation ? (
          <View>
            <Text className="text-base font-medium text-pink-900 mb-1">
              {recommendation.person.name}
              {recommendation.person.nickname
                ? ` (${recommendation.person.nickname})`
                : ''}
            </Text>
            <Text className="text-sm text-pink-800/80 mb-2">
              {recommendation.daysSinceContact >= 999
                ? '아직 연락한 기록이 없어요'
                : `${recommendation.daysSinceContact}일 전에 마지막으로 연락했어요`}
            </Text>
            {(recommendation.person.relationships?.length ?? 0) > 0 && (
              <View className="flex-row flex-wrap gap-1">
                {recommendation.person.relationships.map((rel, i) => (
                  <View
                    key={i}
                    className="bg-pink-200/50 rounded-full px-2 py-0.5">
                    <Text className="text-xs text-pink-800">{rel}</Text>
                  </View>
                ))}
              </View>
            )}
            <View className="flex-row items-center mt-3">
              <Phone size={14} color="#9D174D" />
              <Text className="text-xs text-pink-800/70 ml-1">
                오늘 안부를 전해보는 건 어떨까요?
              </Text>
            </View>
          </View>
        ) : (
          <Text className="text-sm text-pink-800/60">
            소중한 사람을 등록하면{'\n'}
            연락 리마인더를 받을 수 있어요.
          </Text>
        )}
      </GradientBackground>
    </Animated.View>
  );
}
