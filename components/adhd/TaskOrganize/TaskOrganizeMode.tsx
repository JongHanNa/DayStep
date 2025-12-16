'use client';

import { useState } from 'react';
import { ArrowLeft, Clock, Calendar, Inbox, BarChart3, Network, Sun, Moon } from 'lucide-react';
import { useADHDModeStore } from '@/state/stores/adhdModeStore';
import { useAuth } from '@/app/context/AuthContext';
import { useTheme } from '@/hooks/useTheme';
import { TodoTimelineView } from './TodoTimelineView';
import { TodayPlanView } from './TodayPlanView';
import { OrganizeNeededView } from './OrganizeNeededView';
import { TodoStatsView } from './TodoStatsView';
import { GraphTabView } from './GraphTabView';

type TabType = 'timeline' | 'plan' | 'organize' | 'stats' | 'graph';

const TABS: { id: TabType; label: string; icon: React.ReactNode }[] = [
  { id: 'timeline', label: '타임라인', icon: <Clock className="w-4 h-4" /> },
  { id: 'plan', label: '계획', icon: <Calendar className="w-4 h-4" /> },
  { id: 'organize', label: '정리', icon: <Inbox className="w-4 h-4" /> },
  { id: 'stats', label: '통계', icon: <BarChart3 className="w-4 h-4" /> },
  { id: 'graph', label: '그래프', icon: <Network className="w-4 h-4" /> },
];

interface TaskOrganizeModeProps {
  onExit: () => void;
}

/**
 * 할일 정리 모드 - ADHD 친화적 할일 관리
 *
 * 5개 탭:
 * - 타임라인: 할일 완료/생성 기록 시간순
 * - 계획: 오늘/내일 할 일 정리
 * - 정리: 미분류 할일들 정리
 * - 통계: 완료율, 패턴 분석
 * - 그래프: 전체 구조 시각화
 */
export function TaskOrganizeMode({ onExit }: TaskOrganizeModeProps) {
  const [activeTab, setActiveTab] = useState<TabType>('plan');
  const { user } = useAuth();
  const userId = user?.id;
  const { resolvedTheme, setTheme } = useTheme();

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
      case 'plan':
        return <TodayPlanView userId={userId} />;
      case 'organize':
        return <OrganizeNeededView userId={userId} />;
      case 'stats':
        return <TodoStatsView userId={userId} />;
      case 'graph':
        return <GraphTabView userId={userId} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-base-100 flex flex-col safe-area-top">
      {/* 헤더 */}
      <div className="sticky top-0 z-10 bg-base-100 border-b border-base-200">
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
            </button>
          ))}
        </div>
      </div>

      {/* 콘텐츠 영역 */}
      <div className="flex-1 overflow-y-auto">
        {renderContent()}
      </div>
    </div>
  );
}
