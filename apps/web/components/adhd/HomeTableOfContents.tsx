'use client';

import { Crown, Calendar, Target, Inbox, type LucideIcon } from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import { useADHDNavigation } from '@/lib/navigation/adhdNavigation';
import { useADHDStore } from '@/state/stores/adhdStore';
import {
  getUIGroupsForTableOfContents,
  type ADHDSubViewId,
  type ADHDGroupId,
} from '@/lib/constants/adhd-screens';
import { FuelQuoteCard, ContactRecommendationScroll } from './home';

// ============================================================================
// 섹션별 색상 매핑
// ============================================================================

const SECTION_COLORS: Record<
  ADHDGroupId,
  {
    dot: string;
    iconBg: string;
    iconText: string;
    hoverBorder: string;
    hoverBg: string;
    line: string;
  }
> = {
  project: {
    dot: 'bg-blue-500',
    iconBg: 'bg-blue-50 dark:bg-blue-500/15',
    iconText: 'text-blue-500',
    hoverBorder: 'hover:border-blue-200 dark:hover:border-blue-800',
    hoverBg: 'hover:bg-blue-50/30 dark:hover:bg-blue-950/20',
    line: 'bg-blue-500/20',
  },
  memory: {
    dot: 'bg-violet-500',
    iconBg: 'bg-violet-50 dark:bg-violet-500/15',
    iconText: 'text-violet-500',
    hoverBorder: 'hover:border-violet-200 dark:hover:border-violet-800',
    hoverBg: 'hover:bg-violet-50/30 dark:hover:bg-violet-950/20',
    line: 'bg-violet-500/20',
  },
  care: {
    dot: 'bg-emerald-500',
    iconBg: 'bg-emerald-50 dark:bg-emerald-500/15',
    iconText: 'text-emerald-500',
    hoverBorder: 'hover:border-emerald-200 dark:hover:border-emerald-800',
    hoverBg: 'hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20',
    line: 'bg-emerald-500/20',
  },
};

// ============================================================================
// 시간 기반 인사말
// ============================================================================

function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 6) return '고요한 새벽이에요 \u{1F319}';
  if (hour < 12) return '좋은 아침이에요 \u{2600}\u{FE0F}';
  if (hour < 18) return '좋은 오후예요 \u{1F324}\u{FE0F}';
  return '좋은 저녁이에요 \u{1F319}';
}

function getFormattedDate(): string {
  const now = new Date();
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일 ${days[now.getDay()]}요일`;
}

// ============================================================================
// 카드 컴포넌트
// ============================================================================

function FeatureCard({
  icon: Icon,
  label,
  shortDescription,
  isPro,
  colors,
  onClick,
}: {
  icon?: LucideIcon;
  label: string;
  shortDescription?: string;
  isPro?: boolean;
  colors: (typeof SECTION_COLORS)[ADHDGroupId];
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`group cursor-pointer rounded-2xl bg-base-200 p-4
        shadow-sm border border-base-300/50
        ${colors.hoverBorder} ${colors.hoverBg}
        hover:shadow-md hover:-translate-y-0.5 active:scale-[0.97]
        transition-all duration-200 text-left w-full`}
    >
      <div className="flex items-start justify-between mb-3">
        {Icon && (
          <div
            className={`w-10 h-10 rounded-xl ${colors.iconBg}
              flex items-center justify-center ${colors.iconText}
              group-hover:scale-110 transition-transform duration-200`}
          >
            <Icon className="w-5 h-5" />
          </div>
        )}
        {isPro && (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-warning/15 text-warning text-[10px] font-bold">
            <Crown className="w-3 h-3" />
            PRO
          </span>
        )}
      </div>
      <h3 className="font-semibold text-sm text-base-content mb-1">{label}</h3>
      {shortDescription && (
        <p className="text-xs text-base-content/40 leading-relaxed">
          {shortDescription}
        </p>
      )}
    </button>
  );
}

// ============================================================================
// 메인 컴포넌트
// ============================================================================

export default function HomeTableOfContents() {
  const { user } = useAuth();
  const { goScreen, goRelationshipInsights, goFuel } = useADHDNavigation();
  const { awakeningSentence } = useADHDStore();

  const groups = getUIGroupsForTableOfContents();

  return (
    <div className="min-h-screen bg-base-100 px-4 py-6 sm:px-6 sm:py-8 safe-area-top">
      <div className="max-w-5xl mx-auto">
        {/* 인사말 헤더 */}
        <header className="mb-6">
          <p className="text-sm text-base-content/50 mb-1">
            {getFormattedDate()}
          </p>
          <h1 className="text-2xl font-bold text-base-content">
            {getTimeGreeting()}
          </h1>
          {awakeningSentence && (
            <p className="text-sm text-base-content/70 mt-3 italic">
              &ldquo;{awakeningSentence}&rdquo;
            </p>
          )}
        </header>

        {/* 원동력 인라인 */}
        {user?.id && (
          <FuelQuoteCard
            userId={user.id}
            onFuelClick={() => goFuel('motivation')}
          />
        )}

        {/* 연락 추천 가로 스크롤 */}
        {user?.id && (
          <ContactRecommendationScroll
            userId={user.id}
            onContactClick={() => goRelationshipInsights()}
          />
        )}

        {/* 빠른 액션 버튼 */}
        <div className="flex flex-wrap gap-2 mb-8">
          <button
            onClick={() => goScreen('daily-planner')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl
              bg-gradient-to-r from-primary to-purple-600
              text-primary-content text-sm font-semibold
              shadow-md hover:shadow-lg hover:brightness-110
              active:scale-[0.97] transition-all duration-200"
          >
            <Calendar className="w-4 h-4" />
            오늘 계획 세우기 &rarr;
          </button>
          <button
            onClick={() => goScreen('execute')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl
              bg-base-200 border border-base-300
              text-base-content text-sm font-medium
              hover:bg-base-300 active:scale-[0.97]
              transition-all duration-200"
          >
            <Target className="w-4 h-4" />
            집중 실행
          </button>
          <button
            onClick={() => goScreen('organize')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl
              bg-base-200 border border-base-300
              text-base-content text-sm font-medium
              hover:bg-base-300 active:scale-[0.97]
              transition-all duration-200"
          >
            <Inbox className="w-4 h-4" />
            할일 정리
          </button>
        </div>

        {/* 목차 그룹 — 글래스 카드 그리드 */}
        <div className="space-y-8">
          {groups.map((group) => {
            const colors = SECTION_COLORS[group.id as ADHDGroupId];
            return (
              <section key={group.id}>
                {/* 섹션 헤더 */}
                <div className="flex items-center gap-2 mb-4">
                  <span
                    className={`w-2 h-2 rounded-full ${colors.dot} shrink-0`}
                  />
                  <h2 className="text-sm font-semibold text-base-content/70 uppercase tracking-wider">
                    {group.title}
                  </h2>
                  <div className={`flex-1 h-px ${colors.line}`} />
                </div>

                {/* 카드 그리드 */}
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                  {group.subItems.map((item) => (
                    <FeatureCard
                      key={item.id}
                      icon={item.icon}
                      label={item.label}
                      shortDescription={item.shortDescription}
                      isPro={item.isPro}
                      colors={colors}
                      onClick={() => goScreen(item.id as ADHDSubViewId)}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
