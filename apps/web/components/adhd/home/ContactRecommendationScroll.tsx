'use client';

import { useEffect } from 'react';
import { HeartHandshake } from 'lucide-react';
import { useCherishedPeopleStore } from '@/state/stores/cherishedPeopleStore';
import { RECOMMENDATION_PRIORITY_LABELS } from '@/types/cherished-people';

interface ContactRecommendationScrollProps {
  userId: string;
  onContactClick: () => void;
}

/**
 * 연락 추천 가로 스크롤 컴포넌트
 * 연락이 필요한 소중한 사람 목록을 가로 스크롤로 표시
 */
export default function ContactRecommendationScroll({
  userId,
  onContactClick,
}: ContactRecommendationScrollProps) {
  const { recommendations, isLoadingRecommendations, loadRecommendations } =
    useCherishedPeopleStore();

  useEffect(() => {
    if (userId) {
      loadRecommendations(userId, 7);
    }
  }, [userId, loadRecommendations]);

  // 로딩 중
  if (isLoadingRecommendations) {
    return (
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <HeartHandshake className="w-4 h-4 text-pink-500" />
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">연락할 사람</span>
        </div>
        <div className="h-32 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
      </div>
    );
  }

  // 빈 상태
  if (recommendations.length === 0) {
    return (
      <div className="mb-6 p-4 rounded-2xl bg-pink-50/80 dark:bg-pink-950/20 border border-pink-200/50 dark:border-pink-700/30">
        <div className="flex items-center gap-2 mb-2">
          <HeartHandshake className="w-4 h-4 text-pink-500" />
          <span className="text-xs font-medium text-pink-600 dark:text-pink-400">연락할 사람</span>
        </div>
        <p className="text-sm text-base-content/50">
          연락 추천이 없습니다.{' '}
          <button
            onClick={onContactClick}
            className="text-pink-600 dark:text-pink-400 underline underline-offset-2 hover:text-pink-700"
          >
            등록하기
          </button>
        </p>
      </div>
    );
  }

  return (
    <div className="mb-6 overflow-hidden">
      {/* 헤더 */}
      <div className="flex items-center gap-2 mb-3">
        <HeartHandshake className="w-4 h-4 text-pink-500" />
        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">연락할 사람</span>
        <span className="ml-auto w-5 h-5 rounded-full bg-pink-100 dark:bg-pink-500/20 flex items-center justify-center text-[10px] font-bold text-pink-600 dark:text-pink-400">
          {recommendations.length}
        </span>
      </div>

      {/* 가로 스크롤 카드 */}
      <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 -mx-4 px-4 scrollbar-hide">
        {recommendations.map((rec) => {
          const priorityInfo = RECOMMENDATION_PRIORITY_LABELS[rec.priority];
          const relationRoles = [
            ...(rec.person.relationships ?? []),
            ...(rec.person.roles ?? []),
          ]
            .filter(Boolean)
            .join(', ');

          const contactText =
            rec.daysSinceLastContact === -1
              ? '아직 연락한 적 없음'
              : `${rec.daysSinceLastContact}일 전 마지막 연락`;

          return (
            <div
              key={rec.person.id}
              className="w-[70vw] sm:w-48 snap-start flex-shrink-0 p-3 rounded-2xl bg-white dark:bg-[#242424] border border-gray-100 dark:border-gray-800"
            >
              {/* 우선순위 도트 + 이름 */}
              <div className="flex items-center gap-2 mb-1.5">
                <span
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    rec.priority === 'high'
                      ? 'bg-red-500'
                      : rec.priority === 'medium'
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                  }`}
                />
                <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                  {rec.person.nickname || rec.person.name}
                </span>
              </div>

              {/* 관계/역할 */}
              {relationRoles && (
                <p className="text-xs text-gray-400 dark:text-gray-500 truncate mb-1">
                  {relationRoles}
                </p>
              )}

              {/* 마지막 연락 */}
              <p className="text-xs mb-1.5 text-gray-500 dark:text-gray-400">
                {contactText}
              </p>

              {/* 최근 소식 */}
              {rec.lastInteraction?.recent_news && (
                <p className="text-xs text-gray-400 dark:text-gray-500 line-clamp-2 mb-2">
                  {rec.lastInteraction.recent_news}
                </p>
              )}

              {/* CTA 버튼 */}
              <button
                onClick={onContactClick}
                className="w-full text-xs py-1.5 rounded-lg bg-pink-100/80 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 hover:bg-pink-200 dark:hover:bg-pink-900/50 transition-colors"
              >
                안부 전하기
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
