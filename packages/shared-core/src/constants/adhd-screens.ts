import {
  Flag,
  Users,
  BarChart3,
  Sparkles,
  MessageSquare,
  BookOpen,
  Calendar,
  Target,
  Lightbulb,
  Inbox,
  PenLine,
  MessageCircle,
  Heart,
  Moon,
  Brain,
  type LucideIcon,
} from 'lucide-react';

// ============================================================================
// 타입 정의
// ============================================================================

/** UI 그룹 ID (목차에 표시되는 그룹) */
export type ADHDGroupId = 'memory' | 'care' | 'project';

/** 라우트 그룹 ID (실제 URL 경로에 사용되는 그룹) */
export type ADHDRouteGroupId = 'dashboard' | 'project' | 'motivation' | 'relationship';

export type ADHDSubViewId =
  | 'banner'
  | 'contact'
  | 'activity'
  | 'ai-plan'
  | 'ai-chat'
  | 'guide'
  | 'timeline'
  | 'execute'
  | 'motivation'
  | 'organize'
  | 'record'
  | 'news'
  | 'gratitude'
  | 'sleepRecord'
  | 'adhdUnderstanding';

export interface ADHDScreenHelp {
  title: string;
  difficulty: string;
  help: string;
}

export interface ADHDScreenItem {
  id: ADHDSubViewId;
  label: string;
  icon: LucideIcon;
  isPro?: boolean;
  help?: ADHDScreenHelp;
  /** 실제 라우팅에 사용되는 그룹 (폴더 구조 기반) */
  routeGroup: ADHDRouteGroupId;
}

export interface ADHDScreenGroup {
  id: ADHDGroupId;
  title: string;
  items: ADHDScreenItem[];
}

// ============================================================================
// 유연한 아키텍처를 위한 추가 타입
// ============================================================================

/**
 * 화면 정의 (Screen Registry용)
 * 화면을 그룹에서 독립적으로 정의
 */
export interface ScreenDefinition {
  id: ADHDSubViewId;
  label: string;
  icon: LucideIcon;
  isPro?: boolean;
  help?: ADHDScreenHelp;
  /** 컴포넌트 경로 (동적 import용) */
  componentPath: string;
}

/**
 * UI 그룹 설정 (메뉴에 표시되는 그룹)
 * 화면 이동 시 이 설정만 변경하면 됨
 */
export interface UIGroupConfig {
  id: ADHDGroupId;
  title: string;
  screenIds: ADHDSubViewId[];
}

/**
 * 라우트 그룹 설정 (URL 경로용)
 */
export interface RouteGroupConfig {
  id: ADHDRouteGroupId;
  basePath: string;
  screenIds: ADHDSubViewId[];
}

// ============================================================================
// 화면 레지스트리 (Screen Registry) - 모든 화면의 메타데이터
// 화면을 그룹에 독립적으로 정의하여 유연한 구조 제공
// ============================================================================

export const SCREEN_REGISTRY: Record<ADHDSubViewId, ScreenDefinition> = {
  motivation: {
    id: 'motivation',
    label: '원동력 새기기',
    icon: Lightbulb,
    componentPath: 'screens/motivation/MotivationScreen',
    help: {
      title: '원동력 새기기',
      difficulty:
        '동기 유지 결함(Motivation Deficit). 중요한 건 알지만 하고 싶은 마음이 안 생겨요.',
      help: '왜 해야 하는지, 완료 후 기분을 미리 적어두고 → 실행 전 다시 보며 동기 충전!',
    },
  },
  record: {
    id: 'record',
    label: '관계 기록하기',
    icon: PenLine,
    componentPath: 'screens/record/RecordScreen',
    help: {
      title: '관계 기록하기',
      difficulty:
        '작업기억(Working Memory) 결함으로 대화 내용, 약속, 부탁 등을 쉽게 잊어버립니다. "들었는데 기억이 안 나요"',
      help: '만남 직후 바로 기록 → 외부 기억 저장소 역할. 부탁/약속을 할일로 연동하여 잊어버림 방지!',
    },
  },
  news: {
    id: 'news',
    label: '소식 챙기기',
    icon: MessageCircle,
    isPro: true,
    componentPath: 'screens/news/NewsScreen',
    help: {
      title: '소식 챙기기',
      difficulty:
        '시간 감각 왜곡(Time Blindness)으로 "언제 연락했더라?" 추적이 어렵습니다. 관계 소홀 인식이 늦어요.',
      help: '기록된 소식을 시간순 조회 → 연락 빈도 시각화, 소홀한 관계 파악에 도움!',
    },
  },
  contact: {
    id: 'contact',
    label: '연락 돌아보기',
    icon: Users,
    isPro: true,
    componentPath: 'screens/contact/ContactScreen',
  },
  gratitude: {
    id: 'gratitude',
    label: '감사 기록하기',
    icon: Heart,
    isPro: true,
    componentPath: 'screens/gratitude/GratitudeScreen',
    help: {
      title: '감사 기록하기',
      difficulty:
        '부정 편향(Negativity Bias) 강화. 감정 조절 어려움으로 좌절감에 쉽게 압도됩니다.',
      help: '감사한 순간 기록 → 긍정 경험 의도적 회상, 정서 균형 회복에 도움!',
    },
  },
  timeline: {
    id: 'timeline',
    label: '달력',
    icon: Calendar,
    componentPath: 'screens/timeline/TimelineScreen',
    help: {
      title: '달력',
      difficulty:
        '자기 모니터링(Self-Monitoring) 결함. "내가 뭘 했지?" 파악이 어렵습니다.',
      help: '완료한 할일 시간순 시각화 → 작은 성취도 눈에 보임, 자기효능감 강화!',
    },
  },
  activity: {
    id: 'activity',
    label: '활동 살펴보기',
    icon: BarChart3,
    isPro: true,
    componentPath: 'screens/activity/ActivityScreen',
  },
  banner: {
    id: 'banner',
    label: '마음 깨우기',
    icon: Flag,
    componentPath: 'screens/banner/BannerScreen',
  },
  execute: {
    id: 'execute',
    label: '집중 실행하기',
    icon: Target,
    componentPath: 'screens/execute/ExecuteScreen',
    help: {
      title: '집중 실행하기',
      difficulty:
        '과제 시작의 어려움(Task Initiation). 해야 할 건 알지만 시작 버튼이 안 눌려요.',
      help: '타이머 + 방해차단 + 원동력 상기 → 시작의 마찰을 줄여 첫 발을 내딛도록 도움!',
    },
  },
  organize: {
    id: 'organize',
    label: '할일 정리하기',
    icon: Inbox,
    componentPath: 'screens/organize/OrganizeScreen',
    help: {
      title: '할일 정리하기',
      difficulty:
        '조직화 결함. 머릿속이 복잡하고 할일이 뒤엉켜 어디서 시작할지 막막해요.',
      help: '미분류 할일만 모아서 표시 → 정리해야 할 것만 집중, 인지 부하 감소!',
    },
  },
  'ai-plan': {
    id: 'ai-plan',
    label: 'AI로 계획하기',
    icon: Sparkles,
    componentPath: 'screens/ai-plan/AIPlanScreen',
  },
  'ai-chat': {
    id: 'ai-chat',
    label: 'AI와 대화하기',
    icon: MessageSquare,
    componentPath: 'screens/ai-chat/AIChatScreen',
  },
  guide: {
    id: 'guide',
    label: '사용법 배우기',
    icon: BookOpen,
    componentPath: 'screens/guide/GuideScreen',
  },
  sleepRecord: {
    id: 'sleepRecord',
    label: '수면 기록하기',
    icon: Moon,
    componentPath: 'screens/SleepRecordScreen',
    help: {
      title: '수면 기록하기',
      difficulty:
        '시간 감각 왜곡(Time Blindness)과 수면 위생 관리 어려움. 불규칙한 수면 패턴이 ADHD 증상을 악화시킵니다.',
      help: '매일 취침·기상 시간을 기록하고 월간 패턴을 시각화 → 수면 습관 개선의 첫 걸음!',
    },
  },
  adhdUnderstanding: {
    id: 'adhdUnderstanding',
    label: 'ADHD 이해하기',
    icon: Brain,
    componentPath: 'screens/ADHDUnderstandingScreen',
    help: {
      title: 'ADHD 이해하기',
      difficulty:
        'ADHD에 대한 이해 부족. 왜 그런지 모르면 자신을 탓하게 됩니다.',
      help: '뇌 과학 기반으로 ADHD 특성을 이해하고, 자기 이해를 통해 실천 가능한 전략을 찾아보세요!',
    },
  },
};

// ============================================================================
// UI 그룹 설정 - 사용자에게 보이는 메뉴 구조
// 화면 이동 시 여기만 수정하면 됨
// ============================================================================

export const UI_GROUPS: UIGroupConfig[] = [
  {
    id: 'memory',
    title: '생각과 기억',
    screenIds: ['motivation', 'record', 'news', 'contact'],
  },
  {
    id: 'care',
    title: '일상 돌보기',
    screenIds: ['gratitude', 'timeline', 'activity', 'sleepRecord'],
  },
  {
    id: 'project',
    title: '계획 세우기',
    screenIds: ['banner', 'execute', 'organize', 'ai-plan', 'ai-chat', 'guide', 'adhdUnderstanding'],
  },
];

// ============================================================================
// 라우트 그룹 설정 - URL 경로용
// ============================================================================

export const ROUTE_GROUPS: RouteGroupConfig[] = [
  {
    id: 'dashboard',
    basePath: '/adhd/dashboard',
    screenIds: ['banner', 'contact', 'activity'],
  },
  {
    id: 'motivation',
    basePath: '/adhd/motivation',
    screenIds: ['motivation', 'timeline', 'execute', 'organize'],
  },
  {
    id: 'relationship',
    basePath: '/adhd/relationship-insights',
    screenIds: ['record', 'news', 'gratitude'],
  },
  {
    id: 'project',
    basePath: '/adhd/project',
    screenIds: ['ai-plan', 'ai-chat', 'guide', 'adhdUnderstanding'],
  },
];

// ============================================================================
// 화면 데이터 (기존 구조 - 하위 호환성 유지)
// UI_GROUPS와 SCREEN_REGISTRY에서 파생
// ============================================================================

export const ADHD_SCREENS: Record<ADHDGroupId, ADHDScreenGroup> = {
  memory: {
    id: 'memory',
    title: '생각과 기억',
    items: [
      {
        id: 'motivation',
        label: '원동력 새기기',
        icon: Lightbulb,
        routeGroup: 'motivation',
        help: {
          title: '원동력 새기기',
          difficulty:
            '동기 유지 결함(Motivation Deficit). 중요한 건 알지만 하고 싶은 마음이 안 생겨요.',
          help: '왜 해야 하는지, 완료 후 기분을 미리 적어두고 → 실행 전 다시 보며 동기 충전!',
        },
      },
      {
        id: 'record',
        label: '관계 기록하기',
        icon: PenLine,
        routeGroup: 'relationship',
        help: {
          title: '관계 기록하기',
          difficulty:
            '작업기억(Working Memory) 결함으로 대화 내용, 약속, 부탁 등을 쉽게 잊어버립니다. "들었는데 기억이 안 나요"',
          help: '만남 직후 바로 기록 → 외부 기억 저장소 역할. 부탁/약속을 할일로 연동하여 잊어버림 방지!',
        },
      },
      {
        id: 'news',
        label: '소식 챙기기',
        icon: MessageCircle,
        isPro: true,
        routeGroup: 'relationship',
        help: {
          title: '소식 챙기기',
          difficulty:
            '시간 감각 왜곡(Time Blindness)으로 "언제 연락했더라?" 추적이 어렵습니다. 관계 소홀 인식이 늦어요.',
          help: '기록된 소식을 시간순 조회 → 연락 빈도 시각화, 소홀한 관계 파악에 도움!',
        },
      },
      {
        id: 'contact',
        label: '연락 돌아보기',
        icon: Users,
        isPro: true,
        routeGroup: 'dashboard',
      },
    ],
  },
  care: {
    id: 'care',
    title: '일상 돌보기',
    items: [
      {
        id: 'gratitude',
        label: '감사 기록하기',
        icon: Heart,
        isPro: true,
        routeGroup: 'relationship',
        help: {
          title: '감사 기록하기',
          difficulty:
            '부정 편향(Negativity Bias) 강화. 감정 조절 어려움으로 좌절감에 쉽게 압도됩니다.',
          help: '감사한 순간 기록 → 긍정 경험 의도적 회상, 정서 균형 회복에 도움!',
        },
      },
      {
        id: 'timeline',
        label: '달력',
        icon: Calendar,
        routeGroup: 'motivation',
        help: {
          title: '달력',
          difficulty:
            '자기 모니터링(Self-Monitoring) 결함. "내가 뭘 했지?" 파악이 어렵습니다.',
          help: '완료한 할일 시간순 시각화 → 작은 성취도 눈에 보임, 자기효능감 강화!',
        },
      },
      {
        id: 'activity',
        label: '활동 살펴보기',
        icon: BarChart3,
        isPro: true,
        routeGroup: 'dashboard',
      },
      {
        id: 'sleepRecord',
        label: '수면 기록하기',
        icon: Moon,
        routeGroup: 'dashboard',
      },
    ],
  },
  project: {
    id: 'project',
    title: '계획 세우기',
    items: [
      {
        id: 'banner',
        label: '마음 깨우기',
        icon: Flag,
        routeGroup: 'dashboard',
      },
      {
        id: 'execute',
        label: '집중 실행하기',
        icon: Target,
        routeGroup: 'motivation',
        help: {
          title: '집중 실행하기',
          difficulty:
            '과제 시작의 어려움(Task Initiation). 해야 할 건 알지만 시작 버튼이 안 눌려요.',
          help: '타이머 + 방해차단 + 원동력 상기 → 시작의 마찰을 줄여 첫 발을 내딛도록 도움!',
        },
      },
      {
        id: 'organize',
        label: '할일 정리하기',
        icon: Inbox,
        routeGroup: 'motivation',
        help: {
          title: '할일 정리하기',
          difficulty:
            '조직화 결함. 머릿속이 복잡하고 할일이 뒤엉켜 어디서 시작할지 막막해요.',
          help: '미분류 할일만 모아서 표시 → 정리해야 할 것만 집중, 인지 부하 감소!',
        },
      },
      {
        id: 'ai-plan',
        label: 'AI로 계획하기',
        icon: Sparkles,
        routeGroup: 'project',
      },
      {
        id: 'ai-chat',
        label: 'AI와 대화하기',
        icon: MessageSquare,
        routeGroup: 'project',
      },
      {
        id: 'guide',
        label: '사용법 배우기',
        icon: BookOpen,
        routeGroup: 'project',
      },
      {
        id: 'adhdUnderstanding',
        label: 'ADHD 이해하기',
        icon: Brain,
        routeGroup: 'project',
      },
    ],
  },
};

// ============================================================================
// 유틸리티 함수
// ============================================================================

/**
 * 모든 서브뷰의 아이콘/레이블 설정을 반환
 * ADHDSidebar, ADHDBottomTabBar에서 사용
 */
export const getSubViewConfig = (): Record<
  string,
  { icon: LucideIcon; label: string }
> => {
  const config: Record<string, { icon: LucideIcon; label: string }> = {};

  Object.values(ADHD_SCREENS).forEach((group) => {
    group.items.forEach((item) => {
      config[item.id] = { icon: item.icon, label: item.label };
    });
  });

  return config;
};

/**
 * 특정 그룹의 Pro 전용 탭 ID 목록 반환
 */
export const getProOnlyTabIds = <T extends string>(
  groupId: ADHDGroupId
): T[] => {
  const group = ADHD_SCREENS[groupId];
  if (!group) return [];

  return group.items
    .filter((item) => item.isPro)
    .map((item) => item.id as T);
};

/**
 * 특정 그룹의 탭 목록을 React 컴포넌트용 형태로 변환
 */
export const getGroupTabs = (groupId: ADHDGroupId) => {
  const group = ADHD_SCREENS[groupId];
  if (!group) return [];

  return group.items.map((item) => ({
    id: item.id,
    label: item.label,
    icon: item.icon,
    proOnly: item.isPro,
  }));
};

/**
 * 특정 그룹의 도움말 콘텐츠 맵 반환
 */
export const getGroupHelpContent = (
  groupId: ADHDGroupId
): Record<string, ADHDScreenHelp> => {
  const group = ADHD_SCREENS[groupId];
  if (!group) return {};

  const helpContent: Record<string, ADHDScreenHelp> = {};

  group.items.forEach((item) => {
    if (item.help) {
      helpContent[item.id] = item.help;
    }
  });

  return helpContent;
};

/**
 * 라우트 그룹별로 화면 아이템 조회
 * 기존 컴포넌트(ADHDEntryScreen, MotivationMode 등)에서 사용
 */
export const getItemsByRouteGroup = (
  routeGroupId: ADHDRouteGroupId
): ADHDScreenItem[] => {
  const items: ADHDScreenItem[] = [];

  Object.values(ADHD_SCREENS).forEach((group) => {
    group.items.forEach((item) => {
      if (item.routeGroup === routeGroupId) {
        items.push(item);
      }
    });
  });

  return items;
};

/**
 * 특정 화면 아이템 조회
 */
export const getScreenItem = (subViewId: ADHDSubViewId): ADHDScreenItem | undefined => {
  for (const group of Object.values(ADHD_SCREENS)) {
    const item = group.items.find((i) => i.id === subViewId);
    if (item) return item;
  }
  return undefined;
};

// ============================================================================
// 새로운 유틸리티 함수 (유연한 아키텍처용)
// ============================================================================

/**
 * SCREEN_REGISTRY에서 화면 정의 조회
 */
export const getScreen = (screenId: ADHDSubViewId): ScreenDefinition | undefined => {
  return SCREEN_REGISTRY[screenId];
};

/**
 * 특정 화면이 속한 UI 그룹 조회
 */
export const getUIGroupForScreen = (screenId: ADHDSubViewId): UIGroupConfig | undefined => {
  return UI_GROUPS.find((group) => group.screenIds.includes(screenId));
};

/**
 * 특정 UI 그룹의 화면 목록 조회
 */
export const getScreensForUIGroup = (groupId: ADHDGroupId): ScreenDefinition[] => {
  const group = UI_GROUPS.find((g) => g.id === groupId);
  if (!group) return [];

  return group.screenIds
    .map((id) => SCREEN_REGISTRY[id])
    .filter((screen): screen is ScreenDefinition => screen !== undefined);
};

/**
 * 특정 화면이 속한 라우트 그룹 조회
 */
export const getRouteGroupForScreen = (screenId: ADHDSubViewId): RouteGroupConfig | undefined => {
  return ROUTE_GROUPS.find((group) => group.screenIds.includes(screenId));
};

/**
 * 특정 라우트 그룹의 화면 목록 조회
 */
export const getScreensForRouteGroup = (routeGroupId: ADHDRouteGroupId): ScreenDefinition[] => {
  const group = ROUTE_GROUPS.find((g) => g.id === routeGroupId);
  if (!group) return [];

  return group.screenIds
    .map((id) => SCREEN_REGISTRY[id])
    .filter((screen): screen is ScreenDefinition => screen !== undefined);
};

/**
 * 특정 UI 그룹의 Pro 전용 화면 ID 목록 반환
 */
export const getProScreenIdsForUIGroup = (groupId: ADHDGroupId): ADHDSubViewId[] => {
  const screens = getScreensForUIGroup(groupId);
  return screens
    .filter((screen) => screen.isPro)
    .map((screen) => screen.id);
};

/**
 * 특정 UI 그룹의 도움말 콘텐츠 맵 반환
 */
export const getHelpContentForUIGroup = (
  groupId: ADHDGroupId
): Record<ADHDSubViewId, ADHDScreenHelp> => {
  const screens = getScreensForUIGroup(groupId);
  const helpContent: Record<string, ADHDScreenHelp> = {};

  screens.forEach((screen) => {
    if (screen.help) {
      helpContent[screen.id] = screen.help;
    }
  });

  return helpContent as Record<ADHDSubViewId, ADHDScreenHelp>;
};

/**
 * UI 그룹 목록을 HomeTableOfContents 형태로 변환
 */
export const getUIGroupsForTableOfContents = () => {
  return UI_GROUPS.map((group) => ({
    id: group.id,
    title: group.title,
    subItems: group.screenIds.map((screenId) => {
      const screen = SCREEN_REGISTRY[screenId];
      const routeGroup = getRouteGroupForScreen(screenId);
      return {
        id: screenId,
        label: screen?.label ?? '',
        isPro: screen?.isPro,
        routeGroup: routeGroup?.id as ADHDRouteGroupId,
      };
    }),
  }));
};
