'use client';

import { useState, useMemo, type ReactNode } from 'react';
import { Crown, HelpCircle, Brain } from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { useADHDStore } from '@/state/stores/adhdStore';
import { Paywall } from '@/components/subscription/Paywall';
import {
  SCREEN_REGISTRY,
  getScreen,
  getRouteGroupForScreen,
  type ADHDSubViewId,
  type ADHDScreenHelp,
  type ADHDRouteGroupId,
} from '@/lib/constants/adhd-screens';
import { SCREEN_COMPONENTS, type ScreenComponentProps } from '@/components/adhd/screens';

interface GenericTabContainerProps {
  /** 표시할 화면 ID 목록 */
  screenIds: ADHDSubViewId[];
  /** 라우트 그룹 ID (Paywall featureId용) */
  routeGroupId?: ADHDRouteGroupId;
  /** 컨테이너 종료 핸들러 */
  onExit?: () => void;
  /** 탭 표시 여부 (currentSubView가 있으면 자동으로 false) */
  showTabs?: boolean;
  /** 커스텀 헤더 렌더링 */
  renderHeader?: (activeTab: ADHDSubViewId) => ReactNode;
}

/**
 * GenericTabContainer - 범용 탭 컨테이너
 *
 * 화면 ID 목록을 받아 동적으로 탭을 구성합니다.
 * SCREEN_REGISTRY에서 메타데이터를 조회하여 탭 라벨, 아이콘, Pro 여부 등을 결정합니다.
 *
 * 특징:
 * - 화면을 그룹에 독립적으로 렌더링
 * - Pro 전용 화면에 대한 Paywall 자동 처리
 * - 도움말 모달 자동 처리
 * - currentSubView에 따른 단일 화면 표시 지원
 */
export function GenericTabContainer({
  screenIds,
  routeGroupId,
  onExit = () => {},
  showTabs = true,
  renderHeader,
}: GenericTabContainerProps) {
  const { user } = useAuth();
  const userId = user?.id;
  const { hasActiveSubscription } = useSubscription();
  const { currentSubView } = useADHDStore();

  // 탭 설정 구성
  const tabs = useMemo(() => {
    return screenIds
      .map((id) => {
        const screen = getScreen(id);
        if (!screen) return null;

        const IconComponent = screen.icon;
        return {
          id: screen.id,
          label: screen.label,
          icon: <IconComponent className="w-4 h-4" />,
          proOnly: screen.isPro,
          help: screen.help,
        };
      })
      .filter(Boolean) as Array<{
        id: ADHDSubViewId;
        label: string;
        icon: ReactNode;
        proOnly?: boolean;
        help?: ADHDScreenHelp;
      }>;
  }, [screenIds]);

  // 초기 탭 결정
  const getInitialTab = (): ADHDSubViewId => {
    if (currentSubView && screenIds.includes(currentSubView as ADHDSubViewId)) {
      return currentSubView as ADHDSubViewId;
    }
    return screenIds[0];
  };

  const [activeTab, setActiveTab] = useState<ADHDSubViewId>(getInitialTab());
  const [helpModalTab, setHelpModalTab] = useState<ADHDSubViewId | null>(null);

  // Pro 전용 탭인지 확인
  const activeTabConfig = tabs.find((tab) => tab.id === activeTab);
  const isProOnlyTab = activeTabConfig?.proOnly ?? false;
  const showPaywall = isProOnlyTab && !hasActiveSubscription;

  // 도움말 콘텐츠 가져오기
  const getHelpContent = (tabId: ADHDSubViewId): ADHDScreenHelp | undefined => {
    const screen = getScreen(tabId);
    return screen?.help;
  };

  // 콘텐츠 렌더링
  const renderContent = () => {
    if (!userId) {
      return (
        <div className="flex items-center justify-center h-64 text-base-content/60">
          로그인이 필요합니다
        </div>
      );
    }

    // Pro 전용 화면에 Paywall 표시
    if (showPaywall) {
      const routeGroup = routeGroupId || getRouteGroupForScreen(activeTab)?.id;
      return (
        <div className="px-4 py-6">
          <Paywall
            featureId={routeGroup || 'adhd'}
            title={activeTabConfig?.label || '프리미엄 기능'}
            description="이 기능은 Pro 구독이 필요합니다"
          />
        </div>
      );
    }

    // Screen 컴포넌트 렌더링
    const ScreenComponent = SCREEN_COMPONENTS[activeTab];
    if (!ScreenComponent) {
      return (
        <div className="flex items-center justify-center h-64 text-base-content/60">
          화면을 찾을 수 없습니다
        </div>
      );
    }

    // 타입 안전하게 props 전달
    const Component = ScreenComponent as React.ComponentType<ScreenComponentProps>;
    return <Component userId={userId} onExit={onExit} />;
  };

  // currentSubView가 있으면 탭 없이 단일 콘텐츠만 표시
  const shouldShowTabs = showTabs && !currentSubView;

  return (
    <div className="h-screen bg-base-100 flex flex-col safe-area-top overflow-hidden">
      {/* 커스텀 헤더 또는 기본 탭 네비게이션 */}
      {renderHeader ? (
        renderHeader(activeTab)
      ) : shouldShowTabs ? (
        <div className="sticky top-0 z-10 bg-base-100 border-b border-base-300">
          <div className="flex overflow-x-auto px-2 py-2 gap-1 scrollbar-hide">
            {tabs.map((tab) => (
              <div key={tab.id} className="flex items-center gap-0.5">
                {/* 도움말 버튼 */}
                {tab.help && (
                  <button
                    onClick={() => setHelpModalTab(tab.id)}
                    className="p-1 rounded-full hover:bg-base-300 transition-colors"
                  >
                    <HelpCircle className="w-4 h-4 text-base-content/60" />
                  </button>
                )}
                {/* 탭 버튼 */}
                <button
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1 px-3 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-primary text-primary-content'
                      : 'text-base-content/70 hover:bg-base-200'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                  {tab.proOnly && <Crown className="w-3 h-3 text-warning" />}
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* 메인 콘텐츠 */}
      <div className="flex-1 overflow-y-auto">{renderContent()}</div>

      {/* 도움말 모달 */}
      {helpModalTab && (
        <dialog open className="modal z-[110]">
          <div className="modal-box max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Brain className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">
                {getHelpContent(helpModalTab)?.title}
              </h3>
            </div>

            <div className="space-y-3 text-sm text-base-content/80">
              <p className="font-medium text-error/80">
                😵 ADHD 특성: {getHelpContent(helpModalTab)?.difficulty}
              </p>
              <p>✨ 이 기능은: {getHelpContent(helpModalTab)?.help}</p>
            </div>

            <div className="modal-action">
              <button
                onClick={() => setHelpModalTab(null)}
                className="btn btn-primary rounded-full"
              >
                확인
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={() => setHelpModalTab(null)}>close</button>
          </form>
        </dialog>
      )}
    </div>
  );
}

export default GenericTabContainer;
