'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { useADHDStore, ADHDScreen } from '@/state/stores/adhdStore';
import { isCapacitorEnv } from '@/lib/utils/platform';

// Dynamic imports for code splitting
const ExecutionView = dynamic(() => import('./views/ExecutionView'), {
  loading: () => <ViewLoadingSpinner />,
});
const FuelView = dynamic(() => import('./views/FuelView'), {
  loading: () => <ViewLoadingSpinner />,
});
const CareView = dynamic(() => import('./views/CareView'), {
  loading: () => <ViewLoadingSpinner />,
});
const ProjectView = dynamic(() => import('./views/ProjectView'), {
  loading: () => <ViewLoadingSpinner />,
});
const SettingsView = dynamic(() => import('./views/SettingsView'), {
  loading: () => <ViewLoadingSpinner />,
});
const TaskOrganizeView = dynamic(() => import('./views/TaskOrganizeView'), {
  loading: () => <ViewLoadingSpinner />,
});
const OrganizeView = dynamic(() => import('./views/OrganizeView'), {
  loading: () => <ViewLoadingSpinner />,
});
const EntryView = dynamic(() => import('./views/EntryView'), {
  loading: () => <ViewLoadingSpinner />,
});
const RelationshipInsightsView = dynamic(() => import('./views/RelationshipInsightsView'), {
  loading: () => <ViewLoadingSpinner />,
});

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
 * 모든 ADHD 모드의 단일 진입점으로, 환경에 따라 적절한 뷰를 렌더링합니다.
 * - 웹: URL 기반으로 모드 결정
 * - Capacitor: Store 기반으로 모드 결정
 *
 * 코드 스플리팅을 통해 각 뷰를 lazy loading합니다.
 */
export function ADHDContainer({ onExit, mode: explicitMode }: ADHDContainerProps) {
  const pathname = usePathname();
  const storeMode = useADHDStore((s) => s.currentMode);

  // 우선순위: 명시적 mode prop > Capacitor Store > URL 경로
  const currentMode = explicitMode
    ?? (isCapacitorEnv() ? storeMode : getModeFromPath(pathname));

  const handleExit = onExit ?? (() => {
    // 기본 동작: 홈으로 이동
    useADHDStore.getState().enterHomeMode();
  });

  // 모드별 뷰 렌더링
  switch (currentMode) {
    case 'execute':
      return <ExecutionView onExit={handleExit} />;
    case 'fuel':
      return <FuelView onExit={handleExit} />;
    case 'care':
      return <CareView onExit={handleExit} />;
    case 'project':
      return <ProjectView onExit={handleExit} />;
    case 'settings':
      return <SettingsView onExit={handleExit} />;
    case 'task-organize':
      return <TaskOrganizeView onExit={handleExit} />;
    case 'organize':
      return <OrganizeView onExit={handleExit} />;
    case 'entry':
      return <EntryView onExit={handleExit} />;
    case 'relationship-insights':
      return <RelationshipInsightsView onExit={handleExit} />;
    default:
      // home은 루트 경로라 별도 처리 필요
      return null;
  }
}

export default ADHDContainer;
