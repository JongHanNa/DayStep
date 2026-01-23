'use client';

import { useState } from 'react';
import { Heart, MessageCircle, PenLine, Crown, HelpCircle, Brain } from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { Paywall } from '@/components/subscription/Paywall';
import { CareRecordView } from './CareRecordView';
import { GratitudeJournalView } from './GratitudeJournalView';
import { NewsMemosView } from './NewsMemosView';

type TabType = 'record' | 'news' | 'gratitude';

// Pro 전용 탭 정의 (record 제외)
const PRO_ONLY_TABS: TabType[] = ['news', 'gratitude'];

const TABS: { id: TabType; label: string; icon: React.ReactNode; proOnly?: boolean }[] = [
  { id: 'record', label: '기록', icon: <PenLine className="w-4 h-4" /> },
  { id: 'news', label: '소식', icon: <MessageCircle className="w-4 h-4" />, proOnly: true },
  { id: 'gratitude', label: '감사', icon: <Heart className="w-4 h-4" />, proOnly: true },
];

interface RelationshipInsightsModeProps {
  onExit: () => void;
}

// 탭별 도움말 콘텐츠
const TAB_HELP_CONTENT: Record<TabType, { title: string; difficulty: string; help: string }> = {
  record: {
    title: '기록',
    difficulty: '작업기억(Working Memory) 결함으로 대화 내용, 약속, 부탁 등을 쉽게 잊어버립니다. "들었는데 기억이 안 나요"',
    help: '만남 직후 바로 기록 → 외부 기억 저장소 역할. 부탁/약속을 할일로 연동하여 잊어버림 방지!',
  },
  news: {
    title: '소식',
    difficulty: '시간 감각 왜곡(Time Blindness)으로 "언제 연락했더라?" 추적이 어렵습니다. 관계 소홀 인식이 늦어요.',
    help: '기록된 소식을 시간순 조회 → 연락 빈도 시각화, 소홀한 관계 파악에 도움!',
  },
  gratitude: {
    title: '감사',
    difficulty: '부정 편향(Negativity Bias) 강화. 감정 조절 어려움으로 좌절감에 쉽게 압도됩니다.',
    help: '감사한 순간 기록 → 긍정 경험 의도적 회상, 정서 균형 회복에 도움!',
  },
};

export function RelationshipInsightsMode({ onExit }: RelationshipInsightsModeProps) {
  const [activeTab, setActiveTab] = useState<TabType>('record');
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
