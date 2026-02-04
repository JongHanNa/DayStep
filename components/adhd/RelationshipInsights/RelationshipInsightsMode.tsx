'use client';

import { useState } from 'react';
import { Crown, HelpCircle, Brain } from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { useADHDModeStore } from '@/state/stores/adhdModeStore';
import { Paywall } from '@/components/subscription/Paywall';
import { CareRecordView } from './CareRecordView';
import { GratitudeJournalView } from './GratitudeJournalView';
import { NewsMemosView } from './NewsMemosView';
import { getProOnlyTabIds, getGroupTabs, getGroupHelpContent, type ADHDScreenHelp } from '@/lib/constants/adhd-screens';

type TabType = 'record' | 'news' | 'gratitude';

// ADHD_SCREENS에서 Pro 전용 탭과 탭 목록 파생
const PRO_ONLY_TABS = getProOnlyTabIds<TabType>('relationship');
const RELATIONSHIP_TABS_RAW = getGroupTabs('relationship');
const TABS = RELATIONSHIP_TABS_RAW.map((tab) => {
  const IconComponent = tab.icon;
  return {
    id: tab.id as TabType,
    label: tab.label,
    icon: <IconComponent className="w-4 h-4" />,
    proOnly: tab.proOnly,
  };
});

// ADHD_SCREENS에서 도움말 콘텐츠 파생
const TAB_HELP_CONTENT = getGroupHelpContent('relationship') as Record<TabType, ADHDScreenHelp>;

interface RelationshipInsightsModeProps {
  onExit: () => void;
}

export function RelationshipInsightsMode({ onExit }: RelationshipInsightsModeProps) {
  const { currentSubView } = useADHDModeStore();
  const [activeTab, setActiveTab] = useState<TabType>((currentSubView as TabType) || 'record');
  const [helpModalTab, setHelpModalTab] = useState<TabType | null>(null);
  const { user } = useAuth();
  const userId = user?.id;
  const { hasActiveSubscription } = useSubscription();

  // Pro 전용 탭인지 확인
  const isProOnlyTab = PRO_ONLY_TABS.includes(activeTab);
  const showPaywall = isProOnlyTab && !hasActiveSubscription;

  const renderContent = () => {
    if (!userId) {
      return (
        <div className="flex items-center justify-center h-64 text-base-content/60">
          로그인이 필요합니다
        </div>
      );
    }

    // Pro 전용 탭인데 구독이 없으면 Paywall 표시
    if (showPaywall) {
      return (
        <div className="px-4 py-6">
          <Paywall
            featureId="relationship_insights"
            title="관계 인사이트"
            description="기록한 소식을 조회하고 관계 패턴을 분석하세요"
          />
        </div>
      );
    }

    switch (activeTab) {
      case 'record':
        return <CareRecordView userId={userId} />;
      case 'gratitude':
        return <GratitudeJournalView userId={userId} />;
      case 'news':
        return <NewsMemosView userId={userId} />;
      default:
        return null;
    }
  };

  // currentSubView가 있으면 탭 없이 단일 콘텐츠만 표시
  if (currentSubView) {
    return (
      <div className="h-screen bg-base-100 flex flex-col safe-area-top overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          {renderContent()}
        </div>

        {/* 탭별 도움말 모달 */}
        {helpModalTab && (
          <dialog open className="modal z-[110]">
            <div className="modal-box max-w-md">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <Brain className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">{TAB_HELP_CONTENT[helpModalTab].title}</h3>
              </div>

              <div className="space-y-3 text-sm text-base-content/80">
                <p className="font-medium text-error/80">
                  😵 ADHD 특성: {TAB_HELP_CONTENT[helpModalTab].difficulty}
                </p>
                <p>
                  ✨ 이 기능은: {TAB_HELP_CONTENT[helpModalTab].help}
                </p>
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

  // currentSubView가 null이면 기존 탭 UI (직접 접근 시)
  return (
    <div className="h-screen bg-base-100 flex flex-col safe-area-top overflow-hidden">
      {/* 헤더 - 탭 네비게이션만 */}
      <div className="sticky top-0 z-10 bg-base-100 border-b border-base-300">
        {/* 탭 네비게이션 */}
        <div className="flex overflow-x-auto px-2 py-2 gap-1 scrollbar-hide">
          {TABS.map((tab) => (
            <div key={tab.id} className="flex items-center gap-0.5">
              {/* 도움말 버튼 - 버튼 중첩 방지를 위해 형제 요소로 분리 */}
              <button
                onClick={() => setHelpModalTab(tab.id)}
                className="p-1 rounded-full hover:bg-base-300 transition-colors"
              >
                <HelpCircle className="w-4 h-4 text-base-content/60" />
              </button>
              {/* 탭 버튼 */}
              <button
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'bg-primary text-primary-content'
                    : 'bg-base-200 text-base-content hover:bg-base-300'
                }`}
              >
                {tab.icon}
                <span className="text-sm font-medium">{tab.label}</span>
                {tab.proOnly && !hasActiveSubscription && (
                  <Crown className="w-3 h-3 text-amber-500" />
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 콘텐츠 영역 */}
      <div className="flex-1 overflow-y-auto">
        {renderContent()}
      </div>

      {/* 탭별 도움말 모달 */}
      {helpModalTab && (
        <dialog open className="modal z-[110]">
          <div className="modal-box max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Brain className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">{TAB_HELP_CONTENT[helpModalTab].title}</h3>
            </div>

            <div className="space-y-3 text-sm text-base-content/80">
              <p className="font-medium text-error/80">
                😵 ADHD 특성: {TAB_HELP_CONTENT[helpModalTab].difficulty}
              </p>
              <p>
                ✨ 이 기능은: {TAB_HELP_CONTENT[helpModalTab].help}
              </p>
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
