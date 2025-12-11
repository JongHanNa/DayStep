import {
  Home,
  Target,
  Compass,
  FolderOpen,
  Clock,
  Calendar,
  FileText,
  Settings,
  Network,
  Timer,
  Database,
  LucideIcon
} from 'lucide-react';

// 네비게이션 그룹 타입 (GTD 워크플로우 제거)
export type NavigationGroupType = 'productivity' | 'data' | 'settings';

// 메뉴 아이템 인터페이스
export interface NavigationItem {
  id: string;
  label: string;
  icon: LucideIcon;
  href: string;
}

// 네비게이션 그룹 인터페이스
export interface NavigationGroup {
  id: NavigationGroupType;
  label: string;
  icon: LucideIcon;
  items: NavigationItem[];
}

// 전체 네비게이션 설정 (GTD 워크플로우 제거, 단순화)
export const NAVIGATION_GROUPS: Record<NavigationGroupType, NavigationGroup> = {
  productivity: {
    id: 'productivity',
    label: '뷰',
    icon: Target,
    items: [
      { id: 'graph-view', label: '그래프 뷰', icon: Network, href: '/' },
      { id: 'timeline', label: '타임라인', icon: Clock, href: '/timeline' },
      { id: 'calendar', label: '달력', icon: Calendar, href: '/second-brain/calendar' },
      { id: 'notes', label: '노트', icon: FileText, href: '/second-brain/notes' },
      { id: 'pomodoro', label: '포모도로', icon: Timer, href: '/second-brain/pomodoro' },
    ]
  },
  data: {
    id: 'data',
    label: '내 데이터',
    icon: Database,
    items: [
      { id: 'areas-resources', label: '책임/자원', icon: Target, href: '/second-brain/areas-resources' },
      { id: 'goals', label: '목표', icon: Compass, href: '/second-brain/goals' },
      { id: 'projects', label: '프로젝트', icon: FolderOpen, href: '/second-brain/projects' },
    ]
  },
  settings: {
    id: 'settings',
    label: '설정',
    icon: Settings,
    items: [] // 설정은 메인 페이지(/settings)만 사용, 상단 탭 없음
  }
} as const;

// 하단 네비게이션 메인 탭 배열 (순서 중요) - GTD 워크플로우 제거
export const MAIN_TABS: Array<{
  id: NavigationGroupType;
  label: string;
  icon: LucideIcon;
  groupType: NavigationGroupType;
}> = [
  { id: 'productivity', label: '뷰', icon: Home, groupType: 'productivity' },
  { id: 'data', label: '데이터', icon: Database, groupType: 'data' },
  { id: 'settings', label: '설정', icon: Settings, groupType: 'settings' },
];

// 유틸리티 함수: 특정 그룹의 모든 경로 배열 반환
export const getGroupPaths = (groupType: NavigationGroupType): string[] => {
  return NAVIGATION_GROUPS[groupType].items.map(item => item.href);
};

/**
 * Helper: Find navigation item matching the current pathname
 * Uses longest-first sorting to avoid prefix matching issues (e.g., '/' matching everything)
 */
const findNavItemByPath = (pathname: string, items: NavigationItem[]): NavigationItem | null => {
  // 경로 길이 내림차순 정렬 (긴 경로부터 검사)
  const sortedItems = [...items].sort((a, b) => b.href.length - a.href.length);

  for (const item of sortedItems) {
    // 정확한 경로 매칭 (e.g., '/' or '/timeline')
    if (item.href === pathname) {
      return item;
    }
    // 경로 경계 매칭 (e.g., /areas matches /areas/123 but not /areas-old)
    if (pathname.startsWith(item.href + '/')) {
      return item;
    }
  }

  return null;
};

// 유틸리티 함수: 현재 경로에서 활성 그룹 찾기
export const getActiveGroupFromPath = (pathname: string): NavigationGroupType | null => {
  for (const [groupType, group] of Object.entries(NAVIGATION_GROUPS)) {
    const item = findNavItemByPath(pathname, group.items);
    if (item) return groupType as NavigationGroupType;
  }
  return null;
};

// 유틸리티 함수: 현재 경로에서 활성 아이템 찾기
export const getActiveItemFromPath = (pathname: string, groupType: NavigationGroupType): NavigationItem | null => {
  const group = NAVIGATION_GROUPS[groupType];
  return findNavItemByPath(pathname, group.items);
};

// 유틸리티 함수: 현재 경로에서 페이지 제목 가져오기
export const getPageTitleFromPath = (pathname: string): string => {
  // 모든 그룹의 아이템에서 현재 경로와 매칭되는 것을 찾음
  for (const group of Object.values(NAVIGATION_GROUPS)) {
    const item = findNavItemByPath(pathname, group.items);
    if (item) return item.label;
  }

  // 특수 경로 처리
  if (pathname === '/settings' || pathname.startsWith('/settings')) {
    return '설정';
  }
  if (pathname === '/timeline') {
    return '타임라인';
  }
  if (pathname === '/') {
    return '그래프 뷰';
  }
  if (pathname === '/landing') {
    return 'DayStep';
  }

  return 'DayStep';
};
