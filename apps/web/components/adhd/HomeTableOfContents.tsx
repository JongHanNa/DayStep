'use client';

import { Crown } from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import { useADHDNavigation } from '@/lib/navigation/adhdNavigation';
import { useADHDStore } from '@/state/stores/adhdStore';
import {
  getUIGroupsForTableOfContents,
  type ADHDSubViewId,
} from '@/lib/constants/adhd-screens';
import { FuelQuoteCard, ContactRecommendationScroll } from './home';

/**
 * 홈 목차 화면 (시안 A-2)
 *
 * UI_GROUPS 설정을 기반으로 목차 형태로 표시
 * 원동력 인용문과 연락 추천을 메인 영역 상단에 인라인 노출
 * 모바일/데스크탑 동일한 단일 스크롤 레이아웃
 */
export default function HomeTableOfContents() {
  const { user } = useAuth();
  const { goScreen, goRelationshipInsights, goFuel } = useADHDNavigation();
  const { awakeningSentence } = useADHDStore();

  const groups = getUIGroupsForTableOfContents();

  return (
    <div className="min-h-screen bg-base-100 px-4 py-6 sm:px-6 sm:py-8 safe-area-top">
      <div className="max-w-lg mx-auto">
        {/* 헤더 + 각성 문장 */}
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-base-content">
            일상 관리 목차
          </h1>
          <p className="text-sm text-base-content/60 mt-2">
            목차를 클릭하면 해당 페이지로 이동합니다
          </p>
          {awakeningSentence && (
            <p className="text-sm text-base-content/70 mt-3 italic">
              &ldquo;{awakeningSentence}&rdquo;
            </p>
          )}
        </header>

        {/* A-2: 원동력 인라인 */}
        {user?.id && (
          <FuelQuoteCard
            userId={user.id}
            onFuelClick={() => goFuel('motivation')}
          />
        )}

        {/* A-2: 연락 추천 가로 스크롤 */}
        {user?.id && (
          <ContactRecommendationScroll
            userId={user.id}
            onContactClick={() => goRelationshipInsights()}
          />
        )}

        {/* 기존 목차 그룹 */}
        <div className="space-y-6">
          {groups.map((group) => (
            <section key={group.id} className="space-y-2">
              <div className="w-full text-left">
                <h2 className="text-lg font-semibold text-base-content">
                  [{group.title}]
                </h2>
                <div className="h-px bg-base-300 mt-1" />
              </div>

              <ul className="pl-4 space-y-1">
                {group.subItems.map((item) => (
                  <li key={item.id}>
                    <button
                      onClick={() => goScreen(item.id as ADHDSubViewId)}
                      className="flex items-center gap-2 text-base-content/80 hover:text-primary transition-colors py-1"
                    >
                      <span className="text-base">{item.label}</span>
                      {item.isPro && (
                        <Crown className="w-4 h-4 text-warning" />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
