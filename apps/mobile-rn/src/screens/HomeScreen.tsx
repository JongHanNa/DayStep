/**
 * Home Dashboard — 하이브리드 리디자인
 * 단일 ScrollView: 인사 → 진행률 → 원동력 → 미션 → 3그룹 허브 → 연락 추천 → 푸터
 */
import React, {useEffect, useMemo} from 'react';
import {Text, View, ScrollView} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import Animated, {FadeInDown, FadeIn} from 'react-native-reanimated';
import {ScreenContainer, AnimatedCard} from '@/components/core';
import {ProgressRing} from '@/components/home/ProgressRing';
import {FuelCard} from '@/components/home/FuelCard';
import {MissionCard} from '@/components/home/MissionCard';
import {GroupSection} from '@/components/home/GroupSection';
import type {FeatureItem} from '@/components/home/GroupSection';
import {ContactNudge} from '@/components/home/ContactNudge';
import {useTodoStore} from '@/stores/todoStore';
import {useNoteStore} from '@/stores/noteStore';
import {useCherishedPeopleStore} from '@/stores/cherishedPeopleStore';
import {useAuthStore} from '@/stores/authStore';
import {format} from 'date-fns';
import {ko} from 'date-fns/locale';
import {Moon, Sun, CloudSun, Sparkles} from 'lucide-react-native';

function getGreeting(): {text: string; Icon: React.FC<any>; gradient: string[]} {
  const hour = new Date().getHours();
  if (hour < 6) return {text: '아직 이른 새벽이에요', Icon: Moon, gradient: ['#1E1B4B', '#312E81']};
  if (hour < 12) return {text: '좋은 아침이에요', Icon: Sun, gradient: ['#FEF3C7', '#FDE68A']};
  if (hour < 18) return {text: '좋은 오후예요', Icon: CloudSun, gradient: ['#DBEAFE', '#93C5FD']};
  return {text: '편안한 저녁이에요', Icon: Moon, gradient: ['#EDE9FE', '#C4B5FD']};
}

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const {todos} = useTodoStore();
  const user = useAuthStore(s => s.user);
  const {notes, fetchFuelNotes, getRandomFuelNote} = useNoteStore();
  const {recommendations, loadRecommendations, getRandomRecommendation} =
    useCherishedPeopleStore();

  // 원동력 + 연락 추천 데이터 로딩
  useEffect(() => {
    if (user?.id) {
      fetchFuelNotes(user.id);
      loadRecommendations(user.id);
    }
  }, [user?.id]);

  const greeting = useMemo(() => getGreeting(), []);
  const today = format(new Date(), 'M월 d일 EEEE', {locale: ko});
  const fuelNote = useMemo(() => getRandomFuelNote(), [notes]);
  const recommendation = useMemo(() => getRandomRecommendation(), [recommendations]);

  const completedCount = todos.filter(t => t.completed).length;
  const totalCount = todos.length;
  const progress = totalCount > 0 ? completedCount / totalCount : 0;

  const GreetingIcon = greeting.Icon;

  // ── 그룹 아이템 정의 ──

  const planItems: FeatureItem[] = useMemo(() => [
    {
      id: 'plan-day',
      emoji: '📋',
      label: '하루 계획하기',
      gradientColors: ['#BFDBFE', '#3B82F6'],
      onPress: () => navigation.navigate('Planner'),
    },
    {
      id: 'plan-schedule',
      emoji: '📅',
      label: '일정 계획하기',
      gradientColors: ['#93C5FD', '#2563EB'],
      onPress: () => navigation.navigate('Planner'),
    },
    {
      id: 'plan-view',
      emoji: '👀',
      label: '내 계획 보기',
      gradientColors: ['#60A5FA', '#1D4ED8'],
      onPress: () => navigation.navigate('Planner'),
    },
    {
      id: 'plan-ai',
      emoji: '🤖',
      label: 'AI로 계획하기',
      gradientColors: ['#BFDBFE', '#60A5FA'],
      onPress: () => navigation.navigate('Planner'),
    },
    {
      id: 'plan-claude',
      emoji: '🔗',
      label: 'Claude 연결하기',
      gradientColors: ['#93C5FD', '#3B82F6'],
      onPress: () => navigation.navigate('Settings'),
    },
  ], [navigation]);

  const thoughtItems: FeatureItem[] = useMemo(() => [
    {
      id: 'thought-fuel',
      emoji: '🔥',
      label: '원동력 새기기',
      gradientColors: ['#C4B5FD', '#7C3AED'],
      onPress: () => navigation.navigate('Notes'),
    },
    {
      id: 'thought-people',
      emoji: '💕',
      label: '관계 기록하기',
      gradientColors: ['#8B5CF6', '#5B21B6'],
      onPress: () => navigation.navigate('Notes'),
    },
    {
      id: 'thought-news',
      emoji: '📰',
      label: '소식 챙기기',
      gradientColors: ['#A78BFA', '#6D28D9'],
      onPress: () => navigation.navigate('Notes'),
    },
  ], [navigation]);

  const careItems: FeatureItem[] = useMemo(() => [
    {
      id: 'care-gratitude',
      emoji: '🙏',
      label: '감사 기록하기',
      gradientColors: ['#BBF7D0', '#22C55E'],
      onPress: () => navigation.navigate('Notes'),
    },
    {
      id: 'care-activity',
      emoji: '📊',
      label: '활동 살펴보기',
      gradientColors: ['#6EE7B7', '#10B981'],
      onPress: () => navigation.navigate('Settings'),
    },
  ], [navigation]);

  return (
    <ScreenContainer gradient="warmBackground">
      <ScrollView
        contentContainerStyle={{paddingBottom: 100}}
        showsVerticalScrollIndicator={false}>

        {/* 1. 날짜 + 인사말 */}
        <View className="px-4 pt-4 pb-2">
          <Animated.Text
            entering={FadeIn.duration(600)}
            className="text-sm text-gray-500 mb-1">
            {today}
          </Animated.Text>
          <View className="flex-row items-center">
            <Animated.Text
              entering={FadeInDown.delay(100).duration(500)}
              className="text-3xl font-bold text-gray-900 mr-2">
              {greeting.text}
            </Animated.Text>
            <GreetingIcon size={28} color="#F59E0B" />
          </View>
        </View>

        {/* 2. 진행률 카드 */}
        <View className="px-4 mt-4">
          <AnimatedCard enterDelay={200}>
            <View className="flex-row items-center justify-between">
              <View className="flex-1 mr-4">
                <Text className="text-lg font-semibold text-gray-800 mb-1">
                  오늘의 진행률
                </Text>
                <Text className="text-sm text-gray-500">
                  {totalCount > 0
                    ? `${completedCount}개 완료 / ${totalCount}개 중`
                    : '오늘의 할일을 추가해보세요'}
                </Text>
                {totalCount > 0 && (
                  <View className="mt-3 bg-gray-100 rounded-full h-2 overflow-hidden">
                    <View
                      className="bg-blue-500 h-full rounded-full"
                      style={{width: `${Math.round(progress * 100)}%`}}
                    />
                  </View>
                )}
              </View>
              <ProgressRing
                progress={progress}
                size={80}
                strokeWidth={6}
                completed={completedCount}
                total={totalCount}
              />
            </View>
          </AnimatedCard>
        </View>

        {/* 3. 원동력 인라인 카드 */}
        <View className="mt-5">
          <FuelCard note={fuelNote} enterDelay={300} />
        </View>

        {/* 4. 오늘의 미션 */}
        <View className="mt-5">
          <MissionCard
            todos={todos}
            onNavigateToExecute={() => navigation.navigate('Execute')}
            onNavigateToPlanner={() => navigation.navigate('Planner')}
            enterDelay={400}
          />
        </View>

        {/* 5. 계획 세우기 (Blue) */}
        <View className="mt-6">
          <GroupSection
            dotColor="#3B82F6"
            title="계획 세우기"
            items={planItems}
            numColumns={3}
            enterDelay={500}
          />
        </View>

        {/* 6. 생각과 기억 (Violet) */}
        <View className="mt-6">
          <GroupSection
            dotColor="#8B5CF6"
            title="생각과 기억"
            items={thoughtItems}
            numColumns={3}
            enterDelay={600}
          />
        </View>

        {/* 7. 연락 추천 인라인 (Pink) */}
        <View className="mt-5">
          <ContactNudge recommendation={recommendation} enterDelay={700} />
        </View>

        {/* 8. 일상 돌보기 (Emerald) */}
        <View className="mt-6">
          <GroupSection
            dotColor="#22C55E"
            title="일상 돌보기"
            items={careItems}
            numColumns={2}
            enterDelay={800}
          />
        </View>

        {/* 9. 푸터 */}
        <Animated.View
          entering={FadeInDown.delay(900).duration(400)}
          className="items-center py-8 mt-4">
          <Sparkles size={20} color="#8B5CF6" />
          <Text className="text-xs text-gray-400 mt-2 text-center leading-4">
            오늘도 DayStep이 함께할게요
          </Text>
        </Animated.View>
      </ScrollView>
    </ScreenContainer>
  );
}
