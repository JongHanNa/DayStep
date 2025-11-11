'use client';

import { AuthGuard } from '@/components/auth/AuthGuard';
import SecondBrainBottomNav from '@/components/layout/SecondBrainBottomNav';
import { Archive } from 'lucide-react';

export default function ArchivePage() {
  return (
    <AuthGuard requireAuth={true}>
      <div className="min-h-screen bg-base-100 pb-20">
        {/* 헤더 */}
        <div className="sticky top-0 z-10 bg-base-100 border-b border-base-300">
          <div className={`max-w-3xl mx-auto px-4 ${process.env.BUILD_TARGET === 'mobile' ? 'pt-10 pb-2' : 'py-4'}`}>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">아카이브</h1>
              </div>
              <Archive className="w-6 h-6 text-base-content/50" />
            </div>
          </div>
        </div>

        {/* 메인 콘텐츠 */}
        <div className="max-w-3xl mx-auto px-4 py-6">
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📦</div>
            <p className="text-lg text-base-content/70">개발 예정</p>
          </div>
        </div>

        {/* 하단 네비게이션 */}
        <SecondBrainBottomNav />
      </div>
    </AuthGuard>
  );
}
