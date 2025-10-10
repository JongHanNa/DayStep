'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGoalStore } from '@/state/stores/secondBrain/goalStore';
import { useAreaStore } from '@/state/stores/secondBrain/areaStore';
import { useOnboardingStore } from '@/state/stores/secondBrain/onboardingStore';
import { Plus, X } from 'lucide-react';
import type { CreateGoalInput } from '@/types/second-brain';

export default function OnboardingStep3Page() {
  const router = useRouter();
  const { createGoal } = useGoalStore();
  const { areas, fetchAreas } = useAreaStore();
  const { completeStep } = useOnboardingStore();

  const [goals, setGoals] = useState<Array<{
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

    setGoals([...goals, newGoal]);
    setNewGoal({
      title: '',
      description: '',
      areaId: '',
      timeframe: 'year',
    });
  };

  const handleRemoveGoal = (index: number) => {
    setGoals(goals.filter((_, i) => i !== index));
  };

  const handleNext = async () => {
    if (goals.length === 0) {
      // 목표 없이 건너뛰기 허용
      await completeStep(3);
      router.push('/second-brain/onboarding/step-4');
      return;
    }

    try {
      // 목표들을 생성
      for (const goal of goals) {
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
      {/* 헤더 */}
      <div className="sticky top-0 z-10 bg-base-100 border-b border-base-300">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-bold">목표 설정하기</h1>
            <span className="text-sm text-base-content/50">3/5</span>
          </div>
          <p className="text-sm text-base-content/70">
            달성하고 싶은 목표를 설정하세요 (선택사항)
          </p>
          <progress className="progress progress-primary w-full mt-2" value="60" max="100" />
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="max-w-3xl mx-auto px-4 py-6 pb-24">
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
        {goals.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">추가된 목표 ({goals.length}개)</h2>
            <div className="space-y-3">
              {goals.map((goal, index) => (
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

        {goals.length === 0 && (
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
          <button onClick={() => router.push('/second-brain/onboarding/step-2')} className="btn btn-ghost flex-1">
            이전
          </button>
          {goals.length === 0 ? (
            <button onClick={handleSkip} className="btn btn-primary flex-1">
              건너뛰기
            </button>
          ) : (
            <button onClick={handleNext} className="btn btn-primary flex-1">
              다음 ({goals.length}개 추가됨)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
