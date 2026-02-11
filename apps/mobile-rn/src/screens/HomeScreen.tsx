/**
 * Home Dashboard
 * 웹앱 "일상 관리 목차" 모바일 재해석
 * - 시간대 인사 + 원동력/관계 카드 + 퀵 액션 + 진행률
 */
import React, {useMemo} from 'react';
import {Text, View, ScrollView} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import Animated, {FadeInDown, FadeIn} from 'react-native-reanimated';
import {ScreenContainer, AnimatedCard} from '@/components/core';
import {GradientBackground} from '@/components/core';
import {ProgressRing} from '@/components/home/ProgressRing';
import {QuickActionGrid} from '@/components/home/QuickActionGrid';
import {useTodoStore} from '@/stores/todoStore';
import {format} from 'date-fns';
import {ko} from 'date-fns/locale';

function getGreeting(): {text: string; emoji: string; gradient: string[]} {
  const hour = new Date().getHours();
  if (hour < 6) return {text: '아직 이른 새벽이에요', emoji: '🌙', gradient: ['#1E1B4B', '#312E81']};
  if (hour < 12) return {text: '좋은 아침이에요', emoji: '☀️', gradient: ['#FEF3C7', '#FDE68A']};
  if (hour < 18) return {text: '좋은 오후예요', emoji: '🌤', gradient: ['#DBEAFE', '#93C5FD']};
  return {text: '편안한 저녁이에요', emoji: '🌙', gradient: ['#EDE9FE', '#C4B5FD']};
}

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const {todos} = useTodoStore();

  const greeting = useMemo(() => getGreeting(), []);
  const today = format(new Date(), 'M월 d일 EEEE', {locale: ko});

  const completedCount = todos.filter(t => t.completed).length;
  const totalCount = todos.length;
  const progress = totalCount > 0 ? completedCount / totalCount : 0;

  const quickActions = useMemo(
    () => [
      {
        id: 'plan',
        icon: '📋',
        title: '계획 세우기',
        subtitle: '오늘의 할일 정리',
        gradient: ['#3B82F6', '#2563EB'],
        onPress: () => navigation.navigate('Planner'),
      },
      {
        id: 'execute',
        icon: '⚡',
        title: '실행하기',
        subtitle: '집중 모드 시작',
        gradient: ['#F97316', '#EA580C'],
        onPress: () => navigation.navigate('Execute'),
      },
      {
        id: 'notes',
        icon: '💭',
        title: '생각과 기억',
        subtitle: '아이디어 기록',
        gradient: ['#8B5CF6', '#7C3AED'],
        onPress: () => navigation.navigate('Notes'),
      },
      {
        id: 'care',
        icon: '🌿',
        title: '일상 돌보기',
        subtitle: '소중한 일상',
        gradient: ['#22C55E', '#16A34A'],
        onPress: () => {},
      },
    ],
    [navigation],
  );

  return (
    <ScreenContainer gradient="warmBackground">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{paddingBottom: 100}}
        showsVerticalScrollIndicator={false}>
        {/* 인사 + 날짜 */}
        <View className="px-5 pt-4 pb-2">
          <Animated.Text
            entering={FadeIn.duration(600)}
            className="text-sm text-gray-500 mb-1">
            {today}
          </Animated.Text>
          <Animated.Text
            entering={FadeInDown.delay(100).duration(500)}
            className="text-3xl font-bold text-gray-900">
            {greeting.text} {greeting.emoji}
          </Animated.Text>
        </View>

        {/* 진행률 카드 */}
        <View className="px-5 mt-4">
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

        {/* 원동력 카드 (따뜻한 그라디언트) */}
        <View className="px-5 mt-4">
          <Animated.View entering={FadeInDown.delay(300).duration(400)}>
            <GradientBackground
              colors={['#FEF3C7', '#FDE68A', '#FBBF24']}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 1}}
              style={{borderRadius: 16, padding: 20}}>
              <Text className="text-lg font-semibold text-amber-900 mb-1">
                🔥 오늘의 원동력
              </Text>
              <Text className="text-sm text-amber-800/80">
                무엇이 오늘 하루를 움직이게 하나요?{'\n'}
                Fuel 모드에서 나만의 원동력을 찾아보세요
              </Text>
            </GradientBackground>
          </Animated.View>
        </View>

        {/* 관계 리마인더 카드 */}
        <View className="px-5 mt-3">
          <Animated.View entering={FadeInDown.delay(400).duration(400)}>
            <GradientBackground
              colors={['#FCE7F3', '#FBCFE8', '#F9A8D4']}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 1}}
              style={{borderRadius: 16, padding: 20}}>
              <Text className="text-lg font-semibold text-pink-900 mb-1">
                💕 소중한 사람
              </Text>
              <Text className="text-sm text-pink-800/80">
                오랫동안 연락하지 못한 사람이 있나요?{'\n'}
                돌봄 모드에서 관계를 가꿔보세요
              </Text>
            </GradientBackground>
          </Animated.View>
        </View>

        {/* 퀵 액션 그리드 */}
        <View className="px-5 mt-6">
          <Animated.Text
            entering={FadeInDown.delay(500).duration(400)}
            className="text-lg font-semibold text-gray-800 mb-3">
            바로 시작하기
          </Animated.Text>
          <QuickActionGrid actions={quickActions} />
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
