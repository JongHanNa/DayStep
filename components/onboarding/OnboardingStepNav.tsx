'use client';

import { useRouter } from 'next/navigation';
import { useOnboardingStore } from '@/state/stores/secondBrain/onboardingStore';
import { useAreaStore } from '@/state/stores/secondBrain/areaStore';
import { useResourceStore } from '@/state/stores/secondBrain/resourceStore';
import { useGoalStore } from '@/state/stores/secondBrain/goalStore';
import { useProjectStore } from '@/state/stores/secondBrain/projectStore';
import { useTodoStore } from '@/state/stores/todoStore';
import { Check, Home } from 'lucide-react';
import type { OnboardingStep } from '@/types/second-brain';

const STEP_INFO: Record<OnboardingStep, { label: string; path: string }> = {
  1: { label: '영역', path: '/second-brain/onboarding/step-1' },
  2: { label: '자원', path: '/second-brain/onboarding/step-2' },
  3: { label: '목표', path: '/second-brain/onboarding/step-3' },
  4: { label: '프로젝트', path: '/second-brain/onboarding/step-4' },
  5: { label: '할일', path: '/second-brain/onboarding/step-5' },
};

export default function OnboardingStepNav() {
  const router = useRouter();
  const { currentStep, goToStep, isStepCompleted, getCompletionRate, createdCounts } = useOnboardingStore();
  const { areas } = useAreaStore();
  const { resources } = useResourceStore();
  const { goals } = useGoalStore();
  const { projects } = useProjectStore();
  const { todos } = useTodoStore();

  const handleStepClick = (step: OnboardingStep) => {
    goToStep(step);
    router.push(STEP_INFO[step].path);
  };

  // 각 단계별 온보딩 중 생성된 항목 개수 (전체 store 개수가 아님!)
  const getStepCount = (step: OnboardingStep): number => {
    const stepKeys: Record<OnboardingStep, keyof typeof createdCounts> = {
      1: 'areas',
      2: 'resources',
      3: 'goals',
      4: 'projects',
      5: 'todos',
    };

    return createdCounts[stepKeys[step]];
  };

  const completedCount = [1, 2, 3, 4].filter((s) => {
    const step = s as OnboardingStep;
    return isStepCompleted(step) && getStepCount(step) > 0;
  }).length;

  return (
    <div className="bg-base-200 border-b border-base-300">
      <div className="max-w-3xl mx-auto px-4 py-4">
        {/* 진행률 */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="text-sm font-medium">온보딩 진행 중</div>
            <button
              onClick={() => router.push('/second-brain/start')}
              className="btn btn-ghost btn-xs"
              title="시작 페이지로 돌아가기"
            >
              <Home className="w-4 h-4" />
            </button>
          </div>
          <div className="text-sm text-base-content/70">
            {completedCount}/4 완료
          </div>
        </div>

        {/* 프로그레스 바 */}
        <progress
          className="progress progress-primary w-full mb-4"
          value={getCompletionRate()}
          max="100"
        />

        {/* 스텝 버튼들 */}
        <div className="flex items-center justify-between gap-2">
          {([1, 2, 3, 4, 5] as OnboardingStep[]).map((step) => {
            const isCompleted = isStepCompleted(step);
            const isCurrent = currentStep === step;
            const info = STEP_INFO[step];
            const count = getStepCount(step);
            const hasItems = count > 0;

            return (
              <button
                key={step}
                onClick={() => handleStepClick(step)}
                className={`flex flex-col items-center gap-1 flex-1 p-2 rounded-lg transition-all ${
                  isCurrent
                    ? 'bg-primary/20 ring-2 ring-primary'
                    : hasItems
                    ? 'bg-success/20 hover:bg-success/30'
                    : isCompleted
                    ? 'bg-base-200 hover:bg-base-300'
                    : 'bg-base-100 hover:bg-base-300'
                }`}
              >
                {/* 숫자/체크 아이콘 */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                    hasItems
                      ? 'bg-success text-success-content'
                      : isCurrent
                      ? 'bg-primary text-primary-content'
                      : 'bg-base-300 text-base-content/50'
                  }`}
                >
                  {hasItems ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    step
                  )}
                </div>

                {/* 라벨 */}
                <div
                  className={`text-xs font-medium ${
                    isCurrent
                      ? 'text-primary'
                      : hasItems
                      ? 'text-success'
                      : 'text-base-content/50'
                  }`}
                >
                  {info.label}
                </div>

                {/* 개수 또는 상태 표시 */}
                <div className={`text-xs ${
                  hasItems
                    ? 'text-success'
                    : isCompleted
                    ? 'text-base-content/40'
                    : 'text-base-content/30'
                }`}>
                  {hasItems ? `${count}개` : isCompleted ? '건너뜀' : '-'}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
