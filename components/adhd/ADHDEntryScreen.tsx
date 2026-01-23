'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Crown, BarChart3, Users, Flag } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { Paywall } from '@/components/subscription/Paywall';
import PriorityReminderBanner from '@/components/cherished/PriorityReminderBanner';
import FuelReminderBanner from '@/components/adhd/FuelReminderBanner';
import { StatsDashboardView } from '@/components/adhd/RelationshipInsights/StatsDashboardView';
import { TodoStatsView } from '@/components/adhd/TaskOrganize/TodoStatsView';
import { useADHDModeStore } from '@/state/stores/adhdModeStore';

type TabType = 'banner' | 'contact' | 'activity';

// Pro 전용 탭 정의
const PRO_ONLY_TABS: TabType[] = ['contact', 'activity'];

const TABS: { id: TabType; label: string; icon: React.ReactNode; proOnly?: boolean }[] = [
  { id: 'banner', label: '배너', icon: <Flag className="w-4 h-4" /> },
  { id: 'contact', label: '연락', icon: <Users className="w-4 h-4" />, proOnly: true },
  { id: 'activity', label: '활동', icon: <BarChart3 className="w-4 h-4" />, proOnly: true },
];

interface ADHDEntryScreenProps {
  userId?: string;
  onRelationshipInsights: () => void;
  onFuel: (noteId?: string) => void;
}

/**
 * ADHD 모드 진입 화면 (대시보드)
 *
 * 3개 탭으로 구성:
 * - 배너: FuelReminderBanner + PriorityReminderBanner + 각성 문장
 * - 연락 (Pro): 관계 통계 (StatsDashboardView)
 * - 활동 (Pro): 할일 통계 (TodoStatsView)
 */
export default function ADHDEntryScreen({ userId, onRelationshipInsights, onFuel }: ADHDEntryScreenProps) {
  const [activeTab, setActiveTab] = useState<TabType>('banner');
  const { awakeningSentence } = useADHDModeStore();
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
            title={activeTab === 'contact' ? '관계 통계' : '활동 통계'}
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
            <FuelReminderBanner
              userId={userId}
              onFuelClick={(noteId) => onFuel(noteId)}
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

            {/* 안내 메시지 */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-center text-base-content/50 mt-8"
            >
              <p className="text-sm">
                <span className="hidden md:inline">왼쪽 메뉴에서 시작하세요</span>
                <span className="md:hidden">아래 탭에서 시작하세요</span>
              </p>
            </motion.div>
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

  return (
    <div className="min-h-screen flex flex-col bg-base-100 safe-area-top">
      {/* 탭 네비게이션 */}
      <div className="sticky top-0 z-10 bg-base-100 border-b border-base-300">
        <div className="flex overflow-x-auto px-4 py-3 gap-2 scrollbar-hide">
          {TABS.map((tab) => (
            <button
              key={tab.id}
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
          ))}
        </div>
      </div>

      {/* 탭 콘텐츠 */}
      <div className="flex-1 overflow-y-auto px-4">
        {renderContent()}
      </div>
    </div>
  );
}
