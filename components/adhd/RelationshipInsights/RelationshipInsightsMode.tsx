'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Heart, MessageCircle, BarChart3, Smile, Sun, Moon } from 'lucide-react';
import { useADHDModeStore } from '@/state/stores/adhdModeStore';
import { useAuth } from '@/app/context/AuthContext';
import { useTheme } from '@/hooks/useTheme';
import { useSubscription } from '@/hooks/useSubscription';
import { Paywall } from '@/components/subscription/Paywall';
import { GratitudeJournalView } from './GratitudeJournalView';
import { NewsMemosView } from './NewsMemosView';
import { StatsDashboardView } from './StatsDashboardView';
import { MoodPatternsView } from './MoodPatternsView';

type TabType = 'gratitude' | 'news' | 'stats' | 'mood';

const TABS: { id: TabType; label: string; icon: React.ReactNode }[] = [
  { id: 'news', label: '소식', icon: <MessageCircle className="w-4 h-4" /> },
  { id: 'gratitude', label: '감사', icon: <Heart className="w-4 h-4" /> },
  { id: 'stats', label: '통계', icon: <BarChart3 className="w-4 h-4" /> },
  { id: 'mood', label: '기분', icon: <Smile className="w-4 h-4" /> },
];

interface RelationshipInsightsModeProps {
  onExit: () => void;
}

export function RelationshipInsightsMode({ onExit }: RelationshipInsightsModeProps) {
  const [activeTab, setActiveTab] = useState<TabType>('news');
  const { user } = useAuth();
  const userId = user?.id;
  const { resolvedTheme, setTheme } = useTheme();
  const { hasActiveSubscription } = useSubscription();

  // Pro 전용 기능 - 무료 사용자는 Paywall 표시
  if (!hasActiveSubscription) {
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
            <h1 className="text-lg font-bold flex-1">관계 기록</h1>
            <button
              onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
              className="btn btn-circle btn-sm btn-ghost"
              aria-label="테마 전환"
            >
              {resolvedTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Paywall */}
        <div className="flex-1 px-4 py-6">
          <Paywall
            featureId="relationship_insights"
            title="관계 인사이트"
            description="관계 패턴 분석과 통계를 확인하세요"
          />
        </div>
      </div>
    );
  }

  const renderContent = () => {
    if (!userId) {
      return (
        <div className="flex items-center justify-center h-64 text-base-content/60">
          로그인이 필요합니다
        </div>
      );
    }

    switch (activeTab) {
      case 'gratitude':
        return <GratitudeJournalView userId={userId} />;
      case 'news':
        return <NewsMemosView userId={userId} />;
      case 'stats':
        return <StatsDashboardView userId={userId} />;
      case 'mood':
        return <MoodPatternsView userId={userId} />;
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
          <h1 className="text-lg font-bold flex-1">관계 기록</h1>
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
