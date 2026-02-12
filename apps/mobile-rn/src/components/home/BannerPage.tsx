/**
 * BannerPage — Home Page 1
 * 원동력(fuel note) 카드 + 관계 리마인더 카드
 * 실제 데이터 연동: noteStore + cherishedPeopleStore
 */
import React, {useEffect, useMemo} from 'react';
import {View, Text, ScrollView} from 'react-native';
import Animated, {FadeInDown} from 'react-native-reanimated';
import {AnimatedCard} from '@/components/core';
import {GradientBackground} from '@/components/core';
import {useNoteStore} from '@/stores/noteStore';
import {useCherishedPeopleStore} from '@/stores/cherishedPeopleStore';
import {useAuthStore} from '@/stores/authStore';
import {Flame, Heart, Sparkles, Phone} from 'lucide-react-native';

export function BannerPage() {
  const user = useAuthStore(s => s.user);
  const {notes, fetchFuelNotes, getRandomFuelNote} = useNoteStore();
  const {recommendations, loadRecommendations, getRandomRecommendation} =
    useCherishedPeopleStore();

  useEffect(() => {
    if (user?.id) {
      fetchFuelNotes(user.id);
      loadRecommendations(user.id);
    }
  }, [user?.id]);

  const fuelNote = useMemo(() => getRandomFuelNote(), [notes]);
  const recommendation = useMemo(
    () => getRandomRecommendation(),
    [recommendations],
  );

  return (
    <ScrollView
      contentContainerStyle={{paddingBottom: 100, paddingHorizontal: 20}}
      showsVerticalScrollIndicator={false}>
      {/* 섹션 제목 */}
      <Animated.View
        entering={FadeInDown.delay(100).duration(400)}
        className="flex-row items-center mt-4 mb-4">
        <Sparkles size={20} color="#F59E0B" />
        <Text className="text-lg font-bold text-gray-800 ml-2">
          오늘의 영감
        </Text>
      </Animated.View>

      {/* 원동력 카드 */}
      <Animated.View entering={FadeInDown.delay(200).duration(400)}>
        <GradientBackground
          colors={['#FEF3C7', '#FDE68A', '#FBBF24']}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 1}}
          style={{borderRadius: 16, padding: 20, marginBottom: 16}}>
          <View className="flex-row items-center mb-3">
            <Flame size={22} color="#92400E" />
            <Text className="text-lg font-semibold text-amber-900 ml-2">
              나의 원동력
            </Text>
          </View>
          {fuelNote ? (
            <>
              {fuelNote.title && (
                <Text className="text-base font-medium text-amber-900 mb-1">
                  {fuelNote.title}
                </Text>
              )}
              <Text className="text-sm text-amber-800/80 leading-5">
                {fuelNote.content}
              </Text>
            </>
          ) : (
            <Text className="text-sm text-amber-800/60">
              아직 원동력이 없어요.{'\n'}
              노트에서 Fuel 모드로 나만의 원동력을 기록해보세요.
            </Text>
          )}
        </GradientBackground>
      </Animated.View>

      {/* 관계 리마인더 카드 */}
      <Animated.View entering={FadeInDown.delay(300).duration(400)}>
        <GradientBackground
          colors={['#FCE7F3', '#FBCFE8', '#F9A8D4']}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 1}}
          style={{borderRadius: 16, padding: 20, marginBottom: 16}}>
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

      {/* 하루 한 줄 영감 */}
      <Animated.View entering={FadeInDown.delay(400).duration(400)}>
        <AnimatedCard>
          <View className="items-center py-4">
            <Sparkles size={24} color="#8B5CF6" />
            <Text className="text-sm text-gray-500 mt-3 text-center leading-5">
              "작은 시작이 큰 변화를 만듭니다"{'\n'}
              오늘도 한 걸음씩 나아가봐요.
            </Text>
          </View>
        </AnimatedCard>
      </Animated.View>
    </ScrollView>
  );
}
