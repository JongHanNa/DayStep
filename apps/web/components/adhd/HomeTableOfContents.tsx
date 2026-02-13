'use client';

import { useEffect } from 'react';
import { Crown, Calendar, Inbox, type LucideIcon } from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import { useADHDNavigation } from '@/lib/navigation/adhdNavigation';
import { useADHDStore } from '@/state/stores/adhdStore';
import { useTodoStore } from '@/state/stores/todoStore';
import {
  getUIGroupsForTableOfContents,
  type ADHDSubViewId,
  type ADHDGroupId,
} from '@/lib/constants/adhd-screens';
import { FuelQuoteCard, ContactRecommendationScroll, TodayStatusPanel } from './home';

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
      className={`group cursor-pointer rounded-2xl bg-white dark:bg-[#242424] p-4
        shadow-sm border border-gray-100 dark:border-gray-800
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
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-500/15 text-amber-500 text-[10px] font-semibold">
            <Crown className="w-3 h-3" />
            PRO
          </span>
        )}
      </div>
      <h3 className="font-semibold text-sm text-gray-900 dark:text-white mb-1">{label}</h3>
      {shortDescription && (
        <p className="text-xs text-gray-400 dark:text-gray-500 leading-relaxed">
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
  const stats = useTodoStore((s) => s.stats);
  const fetchTodosIfNeeded = useTodoStore((s) => s.fetchTodosIfNeeded);

  useEffect(() => {
    fetchTodosIfNeeded();
  }, [fetchTodosIfNeeded]);

  const groups = getUIGroupsForTableOfContents();

  const completed = stats.completedCount;
  const pending = stats.pendingCount;
  const total = stats.totalCount;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="flex-1 flex flex-col lg:flex-row overflow-auto bg-base-100 safe-area-top">
      {/* Main Content */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        {/* 히어로: 원형 프로그레스 + 인사말 가로 배치 */}
        <section className="mb-6 sm:mb-8">
          <div className="flex items-center gap-5 sm:gap-6">
            {/* 원형 프로그레스 SVG */}
            <div className="relative flex-shrink-0">
              <svg className="w-20 h-20 sm:w-24 sm:h-24 -rotate-90" viewBox="0 0 88 88">
                <circle
                  cx="44" cy="44" r="40" strokeWidth="5" fill="none"
                  className="stroke-gray-200 dark:stroke-gray-700"
                />
                <circle
                  cx="44" cy="44" r="40" strokeWidth="5" fill="none"
                  strokeLinecap="round"
                  className="stroke-indigo-500"
                  strokeDasharray="251"
                  strokeDashoffset={251 - (251 * completionRate / 100)}
                  style={{ transition: 'stroke-dashoffset 1s ease-out' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-lg sm:text-xl font-bold text-indigo-600 dark:text-indigo-400">
                  {completed}/{total}
                </span>
                <span className="text-[10px] text-gray-400">완료</span>
              </div>
            </div>

            {/* 인사말 + 날짜 */}
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                {getTimeGreeting()}
              </h1>
              <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-1">
                {getFormattedDate()}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                오늘 할일 {pending}개 남았어요
              </p>
            </div>
          </div>

          {awakeningSentence && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-4 italic">
              &ldquo;{awakeningSentence}&rdquo;
            </p>
          )}
        </section>

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
              bg-gradient-to-r from-indigo-500 to-purple-600
              text-white text-sm font-semibold
              shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:brightness-110
              active:scale-[0.97] transition-all duration-200"
          >
            <Calendar className="w-4 h-4" />
            오늘 계획 세우기 &rarr;
          </button>
          <button
            onClick={() => goScreen('organize')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl
              bg-white dark:bg-[#242424] border border-gray-200 dark:border-gray-700
              text-gray-700 dark:text-gray-300 text-sm font-medium
              hover:bg-gray-50 dark:hover:bg-gray-800 active:scale-[0.97]
              transition-all duration-200"
          >
            <Inbox className="w-4 h-4" />
            할일 정리
          </button>
        </div>

        {/* 모바일 오늘의 현황 (lg 미만) */}
        <div className="mb-8">
          <TodayStatusPanel variant="mobile" />
        </div>

        {/* 목차 그룹 — 카드 그리드 */}
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
                  <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
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
      </main>

      {/* Right Panel: lg+ only — TodayStatusPanel desktop version */}
      <TodayStatusPanel variant="desktop" />
    </div>
  );
}
