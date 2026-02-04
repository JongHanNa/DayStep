'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { useADHDStore, ADHDScreen } from '@/state/stores/adhdStore';
import { isCapacitorEnv } from '@/lib/utils/platform';
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
const OrganizeScreen = dynamic(() => import('./screens/organize/OrganizeScreen'), {
  loading: () => <ViewLoadingSpinner />,
});
const ADHDEntryScreen = dynamic(() => import('./ADHDEntryScreen'), {
  loading: () => <ViewLoadingSpinner />,
});

// GenericTabContainer - 범용 탭 컨테이너 (fuel, project, relationship-insights용)
const GenericTabContainer = dynamic(() => import('./containers/GenericTabContainer'), {
  loading: () => <ViewLoadingSpinner />,
});

// 라우트 그룹별 screenIds (ROUTE_GROUPS에서 파생)
const FUEL_SCREEN_IDS: ADHDSubViewId[] = ['motivation', 'timeline', 'execute', 'organize'];
const RELATIONSHIP_SCREEN_IDS: ADHDSubViewId[] = ['record', 'news', 'gratitude'];
const PROJECT_SCREEN_IDS: ADHDSubViewId[] = ['ai-plan', 'ai-chat', 'guide'];

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
    case 'fuel':
      return 'fuel';
    case 'care':
      return 'care';
    case 'project':
      return 'project';
    case 'settings':
      return 'settings';
    case 'organize':
      return 'organize';
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
 * 모든 ADHD 모드의 단일 진입점으로, 환경에 따라 적절한 Container를 렌더링합니다.
 * - 웹: URL 기반으로 모드 결정
 * - Capacitor: Store 기반으로 모드 결정
 *
 * 코드 스플리팅을 통해 각 Container를 lazy loading합니다.
 */
export function ADHDContainer({ onExit, mode: explicitMode }: ADHDContainerProps) {
  const pathname = usePathname();
  const storeMode = useADHDStore((s) => s.currentMode);
  const { user } = useAuth();
  const userId = user?.id;
  const { goRelationshipInsights, goFuel } = useADHDNavigation();

  // 우선순위: 명시적 mode prop > Capacitor Store > URL 경로
  const currentMode = explicitMode
    ?? (isCapacitorEnv() ? storeMode : getModeFromPath(pathname));

  const handleExit = onExit ?? (() => {
    // 기본 동작: 홈으로 이동
    useADHDStore.getState().enterHomeMode();
  });

  // 모드별 Container 렌더링
  switch (currentMode) {
    case 'execute':
      return <FocusExecutionContainer onExit={handleExit} />;
    case 'fuel':
      // GenericTabContainer로 fuel 라우트 그룹 렌더링
      return (
        <GenericTabContainer
          screenIds={FUEL_SCREEN_IDS}
          routeGroupId="fuel"
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
    case 'organize':
      return userId ? <OrganizeScreen userId={userId} /> : null;
    case 'entry':
      return (
        <ADHDEntryScreen
          userId={userId}
          onRelationshipInsights={goRelationshipInsights}
          onFuel={goFuel}
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
