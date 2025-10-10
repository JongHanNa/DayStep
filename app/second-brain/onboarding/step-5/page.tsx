'use client';

import { useRouter } from 'next/navigation';
import { useOnboardingStore } from '@/state/stores/secondBrain/onboardingStore';
import { CheckCircle } from 'lucide-react';

export default function OnboardingStep5Page() {
  const router = useRouter();
  const { completeStep } = useOnboardingStore();

  const handleComplete = async () => {
    try {
      // 온보딩 5단계 완료
      await completeStep(5);

      // 완료 후 시작 페이지로 이동
      router.push('/second-brain/start');
    } catch (error) {
      console.error('온보딩 완료 실패:', error);
      alert('온보딩 완료에 실패했습니다.');
    }
  };

  return (
    <div className="min-h-screen bg-base-100">
      {/* 헤더 */}
      <div className="sticky top-0 z-10 bg-base-100 border-b border-base-300">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-bold">온보딩 완료!</h1>
            <span className="text-sm text-base-content/50">5/5</span>
          </div>
          <p className="text-sm text-base-content/70">
            Second Brain 시스템 설정이 완료되었습니다
          </p>
          <progress className="progress progress-primary w-full mt-2" value="100" max="100" />
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="max-w-3xl mx-auto px-4 py-6 pb-24">
        {/* 완료 메시지 */}
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-success/20 mb-6">
            <CheckCircle className="w-16 h-16 text-success" />
          </div>
          <h2 className="text-3xl font-bold mb-4">축하합니다! 🎉</h2>
          <p className="text-lg text-base-content/70 mb-8">
            Second Brain 시스템 설정이 완료되었습니다.
          </p>
        </div>

        {/* 다음 단계 안내 */}
        <div className="card bg-gradient-to-br from-primary/10 to-secondary/10 mb-6">
          <div className="card-body">
            <h3 className="card-title">이제 무엇을 할까요?</h3>
            <div className="space-y-4 mt-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-content flex items-center justify-center flex-shrink-0">
                  1
                </div>
                <div>
                  <div className="font-semibold">수집함에 항목 추가</div>
                  <div className="text-sm text-base-content/70">
                    머릿속에 떠오르는 모든 것을 수집함에 담아보세요
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-content flex items-center justify-center flex-shrink-0">
                  2
                </div>
                <div>
                  <div className="font-semibold">명료화 프로세스 시작</div>
                  <div className="text-sm text-base-content/70">
                    수집한 항목들을 분류하고 실행 가능한 할일로 변환하세요
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-content flex items-center justify-center flex-shrink-0">
                  3
                </div>
                <div>
                  <div className="font-semibold">타임라인에서 실행</div>
                  <div className="text-sm text-base-content/70">
                    계획한 할일들을 타임라인에서 실행하고 완료하세요
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-content flex items-center justify-center flex-shrink-0">
                  4
                </div>
                <div>
                  <div className="font-semibold">정기적으로 점검</div>
                  <div className="text-sm text-base-content/70">
                    주간/월간 점검으로 시스템을 최신 상태로 유지하세요
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* GTD + PARA 요약 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card bg-base-200">
            <div className="card-body">
              <h3 className="card-title text-lg">GTD 워크플로우</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <span className="text-primary">→</span>
                  수집 (Collect)
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-primary">→</span>
                  명료화 (Clarify)
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-primary">→</span>
                  계획 (Plan)
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-primary">→</span>
                  실행 (Do)
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-primary">→</span>
                  점검 (Review)
                </li>
              </ul>
            </div>
          </div>

          <div className="card bg-base-200">
            <div className="card-body">
              <h3 className="card-title text-lg">PARA 구조</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <span className="text-primary">→</span>
                  Projects (프로젝트)
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-primary">→</span>
                  Areas (영역)
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-primary">→</span>
                  Resources (자원)
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-primary">→</span>
                  Archive (아카이브)
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* 하단 버튼 */}
      <div className="fixed bottom-0 left-0 right-0 bg-base-100 border-t border-base-300 p-4 safe-area-bottom">
        <div className="max-w-3xl mx-auto flex gap-3">
          <button onClick={() => router.push('/second-brain/onboarding/step-4')} className="btn btn-ghost flex-1">
            이전
          </button>
          <button onClick={handleComplete} className="btn btn-primary flex-1">
            완료하고 시작하기
          </button>
        </div>
      </div>
    </div>
  );
}
