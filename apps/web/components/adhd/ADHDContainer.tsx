'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { useADHDStore, ADHDScreen } from '@/state/stores/adhdStore';

import { useAuth } from '@/app/context/AuthContext';
import { useADHDNavigation } from '@/lib/navigation/adhdNavigation';
import type { ADHDSubViewId, ADHDRouteGroupId } from '@/lib/constants/adhd-screens';

// Dynamic imports for code splitting
const FocusExecutionContainer = dynamic(() => import('./containers/FocusExecutionContainer'), {
  loading: () => <ViewLoadingSpinner />,
});
const RelationshipRecordContainer = dynamic(() => import('./containers/RelationshipRecordContainer'), {
  loading: () => <ViewLoadingSpinner />,
});
const SettingsContainer = dynamic(() => import('./settings/SettingsContainer'), {
  loading: () => <ViewLoadingSpinner />,
});
const TaskOrganizeContainer = dynamic(() => import('./task-organize/TaskOrganizeContainer'), {
  loading: () => <ViewLoadingSpinner />,
});
const ADHDEntryScreen = dynamic(() => import('./ADHDEntryScreen'), {
  loading: () => <ViewLoadingSpinner />,
});

// GenericTabContainer - 범용 탭 컨테이너 (motivation, project, relationship-insights용)
const GenericTabContainer = dynamic(() => import('./containers/GenericTabContainer'), {
  loading: () => <ViewLoadingSpinner />,
});

// 라우트 그룹별 screenIds (ROUTE_GROUPS에서 파생)
const MOTIVATION_SCREEN_IDS: ADHDSubViewId[] = ['motivation', 'timeline', 'daily-planner', 'execute'];
const RELATIONSHIP_SCREEN_IDS: ADHDSubViewId[] = ['record', 'news', 'gratitude'];
const PROJECT_SCREEN_IDS: ADHDSubViewId[] = ['projects', 'ai-chat', 'guide'];

/**
 * 로딩 스피너 컴포넌트
 */
function ViewLoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-base-300 border-t-primary" />
    </div>
  );
}

/**
 * URL 경로에서 ADHD 모드 추출
 */
function getModeFromPath(pathname: string): ADHDScreen {
  if (!pathname.startsWith('/adhd')) return 'home';

  const segments = pathname.split('/').filter(Boolean);
  // /adhd/execute → segments = ['adhd', 'execute']
  const modeSegment = segments[1];

  switch (modeSegment) {
    case 'execute':
      return 'execute';
    case 'motivation':
      return 'motivation';
    case 'care':
      return 'care';
    case 'project':
      return 'project';
    case 'settings':
      return 'settings';
    case 'task-organize':
      return 'task-organize';
    case 'relationship-insights':
      return 'relationship-insights';
    case 'entry':
      return 'entry';
    default:
      return 'home';
  }
}

interface ADHDContainerProps {
  /**
   * 모드 종료 시 호출되는 콜백
   */
  onExit?: () => void;
  /**
   * 명시적으로 모드를 지정 (라우트 페이지에서 직접 지정 시 사용)
   */
  mode?: ADHDScreen;
}

/**
 * ADHD 통합 컨테이너
 *
 * 모든 ADHD 모드의 단일 진입점으로 URL 기반으로 모드를 결정합니다.
 *
 * 코드 스플리팅을 통해 각 Container를 lazy loading합니다.
 */
export function ADHDContainer({ onExit, mode: explicitMode }: ADHDContainerProps) {
  const pathname = usePathname();
  const storeMode = useADHDStore((s) => s.currentMode);
  const { user } = useAuth();
  const userId = user?.id;
  const { goRelationshipInsights, goMotivation } = useADHDNavigation();

  // 우선순위: 명시적 mode prop > URL 경로
  const currentMode = explicitMode ?? getModeFromPath(pathname);

  const handleExit = onExit ?? (() => {
    // 기본 동작: 홈으로 이동
    useADHDStore.getState().enterHomeMode();
  });

  // 모드별 Container 렌더링
  switch (currentMode) {
    case 'execute':
      return <FocusExecutionContainer onExit={handleExit} />;
    case 'motivation':
      // GenericTabContainer로 motivation 라우트 그룹 렌더링
      return (
        <GenericTabContainer
          screenIds={MOTIVATION_SCREEN_IDS}
          routeGroupId="motivation"
          onExit={handleExit}
        />
      );
    case 'care':
      return <RelationshipRecordContainer onExit={handleExit} />;
    case 'project':
      // GenericTabContainer로 project 라우트 그룹 렌더링
      return (
        <GenericTabContainer
          screenIds={PROJECT_SCREEN_IDS}
          routeGroupId="project"
          onExit={handleExit}
        />
      );
    case 'settings':
      return <SettingsContainer onExit={handleExit} />;
    case 'task-organize':
      return <TaskOrganizeContainer onExit={handleExit} />;
    case 'entry':
      return (
        <ADHDEntryScreen
          userId={userId}
          onRelationshipInsights={goRelationshipInsights}
          onMotivation={goMotivation}
        />
      );
    case 'relationship-insights':
      // GenericTabContainer로 relationship 라우트 그룹 렌더링
      return (
        <GenericTabContainer
          screenIds={RELATIONSHIP_SCREEN_IDS}
          routeGroupId="relationship"
          onExit={handleExit}
        />
      );
    default:
      // home은 루트 경로라 별도 처리 필요
      return null;
  }
}

export default ADHDContainer;
