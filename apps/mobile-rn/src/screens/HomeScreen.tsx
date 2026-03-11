/**
 * Home Dashboard — SwipeablePages 리디자인
 * Page 0: 메인 허브 (인사 → 진행률 → 미션 → 3그룹 그리드)
 * Page 1: 영감 페이지 (원동력 → 연락할 사람 → 하루 한 줄)
 */
import React, {useCallback, useMemo} from 'react';
import {Text, View, ScrollView} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useFocusRefetch} from '@/hooks/useFocusRefetch';
import Animated, {FadeInDown, FadeIn, LinearTransition} from 'react-native-reanimated';
import {ScreenContainer, AnimatedCard, SwipeablePages} from '@/components/core';
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
import {
  Moon,
  Sun,
  CloudSun,
  Sparkles,
  Calendar,
  CalendarRange,
  FolderKanban,
  Link,
  Lightbulb,
  PenLine,
  MessageCircle,
  Heart,
  BarChart3,
  Trash2,
} from 'lucide-react-native';
import {SCREEN_REGISTRY} from '@daystep/shared-core/constants';

function getGreeting(): {text: string; Icon: React.FC<any>; gradient: string[]} {
  const hour = new Date().getHours();
  if (hour < 6)
    return {
      text: '아직 이른 새벽이에요',
      Icon: Moon,
      gradient: ['#1E1B4B', '#312E81'],
    };
  if (hour < 12)
    return {
      text: '좋은 아침이에요',
      Icon: Sun,
      gradient: ['#FEF3C7', '#FDE68A'],
    };
  if (hour < 18)
    return {
      text: '좋은 오후예요',
      Icon: CloudSun,
      gradient: ['#DBEAFE', '#93C5FD'],
    };
  return {
    text: '편안한 저녁이에요',
    Icon: Moon,
    gradient: ['#EDE9FE', '#C4B5FD'],
  };
}

// 영감 문구 목록
const INSPIRATION_QUOTES = [
  '작은 한 걸음이 큰 변화를 만듭니다.',
  '오늘의 나를 위해 할 수 있는 가장 좋은 일을 하세요.',
  '완벽하지 않아도 괜찮아요. 시작한 것만으로 충분해요.',
  '당신의 속도로 괜찮습니다.',
  '어제보다 오늘 더 나은 내가 되는 것, 그것으로 충분합니다.',
];

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const {todos, selectedDate, fetchTodosForDate} = useTodoStore();
  const user = useAuthStore(s => s.user);
  const {notes, fetchFuelNotes, getRandomFuelNote} = useNoteStore();
  const {recommendations, loadRecommendations} = useCherishedPeopleStore();

  // 화면 포커스 시 todo + 부가 데이터 재조회
  useFocusRefetch(useCallback(() => {
    fetchTodosForDate(selectedDate);
    if (user?.id) {
      fetchFuelNotes(user.id);
      loadRecommendations(user.id);
    }
  }, [selectedDate, fetchTodosForDate, user?.id, fetchFuelNotes, loadRecommendations]));

  const greeting = useMemo(() => getGreeting(), []);
  const today = format(new Date(), 'M월 d일 EEEE', {locale: ko});
  const fuelNote = useMemo(() => getRandomFuelNote(), [notes]);

  const completedCount = todos.filter(t => t.completed).length;
  const totalCount = todos.length;
  const progress = totalCount > 0 ? completedCount / totalCount : 0;

  const GreetingIcon = greeting.Icon;

  // 영감 문구 (날짜 기반 고정)
  const inspirationQuote = useMemo(() => {
    const dayIndex = new Date().getDate() % INSPIRATION_QUOTES.length;
    return INSPIRATION_QUOTES[dayIndex];
  }, []);

  // ── 그룹 아이템 정의 (Lucide 아이콘 + 설명) ──

  const BLUE_BG = '#EFF6FF';
  const BLUE_ICON = '#3B82F6';
  const VIOLET_BG = '#F5F3FF';
  const VIOLET_ICON = '#8B5CF6';
  const EMERALD_BG = '#ECFDF5';
  const EMERALD_ICON = '#22C55E';

  const planItems: FeatureItem[] = useMemo(
    () => [
      {
        id: 'daily-planner',
        icon: <Calendar size={20} color={BLUE_ICON} />,
        label: '하루 계획하기',
        description: '오늘 할일을 시간별로 배치',
        iconBgColor: BLUE_BG,
        iconColor: BLUE_ICON,
        onPress: () => navigation.navigate('Planner', {initialPage: 0}),
      },
      {
        id: 'monthly-planner',
        icon: <CalendarRange size={20} color={BLUE_ICON} />,
        label: '월간 계획하기',
        description: '한 달 일정을 한눈에 보기',
        iconBgColor: BLUE_BG,
        iconColor: BLUE_ICON,
        onPress: () => navigation.navigate('MonthlyPlanner'),
      },
      {
        id: 'ai-plan',
        icon: <FolderKanban size={20} color={BLUE_ICON} />,
        label: '내 계획 보기',
        description: '프로젝트 목록과 진행 상황 확인',
        iconBgColor: BLUE_BG,
        iconColor: BLUE_ICON,
        onPress: () => navigation.navigate('AIPlan'),
      },
      {
        id: 'ai-chat',
        icon: <Sparkles size={20} color={BLUE_ICON} />,
        label: 'AI로 계획하기',
        description: 'AI와 대화하며 할일 계획',
        iconBgColor: BLUE_BG,
        iconColor: BLUE_ICON,
        onPress: () => navigation.navigate('AIChat'),
      },
      {
        id: 'guide',
        icon: <Link size={20} color={BLUE_ICON} />,
        label: 'Claude 연결하기',
        description: 'Claude Desktop 연결',
        iconBgColor: BLUE_BG,
        iconColor: BLUE_ICON,
        onPress: () => navigation.navigate('Guide'),
      },
      {
        id: 'data-cleanup',
        icon: <Trash2 size={20} color={BLUE_ICON} />,
        label: '데이터 정리하기',
        description: '할일·프로젝트·원동력 등을 정리해 공간 확보',
        iconBgColor: BLUE_BG,
        iconColor: BLUE_ICON,
        onPress: () => navigation.navigate('Cleanup'),
      },
    ],
    [navigation],
  );

  const thoughtItems: FeatureItem[] = useMemo(
    () => [
      {
        id: 'motivation',
        icon: <Lightbulb size={20} color={VIOLET_ICON} />,
        label: '원동력 새기기',
        description: '왜 해야 하는지 기록',
        iconBgColor: VIOLET_BG,
        iconColor: VIOLET_ICON,
        onPress: () => navigation.navigate('Notes'),
      },
      {
        id: 'record',
        icon: <PenLine size={20} color={VIOLET_ICON} />,
        label: '관계 기록하기',
        description: '소중한 만남과 대화 기록',
        iconBgColor: VIOLET_BG,
        iconColor: VIOLET_ICON,
        onPress: () => navigation.navigate('Record'),
      },
      {
        id: 'news',
        icon: <MessageCircle size={20} color={VIOLET_ICON} />,
        label: '소식 챙기기',
        description: '소식 흐름 시간순 보기',
        iconBgColor: VIOLET_BG,
        iconColor: VIOLET_ICON,
        onPress: () => navigation.navigate('News'),
        isPro: SCREEN_REGISTRY.news.isPro,
      },
    ],
    [navigation],
  );

  const careItems: FeatureItem[] = useMemo(
    () => [
      {
        id: 'gratitude',
        icon: <Heart size={20} color={EMERALD_ICON} />,
        label: '감사 기록하기',
        description: '감사한 순간 기록',
        iconBgColor: EMERALD_BG,
        iconColor: EMERALD_ICON,
        onPress: () => navigation.navigate('Gratitude'),
        isPro: SCREEN_REGISTRY.gratitude.isPro,
      },
      {
        id: 'activity',
        icon: <BarChart3 size={20} color={EMERALD_ICON} />,
        label: '활동 살펴보기',
        description: '활동 패턴과 생산성 분석',
        iconBgColor: EMERALD_BG,
        iconColor: EMERALD_ICON,
        onPress: () => navigation.navigate('Activity'),
        isPro: SCREEN_REGISTRY.activity.isPro,
      },
    ],
    [navigation],
  );

  return (
    <ScreenContainer gradient="warmBackground">
      <SwipeablePages>
        {/* ═══ Page 0: 메인 허브 ═══ */}
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

          {/* 3. 오늘의 미션 */}
          <View className="mt-5">
            <MissionCard
              todos={todos}
              onNavigateToExecute={() => navigation.navigate('Execute')}
              onNavigateToPlanner={() => navigation.navigate('Planner')}
              enterDelay={300}
            />
          </View>

          {/* 4. 계획 세우기 (Blue) */}
          <View className="mt-6">
            <GroupSection
              dotColor="#3B82F6"
              title="계획 세우기"
              items={planItems}
              enterDelay={400}
            />
          </View>

          {/* 5. 생각과 기억 (Violet) */}
          <View className="mt-6">
            <GroupSection
              dotColor="#8B5CF6"
              title="생각과 기억"
              items={thoughtItems}
              enterDelay={500}
            />
          </View>

          {/* 6. 일상 돌보기 (Emerald) */}
          <View className="mt-6">
            <GroupSection
              dotColor="#22C55E"
              title="일상 돌보기"
              items={careItems}
              enterDelay={600}
            />
          </View>

          {/* 7. 푸터 */}
          <Animated.View
            entering={FadeInDown.delay(700).duration(400)}
            className="items-center py-8 mt-4">
            <Sparkles size={20} color="#8B5CF6" />
            <Text className="text-xs text-gray-400 mt-2 text-center leading-4">
              오늘도 DayStep이 함께할게요
            </Text>
          </Animated.View>
        </ScrollView>

        {/* ═══ Page 1: 영감 (peek으로 살짝 노출) ═══ */}
        <ScrollView
          contentContainerStyle={{paddingBottom: 100, paddingTop: 16}}
          showsVerticalScrollIndicator={false}>
          {/* 1. 원동력 카드 */}
          <View className="px-4">
            <FuelCard note={fuelNote} enterDelay={100} />
          </View>

          {/* 2. 연락할 사람 */}
          <Animated.View
            layout={LinearTransition.springify()
              .damping(25)
              .stiffness(247)
              .mass(1)}
            className="mt-6">
            <ContactNudge
              recommendations={recommendations}
              enterDelay={200}
            />
          </Animated.View>

          {/* 3. 하루 한 줄 영감 */}
          <Animated.View
            layout={LinearTransition.springify()
              .damping(25)
              .stiffness(247)
              .mass(1)}
            entering={FadeInDown.delay(300).duration(400)}
            className="mx-4 mt-8 items-center">
            <Sparkles size={24} color="#8B5CF6" />
            <Text className="text-base text-gray-600 mt-3 text-center leading-6 italic">
              "{inspirationQuote}"
            </Text>
            <Text className="text-xs text-gray-400 mt-2">
              오늘의 한 줄
            </Text>
          </Animated.View>
        </ScrollView>
      </SwipeablePages>
    </ScreenContainer>
  );
}
