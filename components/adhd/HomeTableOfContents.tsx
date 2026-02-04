'use client';

import { Crown } from 'lucide-react';
import { useADHDNavigation } from '@/lib/navigation/adhdNavigation';
import {
  getUIGroupsForTableOfContents,
  type ADHDRouteGroupId,
} from '@/lib/constants/adhd-screens';

/**
 * 홈 목차 화면
 *
 * UI_GROUPS 설정을 기반으로 목차 형태로 표시
 * 화면 이동 시 UI_GROUPS만 수정하면 목차가 자동으로 업데이트됨
 *
 * routeGroup을 기반으로 실제 라우팅 경로 결정:
 * - dashboard → goEntry
 * - project → goProject
 * - fuel → goFuel
 * - relationship → goRelationshipInsights
 */
export default function HomeTableOfContents() {
  const { goEntry, goProject, goFuel, goRelationshipInsights } = useADHDNavigation();

  // routeGroup에 따른 네비게이션 핸들러 매핑
  const navigateByRouteGroup = (routeGroup: ADHDRouteGroupId, subItemId: string) => {
    switch (routeGroup) {
      case 'dashboard':
        goEntry(subItemId);
        break;
      case 'project':
        goProject(subItemId);
        break;
      case 'fuel':
        goFuel(subItemId);
        break;
      case 'relationship':
        goRelationshipInsights(subItemId);
        break;
    }
  };

  // UI_GROUPS와 SCREEN_REGISTRY에서 목차 데이터 생성
  const groups = getUIGroupsForTableOfContents();

  return (
    <div className="min-h-screen bg-base-100 px-4 py-6 sm:px-6 sm:py-8">
      <div className="max-w-lg mx-auto">
        {/* 헤더 */}
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-base-content">
            일상 관리 목차
          </h1>
          <p className="text-sm text-base-content/60 mt-2">
            목차를 클릭하면 해당 페이지로 이동합니다
          </p>
        </header>

        {/* 목차 그룹 */}
        <div className="space-y-6">
          {groups.map((group) => (
            <section key={group.id} className="space-y-2">
              {/* 그룹 제목 (클릭 불가) */}
              <div className="w-full text-left">
                <h2 className="text-lg font-semibold text-base-content">
                  [{group.title}]
                </h2>
                <div className="h-px bg-base-300 mt-1" />
              </div>

              {/* 서브아이템 목록 */}
              <ul className="pl-4 space-y-1">
                {group.subItems.map((item) => (
                  <li key={item.id}>
                    <button
                      onClick={() => navigateByRouteGroup(item.routeGroup, item.id)}
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
