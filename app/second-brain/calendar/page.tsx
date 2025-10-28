'use client';

import SecondBrainBottomNav from '@/components/layout/SecondBrainBottomNav';

export default function CalendarPage() {
  return (
    <div className="min-h-screen bg-base-100 pb-20">
      {/* 헤더 */}
      <div className="sticky top-0 z-10 bg-base-100 border-b border-base-300">
        <div className={`max-w-3xl mx-auto px-4 ${process.env.BUILD_TARGET === 'mobile' ? 'pt-10 pb-2' : 'py-4'}`}>
          <h1 className="text-2xl font-bold">달력</h1>
          <p className="text-sm text-base-content/70">
            일정을 관리하세요
          </p>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="text-center py-12">
          <p className="text-base-content/50">달력 페이지 (추후 구현)</p>
        </div>
      </div>

      {/* 하단 네비게이션 */}
      <SecondBrainBottomNav />
    </div>
  );
}
