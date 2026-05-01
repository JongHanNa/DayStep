/**
 * Home Dashboard — SwipeablePages 리디자인
 * Page 0: 메인 허브 (인사 → 진행률 → 미션 → 3그룹 그리드)
 * Page 1: 영감 페이지 (원동력 → 관심 키우기 → 하루 한 줄)
 */
import React, {useCallback, useEffect, useMemo, useRef} from 'react';
import {Text, View, ScrollView, Dimensions} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useFocusRefetch} from '@/hooks/useFocusRefetch';
import {
  CoachmarkTarget,
  HOME_COACHMARK_STEPS,
  HOME_TARGET_IDS,
  useCoachmark,
  COACHMARK_VARIANT,
} from '@/components/coachmark';
import {CopilotTarget, useCopilot} from '@/components/coachmark-copilot';
import {useSettingsStore} from '@/stores/settingsStore';
import Animated, {
  FadeInDown,
  FadeIn,
  LinearTransition,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import {StyleSheet} from 'react-native';
import {ScreenContainer, AnimatedCard, SwipeablePages} from '@/components/core';
import {ProgressRing} from '@/components/home/ProgressRing';
import {MotivationCard} from '@/components/home/MotivationCard';
import {MissionCard} from '@/components/home/MissionCard';
import {GroupSection} from '@/components/home/GroupSection';
import type {FeatureItem} from '@/components/home/GroupSection';
import {ContactNudge} from '@/components/home/ContactNudge';
import {NativeProgressCardNative, isIOS26Plus} from '@/components/native';
import {springs} from '@/theme/animations';
import {useTodoStore} from '@/stores/todoStore';
import {useMotivationStore} from '@/stores/motivationStore';
import {useRotatingNote} from '@/hooks/useRotatingNote';
import {useCherishedPeopleStore} from '@/stores/cherishedPeopleStore';
import {useAuthStore} from '@/stores/authStore';
import {useDailyCheckInStore} from '@/stores/dailyCheckInStore';
import {format} from 'date-fns';
import {ko} from 'date-fns/locale';
import {
  Moon,
  Sun,
  CloudSun,
  Sparkles,
  Calendar,
  FolderKanban,
  Link,
  Lightbulb,
  PenLine,
  Trash2,
  Cpu,
  SprayCan,
  MessageSquare,
} from 'lucide-react-native';
import {useTheme} from '@/theme';

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
  const {primaryColor} = useTheme();
  const {todos, selectedDate, fetchTodosForDate} = useTodoStore();
  const user = useAuthStore(s => s.user);
  const {notes, fetchMotivationNotes} = useMotivationStore();
  const {recommendations, loadRecommendations} = useCherishedPeopleStore();
  const checkedCards = useDailyCheckInStore(s => s.checkedCards);
  const lastCheckDate = useDailyCheckInStore(s => s.lastCheckDate);
  const resetIfNewDay = useDailyCheckInStore(s => s.resetIfNewDay);

  // 코치마크: 첫 진입 시 자동 시작 (변형 A 또는 B)
  const hasSeenHomeOnboarding = useSettingsStore(s => s.hasSeenHomeOnboarding);
  const setHasSeenHomeOnboarding = useSettingsStore(s => s.setHasSeenHomeOnboarding);
  const {
    start: startCoachmark,
    active: coachmarkActive,
    currentStep: coachmarkStep,
    getTargetMeasure: getCoachmarkMeasure,
  } = useCoachmark();
  const {start: startCopilot, copilotEvents} = useCopilot();

  // 코치마크 step 변경 시 타겟이 화면 밖이면 자동 스크롤
  const mainScrollRef = useRef<ScrollView>(null);
  const scrollOffsetRef = useRef(0);
  useEffect(() => {
    if (!coachmarkActive || !coachmarkStep?.targetId) return;
    const measure = getCoachmarkMeasure(coachmarkStep.targetId);
    if (!measure) return;
    measure().then(rect => {
      if (!rect || !mainScrollRef.current) return;
      const screenH = Dimensions.get('window').height;
      // 타겟이 화면 상단 30% 위치에 오도록 계산 (헤더/푸터 회피)
      const desiredTop = screenH * 0.3;
      const delta = rect.y - desiredTop;
      if (Math.abs(delta) > 40) {
        const nextOffset = Math.max(0, scrollOffsetRef.current + delta);
        mainScrollRef.current.scrollTo({y: nextOffset, animated: true});
      }
    });
  }, [coachmarkStep, coachmarkActive, getCoachmarkMeasure]);

  useEffect(() => {
    if (hasSeenHomeOnboarding || coachmarkActive) return;
    const timer = setTimeout(() => {
      if (COACHMARK_VARIANT === 'A') {
        startCoachmark(HOME_COACHMARK_STEPS, () => {
          setHasSeenHomeOnboarding(true);
        });
      } else {
        startCopilot();
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [
    hasSeenHomeOnboarding,
    coachmarkActive,
    startCoachmark,
    startCopilot,
    setHasSeenHomeOnboarding,
  ]);

  // PoC B 종료 시 hasSeenHomeOnboarding 처리
  useEffect(() => {
    if (COACHMARK_VARIANT !== 'B') return;
    const handler = () => setHasSeenHomeOnboarding(true);
    copilotEvents?.on?.('stop', handler);
    return () => {
      copilotEvents?.off?.('stop', handler);
    };
  }, [copilotEvents, setHasSeenHomeOnboarding]);

  // 화면 포커스 시 todo + 부가 데이터 재조회
  useFocusRefetch(useCallback(() => {
    fetchTodosForDate(selectedDate);
    if (user?.id) {
      fetchMotivationNotes(user.id);
      loadRecommendations(user.id);
    }
    // 자정 넘었으면 일일 체크인 카드 모두 미확인으로 리셋 + 앱 아이콘 뱃지 갱신
    resetIfNewDay();
  }, [selectedDate, fetchTodosForDate, user?.id, fetchMotivationNotes, loadRecommendations, resetIfNewDay]));

  const greeting = useMemo(() => getGreeting(), []);
  const today = format(new Date(), 'M월 d일 EEEE', {locale: ko});
  // pinned 원동력이 있으면 그것만, 없으면 전체 노트 풀로 8초 간격 자동 회전
  const motivationPool = useMemo(() => {
    const pinned = notes.filter(n => n.is_banner_pinned === true);
    return pinned.length > 0 ? pinned : notes;
  }, [notes]);
  const motivationNote = useRotatingNote(motivationPool, 8000);

  const completedCount = todos.filter(t => t.completed).length;
  const totalCount = todos.length;
  const progress = totalCount > 0 ? completedCount / totalCount : 0;

  const GreetingIcon = greeting.Icon;

  // 네이티브 진행률 카드 높이 애니메이션
  const progressCardHeight = useSharedValue(120);
  const progressCardHeightStyle = useAnimatedStyle(() => ({
    height: progressCardHeight.value,
    overflow: 'hidden' as const,
  }));

  // 영감 문구 (날짜 기반 고정)
  const inspirationQuote = useMemo(() => {
    const dayIndex = new Date().getDate() % INSPIRATION_QUOTES.length;
    return INSPIRATION_QUOTES[dayIndex];
  }, []);

  // ── 그룹 아이템 정의 (Lucide 아이콘 + 설명) ──

  const PRIMARY_BG = primaryColor + '15';

  const planItems: FeatureItem[] = useMemo(
    () => [
      {
        id: 'daily-planner',
        icon: <Calendar size={20} color={primaryColor} />,
        label: '하루 계획하기',
        description: '오늘 할일을 시간별로 배치',
        iconBgColor: PRIMARY_BG,
        iconColor: primaryColor,
        onPress: () => navigation.navigate('Planner', {initialPage: 0}),
        unchecked: !checkedCards['daily-planner'],
      },
      {
        id: 'projects',
        icon: <FolderKanban size={20} color={primaryColor} />,
        label: '내 계획 보기',
        description: '프로젝트 목록과 진행 상황 확인',
        iconBgColor: PRIMARY_BG,
        iconColor: primaryColor,
        onPress: () => navigation.navigate('Projects'),
        unchecked: !checkedCards['projects'],
      },
      {
        id: 'ai-chat',
        icon: <Sparkles size={20} color={primaryColor} />,
        label: 'AI로 계획하기',
        description: 'AI와 대화하며 할일 계획',
        iconBgColor: PRIMARY_BG,
        iconColor: primaryColor,
        onPress: () => navigation.navigate('AIChat'),
        unchecked: !checkedCards['ai-chat'],
      },
      {
        id: 'guide',
        icon: <Link size={20} color={primaryColor} />,
        label: 'Claude 연결하기',
        description: 'Claude Desktop 연결',
        iconBgColor: PRIMARY_BG,
        iconColor: primaryColor,
        onPress: () => navigation.navigate('Guide'),
        unchecked: !checkedCards['guide'],
      },
      {
        id: 'data-cleanup',
        icon: <Trash2 size={20} color={primaryColor} />,
        label: '데이터 정리하기',
        description: '할일·프로젝트·원동력 등을 정리해 공간 확보',
        iconBgColor: PRIMARY_BG,
        iconColor: primaryColor,
        onPress: () => navigation.navigate('Cleanup'),
        unchecked: !checkedCards['data-cleanup'],
      },
    ],
    [navigation, primaryColor, checkedCards, lastCheckDate],
  );

  const thoughtItems: FeatureItem[] = useMemo(
    () => [
      {
        id: 'motivation',
        icon: <Lightbulb size={20} color={primaryColor} />,
        label: '원동력 새기기',
        description: '왜 해야 하는지 기록',
        iconBgColor: PRIMARY_BG,
        iconColor: primaryColor,
        onPress: () => navigation.navigate('Notes'),
        unchecked: !checkedCards['motivation'],
      },
      {
        id: 'record',
        icon: <PenLine size={20} color={primaryColor} />,
        label: '관심 키우기',
        description: '소중한 만남과 대화 기록',
        iconBgColor: PRIMARY_BG,
        iconColor: primaryColor,
        onPress: () => navigation.navigate('Care'),
        unchecked: !checkedCards['record'],
      },
    ],
    [navigation, primaryColor, checkedCards, lastCheckDate],
  );

  const careItems: FeatureItem[] = useMemo(
    () => [
      {
        id: 'sleep',
        icon: <Moon size={20} color={primaryColor} />,
        label: '수면 정원',
        description: '수면 세션으로 나무를 키워요',
        iconBgColor: PRIMARY_BG,
        iconColor: primaryColor,
        onPress: () => navigation.navigate('SleepGarden'),
        unchecked: !checkedCards['sleep'],
      },
      {
        id: 'adhd-understanding',
        icon: <Cpu size={20} color={primaryColor} />,
        label: 'ADHD 이해하기',
        description: '뇌 과학으로 나를 이해하기',
        iconBgColor: PRIMARY_BG,
        iconColor: primaryColor,
        onPress: () => navigation.navigate('ADHDUnderstanding'),
        unchecked: !checkedCards['adhd-understanding'],
      },
      {
        id: 'cleaning',
        icon: <SprayCan size={20} color={primaryColor} />,
        label: '청소/정리하기',
        description: '오늘의 구역 마이크로 청소',
        iconBgColor: PRIMARY_BG,
        iconColor: primaryColor,
        onPress: () => navigation.navigate('Cleaning'),
        unchecked: !checkedCards['cleaning'],
      },
    ],
    [navigation, primaryColor, checkedCards, lastCheckDate],
  );

  const supportItems: FeatureItem[] = useMemo(
    () => [
      {
        id: 'feedback-board',
        icon: <MessageSquare size={20} color={primaryColor} />,
        label: '버그 신고 & 기능 요청',
        description: '개발팀에 직접 전달돼요',
        iconBgColor: PRIMARY_BG,
        iconColor: primaryColor,
        onPress: () => navigation.navigate('FeedbackBoard'),
        unchecked: !checkedCards['feedback-board'],
      },
    ],
    [navigation, primaryColor, checkedCards, lastCheckDate],
  );

  return (
    <ScreenContainer gradient="warmBackground">
      <SwipeablePages>
        {/* ═══ Page 0: 메인 허브 ═══ */}
        <ScrollView
          ref={mainScrollRef}
          onScroll={e => {
            scrollOffsetRef.current = e.nativeEvent.contentOffset.y;
          }}
          scrollEventThrottle={16}
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
          <CoachmarkTarget id={HOME_TARGET_IDS.progress} style={{paddingHorizontal: 16, marginTop: 16}}>
            <CopilotTarget order={1} i18nKey="onboarding.home.progress" name="progress">
              {isIOS26Plus ? (
              <Animated.View entering={FadeInDown.delay(200).duration(400)}>
                <Animated.View style={progressCardHeightStyle}>
                  <NativeProgressCardNative
                    completed={completedCount}
                    total={totalCount}
                    progress={progress}
                    primaryColor={primaryColor}
                    onHeightChange={e => {
                      progressCardHeight.value = withSpring(
                        e.nativeEvent.height,
                        springs.nativeGlass,
                      );
                    }}
                    style={StyleSheet.absoluteFill}
                  />
                </Animated.View>
              </Animated.View>
            ) : (
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
                          className="h-full rounded-full"
                          style={{backgroundColor: primaryColor, width: `${Math.round(progress * 100)}%`}}
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
            )}
            </CopilotTarget>
          </CoachmarkTarget>

          {/* 3. 오늘의 미션 */}
          <CoachmarkTarget id={HOME_TARGET_IDS.mission} style={{marginTop: 20}}>
            <CopilotTarget order={2} i18nKey="onboarding.home.mission" name="mission">
              <MissionCard
                todos={todos}
                onNavigateToExecute={() => navigation.navigate('Execute')}
                onNavigateToPlanner={() => navigation.navigate('Planner')}
                enterDelay={300}
              />
            </CopilotTarget>
          </CoachmarkTarget>

          {/* 4. 일상 돌보기 (Emerald) */}
          <CoachmarkTarget id={HOME_TARGET_IDS.dailyCare} style={{marginTop: 24}}>
            <CopilotTarget order={3} i18nKey="onboarding.home.dailyCare" name="dailyCare">
              <GroupSection
                dotColor={primaryColor}
                title="일상 돌보기"
                items={careItems}
                enterDelay={400}
              />
            </CopilotTarget>
          </CoachmarkTarget>

          {/* 5. 계획 세우기 (Blue) */}
          <CoachmarkTarget id={HOME_TARGET_IDS.planning} style={{marginTop: 24}}>
            <CopilotTarget order={4} i18nKey="onboarding.home.planning" name="planning">
              <GroupSection
                dotColor={primaryColor}
                title="계획 세우기"
                items={planItems}
                enterDelay={500}
              />
            </CopilotTarget>
          </CoachmarkTarget>

          {/* 6. 생각과 기억 (Violet) */}
          <CoachmarkTarget id={HOME_TARGET_IDS.thoughts} style={{marginTop: 24}}>
            <CopilotTarget order={5} i18nKey="onboarding.home.thoughts" name="thoughts">
              <GroupSection
                dotColor={primaryColor}
                title="생각과 기억"
                items={thoughtItems}
                enterDelay={600}
              />
            </CopilotTarget>
          </CoachmarkTarget>

          {/* 7. 지원 & 피드백 */}
          <View className="mt-6">
            <GroupSection
              dotColor={primaryColor}
              title="지원 & 피드백"
              items={supportItems}
              enterDelay={700}
            />
          </View>

        </ScrollView>

        {/* ═══ Page 1: 영감 (peek으로 살짝 노출) ═══ */}
        <ScrollView
          contentContainerStyle={{paddingBottom: 100, paddingTop: 16}}
          showsVerticalScrollIndicator={false}>
          {/* 1. 하루 한 줄 영감 */}
          <Animated.View
            layout={LinearTransition.springify()
              .damping(25)
              .stiffness(247)
              .mass(1)}
            entering={FadeInDown.delay(100).duration(400)}
            className="mx-4 items-center">
            <Text className="text-base text-gray-600 mt-3 text-center leading-6 italic">
              "{inspirationQuote}"
            </Text>
            <Text className="text-xs text-gray-400 mt-2">
              오늘의 한 줄
            </Text>
          </Animated.View>

          {/* 2. 원동력 카드 */}
          <View className="px-4 mt-6">
            <MotivationCard note={motivationNote} enterDelay={200} />
          </View>

          {/* 3. 관심 키우기 */}
          <Animated.View
            layout={LinearTransition.springify()
              .damping(25)
              .stiffness(247)
              .mass(1)}
            className="mt-6">
            <ContactNudge
              recommendations={recommendations}
              enterDelay={300}
              onContactPress={(personName) => navigation.navigate('Care', {personName})}
            />
          </Animated.View>
        </ScrollView>
      </SwipeablePages>
    </ScreenContainer>
  );
}
