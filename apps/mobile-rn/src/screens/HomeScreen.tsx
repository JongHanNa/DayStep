/**
 * Home Dashboard
 * 웹앱 "일상 관리 목차" 모바일 재해석
 * - Page 0: 인사 + 진행률 + 퀵 액션
 * - Page 1: 원동력 + 관계 배너
 */
import React, {useMemo} from 'react';
import {Text, View, ScrollView} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import Animated, {FadeInDown, FadeIn} from 'react-native-reanimated';
import {ScreenContainer, AnimatedCard} from '@/components/core';
import {GradientBackground} from '@/components/core';
import {ProgressRing} from '@/components/home/ProgressRing';
import {QuickActionGrid} from '@/components/home/QuickActionGrid';
import {SwipeablePages} from '@/components/core/SwipeablePages';
import {BannerPage} from '@/components/home/BannerPage';
import {useTodoStore} from '@/stores/todoStore';
import {format} from 'date-fns';
import {ko} from 'date-fns/locale';
import {Moon, Sun, CloudSun, ClipboardList, Zap, MessageCircle, Leaf} from 'lucide-react-native';

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

  const greeting = useMemo(() => getGreeting(), []);
  const today = format(new Date(), 'M월 d일 EEEE', {locale: ko});

  const completedCount = todos.filter(t => t.completed).length;
  const totalCount = todos.length;
  const progress = totalCount > 0 ? completedCount / totalCount : 0;

  const quickActions = useMemo(
    () => [
      {
        id: 'plan',
        icon: <ClipboardList size={24} color="#FFFFFF" />,
        title: '계획 세우기',
        subtitle: '오늘의 할일 정리',
        gradient: ['#3B82F6', '#2563EB'],
        onPress: () => navigation.navigate('Planner'),
      },
      {
        id: 'execute',
        icon: <Zap size={24} color="#FFFFFF" />,
        title: '실행하기',
        subtitle: '집중 모드 시작',
        gradient: ['#F97316', '#EA580C'],
        onPress: () => navigation.navigate('Execute'),
      },
      {
        id: 'notes',
        icon: <MessageCircle size={24} color="#FFFFFF" />,
        title: '생각과 기억',
        subtitle: '아이디어 기록',
        gradient: ['#8B5CF6', '#7C3AED'],
        onPress: () => navigation.navigate('Notes'),
      },
      {
        id: 'care',
        icon: <Leaf size={24} color="#FFFFFF" />,
        title: '일상 돌보기',
        subtitle: '소중한 일상',
        gradient: ['#22C55E', '#16A34A'],
        onPress: () => {},
      },
    ],
    [navigation],
  );

  const GreetingIcon = greeting.Icon;

  return (
    <ScreenContainer gradient="warmBackground">
      <SwipeablePages>
        {/* Page 0: 메인 목차 */}
        <ScrollView
          contentContainerStyle={{paddingBottom: 100}}
          showsVerticalScrollIndicator={false}>
          {/* 인사 + 날짜 */}
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

          {/* 진행률 카드 */}
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

          {/* 퀵 액션 그리드 */}
          <View className="mt-6">
            <Animated.Text
              entering={FadeInDown.delay(300).duration(400)}
              className="text-lg font-semibold text-gray-800 mb-3 px-4">
              바로 시작하기
            </Animated.Text>
            <View className="px-1">
              <QuickActionGrid actions={quickActions} />
            </View>
          </View>
        </ScrollView>

        {/* Page 1: 원동력 + 관계 배너 */}
        <BannerPage />
      </SwipeablePages>
    </ScreenContainer>
  );
}
