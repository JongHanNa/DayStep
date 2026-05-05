'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Crown } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { Paywall } from '@/components/subscription/Paywall';
import PriorityReminderBanner from '@/components/cherished/PriorityReminderBanner';
import MotivationReminderBanner from '@/components/adhd/MotivationReminderBanner';
import { StatsDashboardView } from '@/components/adhd/common';
import { TodoStatsView } from '@/components/adhd/screens/activity/components/TodoStatsView';
import { useADHDStore } from '@/state/stores/adhdStore';
import { getItemsByRouteGroup } from '@/lib/constants/adhd-screens';

type TabType = 'banner' | 'contact' | 'activity';

// dashboard 라우트 그룹의 아이템들 가져오기
const DASHBOARD_ITEMS = getItemsByRouteGroup('dashboard');
const PRO_ONLY_TABS = DASHBOARD_ITEMS.filter((item) => item.isPro).map((item) => item.id) as TabType[];

interface ADHDEntryScreenProps {
  userId?: string;
  onRelationshipInsights: () => void;
  onMotivation: (noteId?: string) => void;
}

/**
 * ADHD 모드 진입 화면 (대시보드)
 *
 * 3개 탭으로 구성:
 * - 마음 깨우기: MotivationReminderBanner + PriorityReminderBanner + 각성 문장
 * - 연락 돌아보기 (Pro): 관계 통계 (StatsDashboardView)
 * - 활동 살펴보기 (Pro): 할일 통계 (TodoStatsView)
 */
export default function ADHDEntryScreen({ userId, onRelationshipInsights, onMotivation }: ADHDEntryScreenProps) {
  const { awakeningSentence, currentSubView } = useADHDStore();
  const [activeTab, setActiveTab] = useState<TabType>((currentSubView as TabType) || 'banner');
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
            featureId={activeTab === 'contact' ? 'relationship_insights' : 'todo_stats'}
            title={activeTab === 'contact' ? '연락 돌아보기' : '활동 살펴보기'}
            description={
              activeTab === 'contact'
                ? '관계 기록 패턴을 분석하고 인사이트를 확인하세요'
                : '할일 완료 패턴을 분석하고 생산성을 파악하세요'
            }
          />
        </div>
      );
    }

    switch (activeTab) {
      case 'banner':
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-sm mx-auto text-center mt-8"
          >
            {/* 원동력 상기 배너 */}
            <MotivationReminderBanner
              userId={userId}
              onMotivationClick={(noteId) => onMotivation(noteId)}
            />

            {/* 우선순위 상기 배너 */}
            <PriorityReminderBanner
              userId={userId}
              onContactClick={onRelationshipInsights}
            />

            {/* 각성 문장 (설정된 경우) */}
            {awakeningSentence && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-sm text-base-content/60 mb-8 italic"
              >
                &ldquo;{awakeningSentence}&rdquo;
              </motion.p>
            )}

            {!awakeningSentence && <div className="mb-8" />}

          </motion.div>
        );
      case 'contact':
        return <StatsDashboardView userId={userId} />;
      case 'activity':
        return <TodoStatsView userId={userId} />;
      default:
        return null;
    }
  };

  // currentSubView가 있으면 탭 없이 단일 콘텐츠만 표시
  if (currentSubView) {
    return (
      <div className="min-h-screen flex flex-col bg-base-100 safe-area-top">
        <div className="flex-1 overflow-y-auto px-4">
          {renderContent()}
        </div>
      </div>
    );
  }

  // currentSubView가 null이면 기존 탭 UI (직접 접근 시)
  return (
    <div className="min-h-screen flex flex-col bg-base-100 safe-area-top">
      {/* 탭 네비게이션 */}
      <div className="sticky top-0 z-10 bg-base-100 border-b border-base-300">
        <div className="flex overflow-x-auto px-4 py-3 gap-2 scrollbar-hide">
          {DASHBOARD_ITEMS.map((item) => {
            const IconComponent = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as TabType)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
                  activeTab === item.id
                    ? 'bg-primary text-primary-content'
                    : 'bg-base-200 text-base-content hover:bg-base-300'
                }`}
              >
                <IconComponent className="w-4 h-4" />
                <span className="text-sm font-medium">{item.label}</span>
                {item.isPro && !hasActiveSubscription && (
                  <Crown className="w-3 h-3 text-amber-500" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 탭 콘텐츠 */}
      <div className="flex-1 overflow-y-auto px-4">
        {renderContent()}
      </div>
    </div>
  );
}
