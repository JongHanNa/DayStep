'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { useAuth } from '@/app/context/AuthContext';
import { useReviewStore } from '@/lib/stores/reviewStore';
import { useInboxStore } from '@/state/stores/secondBrain/inboxStore';
import { saveLastVisitedRoute } from '@/lib/capacitor/lastVisitedRoute';
import EmptySection from '@/components/second-brain/review/EmptySection';
import RefreshSection from '@/components/second-brain/review/RefreshSection';
import AddSection from '@/components/second-brain/review/AddSection';

export default function ReviewPage() {
  const { user } = useAuth();
  const { fetchChecklists, fetchStates } = useReviewStore();
  const { fetchInboxItems } = useInboxStore();

  const [expandedSection, setExpandedSection] = useState<'empty' | 'refresh' | 'add' | null>(
    'empty'
  );

  // 경로 저장 (Capacitor 앱 복귀 시 마지막 페이지 복원용)
  useEffect(() => {
    saveLastVisitedRoute('/second-brain/review');
  }, []);

  // 데이터 로드
  useEffect(() => {
    if (user) {
      fetchChecklists(user.id);
      fetchStates(user.id);
      fetchInboxItems(user.id);
    }
  }, [user, fetchChecklists, fetchStates, fetchInboxItems]);

  // 섹션 토글
  const toggleSection = (section: typeof expandedSection) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <AuthGuard requireAuth={true}>
      <div className="min-h-screen bg-base-200 pb-20">
        {/* 헤더 */}
        <div className="sticky top-0 z-10 bg-base-100 border-b border-base-300">
          <div
            className={`max-w-3xl mx-auto px-4 ${
              process.env.BUILD_TARGET === 'mobile' ? 'pt-2 pb-2' : 'py-4'
            }`}
          >
            <p className="text-sm text-base-content/70">주간/월간 점검을 진행하세요</p>
          </div>
        </div>

        {/* 메인 콘텐츠 */}
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
          {/* 1. 비우기 섹션 */}
          <div className="bg-base-100 rounded-lg overflow-hidden">
            <button
              onClick={() => toggleSection('empty')}
              className="w-full p-4 flex items-center justify-between bg-transparent hover:opacity-80 transition-opacity"
            >
              <div className="flex items-center gap-3">
                {expandedSection === 'empty' ? (
                  <ChevronUp className="w-5 h-5" />
                ) : (
                  <ChevronDown className="w-5 h-5" />
                )}
                <h2 className="text-xl font-bold">1. 비우기</h2>
              </div>
            </button>
            {expandedSection === 'empty' && (
              <div className="p-4 pt-0">
                <EmptySection isExpanded={expandedSection === 'empty'} />
              </div>
            )}
          </div>

          {/* 2. 갱신하기 섹션 */}
          <div className="bg-base-100 rounded-lg overflow-hidden">
            <button
              onClick={() => toggleSection('refresh')}
              className="w-full p-4 flex items-center justify-between bg-transparent hover:opacity-80 transition-opacity"
            >
              <div className="flex items-center gap-3">
                {expandedSection === 'refresh' ? (
                  <ChevronUp className="w-5 h-5" />
                ) : (
                  <ChevronDown className="w-5 h-5" />
                )}
                <h2 className="text-xl font-bold">2. 갱신하기</h2>
              </div>
            </button>
            {expandedSection === 'refresh' && (
              <div className="p-4 pt-0">
                <RefreshSection isExpanded={expandedSection === 'refresh'} />
              </div>
            )}
          </div>

          {/* 3. 추가하기 섹션 */}
          <div className="bg-base-100 rounded-lg overflow-hidden">
            <button
              onClick={() => toggleSection('add')}
              className="w-full p-4 flex items-center justify-between bg-transparent hover:opacity-80 transition-opacity"
            >
              <div className="flex items-center gap-3">
                {expandedSection === 'add' ? (
                  <ChevronUp className="w-5 h-5" />
                ) : (
                  <ChevronDown className="w-5 h-5" />
                )}
                <h2 className="text-xl font-bold">3. 추가하기</h2>
              </div>
            </button>
            {expandedSection === 'add' && (
              <div className="p-4 pt-0">
                <AddSection isExpanded={expandedSection === 'add'} />
              </div>
            )}
          </div>
        </div>

      </div>
    </AuthGuard>
  );
}
