'use client';

import { useState } from 'react';
import { ArrowLeft, Clock, Inbox, BarChart3, Sun, Moon, Lock, HelpCircle, Brain } from 'lucide-react';
import { useADHDStore } from '@/state/stores/adhdStore';
import { useAuth } from '@/app/context/AuthContext';
import { useTheme } from '@/hooks/useTheme';
import { useSubscription } from '@/hooks/useSubscription';
import { Paywall } from '@/components/subscription/Paywall';
import { TodoTimelineView } from '../TaskOrganize/TodoTimelineView';
import { OrganizeNeededView } from '../TaskOrganize/OrganizeNeededView';
import { TodoStatsView } from '../TaskOrganize/TodoStatsView';

type TabType = 'timeline' | 'organize' | 'stats';

const TABS: { id: TabType; label: string; icon: React.ReactNode }[] = [
  { id: 'timeline', label: '타임라인', icon: <Clock className="w-4 h-4" /> },
  { id: 'organize', label: '정리', icon: <Inbox className="w-4 h-4" /> },
  { id: 'stats', label: '통계', icon: <BarChart3 className="w-4 h-4" /> },
];

interface TaskOrganizeContainerProps {
  onExit: () => void;
}

// 탭별 도움말 콘텐츠
const TAB_HELP_CONTENT: Record<TabType, { title: string; difficulty: string; help: string }> = {
  timeline: {
    title: '타임라인',
    difficulty: '자기 모니터링(Self-Monitoring) 결함. "내가 뭘 했지?" 파악이 어렵습니다. 성취감 인식이 부족해요.',
    help: '완료한 할일 시간순 시각화 → 작은 성취도 눈에 보임, 자기효능감 강화!',
  },
  organize: {
    title: '정리',
    difficulty: '조직화/우선순위 설정 결함. 할일이 쌓이면 어디서 시작할지 막막합니다.',
    help: '미분류 할일만 모아서 표시 → 정리해야 할 것만 집중, 인지 부하 감소!',
  },
  stats: {
    title: '통계',
    difficulty: '피드백 민감도 저하. 자신의 패턴 인식이 어렵고, 같은 실수를 반복하게 됩니다.',
    help: '완료율, 시간대별 패턴 분석 → 데이터 기반 자기 이해, 최적 루틴 발견!',
  },
};

/**
 * 할일 정리 모드 - ADHD 친화적 할일 관리
 *
 * 3개 탭:
 * - 타임라인: 할일 완료/생성 기록 시간순
 * - 정리: 미분류 할일들 정리
 * - 통계: 완료율, 패턴 분석
 */
export default function TaskOrganizeContainer({ onExit }: TaskOrganizeContainerProps) {
  const [activeTab, setActiveTab] = useState<TabType>('timeline');
  const [showPaywall, setShowPaywall] = useState(false);
  const [helpModalTab, setHelpModalTab] = useState<TabType | null>(null);
  const { user } = useAuth();
  const userId = user?.id;
  const { resolvedTheme, setTheme } = useTheme();
  const { hasActiveSubscription } = useSubscription();

  // 탭 클릭 핸들러 - 통계 탭은 Pro 전용
  const handleTabClick = (tabId: TabType) => {
    if (tabId === 'stats' && !hasActiveSubscription) {
      setShowPaywall(true);
      return;
    }
    setActiveTab(tabId);
  };

  const renderContent = () => {
    if (!userId) {
      return (
        <div className="flex items-center justify-center h-64 text-base-content/60">
          로그인이 필요합니다
        </div>
      );
    }

    switch (activeTab) {
      case 'timeline':
        return <TodoTimelineView userId={userId} />;
      case 'organize':
        return <OrganizeNeededView userId={userId} />;
      case 'stats':
        return <TodoStatsView userId={userId} />;
      default:
        return null;
    }
  };

  return (
    <div className="h-screen bg-base-100 flex flex-col overflow-hidden safe-area-top">
      {/* 헤더 */}
      <div className="sticky top-0 z-10 bg-base-100 border-b border-base-300">
        <div className="flex items-center gap-3 p-4">
          <button
            onClick={onExit}
            className="btn btn-ghost btn-circle btn-sm"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold flex-1">할일 정리</h1>
          <button
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            className="btn btn-circle btn-sm btn-ghost"
            aria-label="테마 전환"
          >
            {resolvedTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>

        {/* 탭 네비게이션 */}
        <div className="flex overflow-x-auto px-2 pb-2 gap-1 scrollbar-hide">
          {TABS.map((tab) => {
            const isProLocked = tab.id === 'stats' && !hasActiveSubscription;
            return (
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
                  onClick={() => handleTabClick(tab.id)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ? 'bg-primary text-primary-content'
                      : 'bg-base-200 text-base-content hover:bg-base-300'
                  }`}
                >
                  {tab.icon}
                  <span className="text-sm font-medium">{tab.label}</span>
                  {isProLocked && <Lock className="w-3 h-3 ml-0.5 opacity-60" />}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* 콘텐츠 영역 */}
      <div className="flex-1 overflow-y-auto">
        {renderContent()}
      </div>

      {/* 통계 탭 Pro 잠금 Paywall 모달 */}
      {showPaywall && (
        <Paywall
          isModal={true}
          onClose={() => setShowPaywall(false)}
          featureId="statistics"
          title="통계 & 인사이트"
          description="생산성 통계와 패턴 분석을 확인하세요"
        />
      )}

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
