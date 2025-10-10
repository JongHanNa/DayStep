'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGoalStore } from '@/state/stores/secondBrain/goalStore';
import { useAreaStore } from '@/state/stores/secondBrain/areaStore';
import { useOnboardingStore } from '@/state/stores/secondBrain/onboardingStore';
import { Plus, X } from 'lucide-react';
import type { CreateGoalInput } from '@/types/second-brain';
import OnboardingStepNav from '@/components/onboarding/OnboardingStepNav';

export default function OnboardingStep3Page() {
  const router = useRouter();
  const { createGoal, goals } = useGoalStore();
  const { areas, fetchAreas } = useAreaStore();
  const { completeStep, incrementCreatedCount } = useOnboardingStore();

  const [selectedGoals, setSelectedGoals] = useState<Array<{
    title: string;
    description: string;
    areaId?: string;
    timeframe?: 'quarter' | 'year' | '5_years';
  }>>([]);

  const [newGoal, setNewGoal] = useState({
    title: '',
    description: '',
    areaId: '',
    timeframe: 'year' as 'quarter' | 'year' | '5_years',
  });

  useEffect(() => {
    fetchAreas();
  }, [fetchAreas]);

  const handleAddGoal = () => {
    if (!newGoal.title.trim()) {
      alert('목표 제목을 입력해주세요.');
      return;
    }

    setSelectedGoals([...selectedGoals, newGoal]);
    setNewGoal({
      title: '',
      description: '',
      areaId: '',
      timeframe: 'year',
    });
  };

  const handleRemoveGoal = (index: number) => {
    setSelectedGoals(selectedGoals.filter((_, i) => i !== index));
  };

  const handleNext = async () => {
    if (selectedGoals.length === 0) {
      // 목표 없이 건너뛰기 허용
      await completeStep(3);
      router.push('/second-brain/onboarding/step-4');
      return;
    }

    try {
      // 목표들을 생성
      for (const goal of selectedGoals) {
        const goalData: CreateGoalInput = {
          title: goal.title,
          description: goal.description || undefined,
          area_id: goal.areaId || undefined,
          timeframe: goal.timeframe,
          icon: '🎯',
          color: '#4ECDC4',
          status: 'active',
        };
        await createGoal(goalData);
      }

      // 온보딩 3단계에서 생성한 목표 개수 업데이트
      incrementCreatedCount(3, selectedGoals.length);

      // 온보딩 3단계 완료
      await completeStep(3);

      // 다음 단계로 이동
      router.push('/second-brain/onboarding/step-4');
    } catch (error) {
      console.error('목표 생성 실패:', error);
      alert('목표 생성에 실패했습니다.');
    }
  };

  const handleSkip = async () => {
    await completeStep(3);
    router.push('/second-brain/onboarding/step-4');
  };

  return (
    <div className="min-h-screen bg-base-100">
      {/* 스텝 네비게이션 */}
      <div className="sticky top-0 z-10">
        <OnboardingStepNav />
      </div>

      {/* 페이지 헤더 */}
      <div className="bg-base-100 border-b border-base-300">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold mb-2">목표 설정하기</h1>
          <p className="text-sm text-base-content/70">
            달성하고 싶은 목표를 설정하세요 (선택사항)
          </p>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="max-w-3xl mx-auto px-4 py-6 pb-24">
        {/* 이미 생성된 목표 */}
        {goals.length > 0 && (
          <div className="card bg-base-200 mb-6">
            <div className="card-body">
              <h2 className="card-title">이미 생성된 목표 ({goals.length}개)</h2>
              <div className="space-y-2">
                {goals.map((goal) => (
                  <div key={goal.id} className="flex items-center gap-2 p-2 bg-base-100 rounded">
                    <span>{goal.icon}</span>
                    <span className="text-sm font-medium flex-1">{goal.title}</span>
                    <span className="badge badge-sm badge-ghost">
                      {goal.timeframe === 'quarter' ? '분기' :
                       goal.timeframe === 'year' ? '연간' : '5년'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 목표 추가 폼 */}
        <div className="card bg-base-200 mb-6">
          <div className="card-body">
            <h2 className="card-title">새 목표 추가</h2>

            <div className="form-control">
              <label className="label">
                <span className="label-text">목표 제목</span>
              </label>
              <input
                type="text"
                value={newGoal.title}
                onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
                placeholder="예: 앱 출시하여 월 500만원 부수입 달성"
                className="input input-bordered"
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">목표 설명 (선택)</span>
              </label>
              <textarea
                value={newGoal.description}
                onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })}
                placeholder="목표에 대한 자세한 설명을 입력하세요"
                className="textarea textarea-bordered h-20"
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">연결할 영역 (선택)</span>
              </label>
              <select
                value={newGoal.areaId}
                onChange={(e) => setNewGoal({ ...newGoal, areaId: e.target.value })}
                className="select select-bordered"
              >
                <option value="">선택 안 함</option>
                {areas.map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.icon} {area.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">기간</span>
              </label>
              <select
                value={newGoal.timeframe}
                onChange={(e) => setNewGoal({ ...newGoal, timeframe: e.target.value as 'quarter' | 'year' | '5_years' })}
                className="select select-bordered"
              >
                <option value="quarter">분기 (3개월)</option>
                <option value="year">연간 (1년)</option>
                <option value="5_years">장기 (5년)</option>
              </select>
            </div>

            <button onClick={handleAddGoal} className="btn btn-primary mt-4">
              <Plus className="w-4 h-4" />
              목표 추가
            </button>
          </div>
        </div>

        {/* 추가된 목표 목록 */}
        {selectedGoals.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">추가된 목표 ({selectedGoals.length}개)</h2>
            <div className="space-y-3">
              {selectedGoals.map((goal, index) => (
                <div key={index} className="card bg-base-200">
                  <div className="card-body p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold">{goal.title}</h3>
                        {goal.description && (
                          <p className="text-sm text-base-content/70 mt-1">{goal.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          {goal.areaId && (
                            <span className="badge badge-sm">
                              {areas.find((a) => a.id === goal.areaId)?.title}
                            </span>
                          )}
                          <span className="badge badge-sm badge-ghost">
                            {goal.timeframe === 'quarter' ? '분기' : goal.timeframe === 'year' ? '연간' : '5년'}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveGoal(index)}
                        className="btn btn-ghost btn-sm btn-circle"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedGoals.length === 0 && (
          <div className="text-center py-8">
            <p className="text-base-content/50">아직 추가된 목표가 없습니다</p>
            <p className="text-sm text-base-content/30 mt-2">
              목표 없이도 건너뛸 수 있습니다
            </p>
          </div>
        )}
      </div>

      {/* 하단 버튼 */}
      <div className="fixed bottom-0 left-0 right-0 bg-base-100 border-t border-base-300 p-4 safe-area-bottom">
        <div className="max-w-3xl mx-auto flex gap-3">
          <button
            onClick={() => router.push('/second-brain/start')}
            className="btn btn-ghost"
          >
            나가기
          </button>
          {selectedGoals.length === 0 ? (
            <button onClick={handleSkip} className="btn btn-primary flex-1">
              건너뛰고 계속
            </button>
          ) : (
            <button onClick={handleNext} className="btn btn-primary flex-1">
              저장하고 계속 ({selectedGoals.length}개)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
