'use client';

import { useAuth } from '@/app/context/AuthContext';
import { useADHDModeStore } from '@/state/stores/adhdModeStore';
import { Crown } from 'lucide-react';

interface SubItem {
  id: string;
  label: string;
  isPro?: boolean;
}

interface GroupItem {
  id: string;
  title: string;
  subItems: SubItem[];
  onNavigate: (subItemId?: string) => void;
}

/**
 * 홈 목차 화면
 *
 * 4개 그룹(대시보드, 미룸방지, 머릿속정리, 관계기록)을 목차 형태로 표시
 * 각 서브아이템 클릭 시 해당 화면의 특정 탭으로 이동
 */
export default function HomeTableOfContents() {
  const { user } = useAuth();
  const {
    enterEntryMode,
    enterProjectMode,
    enterFuelMode,
    enterRelationshipInsightsMode
  } = useADHDModeStore();

  const groups: GroupItem[] = [
    {
      id: 'dashboard',
      title: '대시보드',
      subItems: [
        { id: 'banner', label: '배너' },
        { id: 'contact', label: '연락', isPro: true },
        { id: 'activity', label: '활동', isPro: true },
      ],
      onNavigate: (subItemId?: string) => {
        enterEntryMode(subItemId);
      },
    },
    {
      id: 'project',
      title: '미룸방지',
      subItems: [
        { id: 'ai-plan', label: 'AI 계획' },
        { id: 'ai-chat', label: 'AI 채팅' },
        { id: 'guide', label: '가이드' },
      ],
      onNavigate: (subItemId?: string) => {
        if (user?.id) {
          enterProjectMode(user.id, subItemId);
        }
      },
    },
    {
      id: 'fuel',
      title: '머릿속정리',
      subItems: [
        { id: 'timeline', label: '타임라인' },
        { id: 'execute', label: '실행' },
        { id: 'motivation', label: '원동력' },
        { id: 'organize', label: '정리' },
      ],
      onNavigate: (subItemId?: string) => {
        if (user?.id) {
          enterFuelMode(user.id, undefined, subItemId);
        }
      },
    },
    {
      id: 'relationship',
      title: '관계기록',
      subItems: [
        { id: 'record', label: '기록' },
        { id: 'news', label: '소식', isPro: true },
        { id: 'gratitude', label: '감사', isPro: true },
      ],
      onNavigate: (subItemId?: string) => {
        if (user?.id) {
          enterRelationshipInsightsMode(user.id, subItemId);
        }
      },
    },
  ];

  return (
    <div className="min-h-screen bg-base-100 px-4 py-6 sm:px-6 sm:py-8">
      <div className="max-w-lg mx-auto">
        {/* 헤더 */}
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-base-content">
            DayStep 일상 관리 목차
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
                      onClick={() => group.onNavigate(item.id)}
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
