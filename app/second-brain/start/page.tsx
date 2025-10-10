'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useOnboardingStore } from '@/state/stores/secondBrain/onboardingStore';
import SecondBrainBottomNav from '@/components/layout/SecondBrainBottomNav';

export default function SecondBrainStartPage() {
  const router = useRouter();
  const { progress, fetchProgress, startOnboarding } = useOnboardingStore();

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  const handleStartOnboarding = async () => {
    await startOnboarding();
    router.push('/second-brain/onboarding/step-1');
  };

  const handleSkipToMain = () => {
    router.push('/second-brain/inbox');
  };

  return (
    <div className="min-h-screen bg-base-100 pb-20">
      {/* 헤더 */}
      <div className="sticky top-0 z-10 bg-base-100 border-b border-base-300">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold">Second Brain</h1>
          <p className="text-sm text-base-content/70 mt-1">
            GTD + PARA 시스템으로 생산성 극대화
          </p>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* 온보딩 완료 여부에 따른 분기 */}
        {progress?.completed ? (
          <div className="space-y-6">
            <div className="alert alert-success">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="stroke-current shrink-0 h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>온보딩이 완료되었습니다!</span>
            </div>

            <div className="card bg-base-200">
              <div className="card-body">
                <h2 className="card-title">시작하기</h2>
                <p className="text-sm text-base-content/70">
                  Second Brain 시스템을 사용할 준비가 되었습니다.
                </p>
                <div className="card-actions justify-end mt-4">
                  <button onClick={handleSkipToMain} className="btn btn-primary">
                    수집함으로 이동
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* 환영 메시지 */}
            <div className="card bg-gradient-to-br from-primary/10 to-secondary/10">
              <div className="card-body">
                <h2 className="card-title text-2xl">환영합니다! 👋</h2>
                <p className="text-base-content/70">
                  Second Brain은 GTD와 PARA 방법론을 결합하여 <br />
                  여러분의 생산성을 극대화하는 시스템입니다.
                </p>
              </div>
            </div>

            {/* GTD + PARA 설명 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="card bg-base-200">
                <div className="card-body">
                  <h3 className="card-title text-lg">GTD (Getting Things Done)</h3>
                  <ul className="text-sm space-y-2 text-base-content/70">
                    <li>📥 수집 (Collect)</li>
                    <li>🔍 명료화 (Clarify)</li>
                    <li>📋 계획 (Plan)</li>
                    <li>✅ 실행 (Do)</li>
                    <li>🎯 점검 (Review)</li>
                  </ul>
                </div>
              </div>

              <div className="card bg-base-200">
                <div className="card-body">
                  <h3 className="card-title text-lg">PARA</h3>
                  <ul className="text-sm space-y-2 text-base-content/70">
                    <li>📁 프로젝트 (Projects)</li>
                    <li>🎯 영역 (Areas)</li>
                    <li>📚 자원 (Resources)</li>
                    <li>📦 아카이브 (Archive)</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* 온보딩 시작 */}
            <div className="card bg-base-200">
              <div className="card-body">
                <h3 className="card-title">5단계 온보딩</h3>
                <p className="text-sm text-base-content/70">
                  약 5분이면 Second Brain 시스템을 설정할 수 있습니다.
                </p>
                <div className="space-y-2 mt-4">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary text-primary-content flex items-center justify-center text-xs font-bold">
                      1
                    </div>
                    <span className="text-sm">책임 영역 만들기</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-base-300 flex items-center justify-center text-xs">
                      2
                    </div>
                    <span className="text-sm">관심 자원 만들기</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-base-300 flex items-center justify-center text-xs">
                      3
                    </div>
                    <span className="text-sm">목표 설정하기</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-base-300 flex items-center justify-center text-xs">
                      4
                    </div>
                    <span className="text-sm">프로젝트 설정하기</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-base-300 flex items-center justify-center text-xs">
                      5
                    </div>
                    <span className="text-sm">할일 배정하기</span>
                  </div>
                </div>

                <div className="card-actions justify-end mt-6">
                  <button onClick={handleSkipToMain} className="btn btn-ghost">
                    건너뛰기
                  </button>
                  <button onClick={handleStartOnboarding} className="btn btn-primary">
                    온보딩 시작
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 하단 네비게이션 */}
      <SecondBrainBottomNav />
    </div>
  );
}
