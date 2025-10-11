'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGoalStore } from '@/state/stores/secondBrain/goalStore';
import { useAreaStore } from '@/state/stores/secondBrain/areaStore';
import { useResourceStore } from '@/state/stores/secondBrain/resourceStore';
import { useOnboardingStore } from '@/state/stores/secondBrain/onboardingStore';
import { Plus, X } from 'lucide-react';
import type { CreateGoalInput } from '@/types/second-brain';
import OnboardingStepNav from '@/components/onboarding/OnboardingStepNav';

export default function OnboardingStep3Page() {
  const router = useRouter();
  const { createGoal, goals } = useGoalStore();
  const { areas, fetchAreas } = useAreaStore();
  const { resources, fetchResources } = useResourceStore();
  const { completeStep, incrementCreatedCount } = useOnboardingStore();

  const [selectedGoals, setSelectedGoals] = useState<Array<{
    title: string;
    status: 'not_started' | 'in_progress' | 'completed' | 'suspended';
    paraSelection?: string; // 'area-{id}' | 'resource-{id}' | ''
    startDate?: string;
    targetDate?: string;
    timeframe?: 'quarter' | 'year' | '5_years';
    targetYear?: number;
    targetQuarter?: 1 | 2 | 3 | 4;
  }>>([]);

  const [newGoal, setNewGoal] = useState({
    title: '',
    status: 'not_started' as 'not_started' | 'in_progress' | 'completed' | 'suspended',
    paraSelection: '', // 'area-{id}' | 'resource-{id}' | ''
    startDate: '',
    targetDate: '',
    timeframe: 'year' as 'quarter' | 'year' | '5_years',
    targetYear: new Date().getFullYear(),
    targetQuarter: 1 as 1 | 2 | 3 | 4,
  });

  useEffect(() => {
    fetchAreas();
    fetchResources();
  }, [fetchAreas, fetchResources]);

  const handleAddGoal = () => {
    if (!newGoal.title.trim()) {
      alert('목표 제목을 입력해주세요.');
      return;
    }

    setSelectedGoals([...selectedGoals, newGoal]);
    setNewGoal({
      title: '',
      status: 'not_started',
      paraSelection: '',
      startDate: '',
      targetDate: '',
      timeframe: 'year',
      targetYear: new Date().getFullYear(),
      targetQuarter: 1,
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
        // paraSelection에서 area_id 또는 resource_id 추출
        let area_id: string | undefined;
        let resource_id: string | undefined;

        if (goal.paraSelection) {
          if (goal.paraSelection.startsWith('area-')) {
            area_id = goal.paraSelection.replace('area-', '');
          } else if (goal.paraSelection.startsWith('resource-')) {
            resource_id = goal.paraSelection.replace('resource-', '');
          }
        }

        const goalData: CreateGoalInput = {
          title: goal.title,
          status: goal.status,
          area_id,
          resource_id,
          start_date: goal.startDate || undefined,
          target_date: goal.targetDate || undefined,
          timeframe: goal.timeframe,
          target_year: goal.targetYear || undefined,
          target_quarter: goal.targetQuarter || undefined,
          icon: '🎯',
          color: '#4ECDC4',
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
                placeholder="예: 충동적 행동 30% 감소"
                className="input input-bordered"
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">상태</span>
              </label>
              <select
                value={newGoal.status}
                onChange={(e) => setNewGoal({ ...newGoal, status: e.target.value as 'not_started' | 'in_progress' | 'completed' | 'suspended' })}
                className="select select-bordered"
              >
                <option value="not_started">시작 안함</option>
                <option value="in_progress">진행중</option>
                <option value="completed">완료</option>
                <option value="suspended">중단</option>
              </select>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">연결할 영역/자원 (선택)</span>
              </label>
              <select
                value={newGoal.paraSelection}
                onChange={(e) => setNewGoal({ ...newGoal, paraSelection: e.target.value })}
                className="select select-bordered"
              >
                <option value="">선택 안 함</option>
                <optgroup label="영역">
                  {areas.map((area) => (
                    <option key={area.id} value={`area-${area.id}`}>
                      {area.icon} {area.title}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="자원">
                  {resources.map((resource) => (
                    <option key={resource.id} value={`resource-${resource.id}`}>
                      {resource.icon} {resource.title}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">시작일 (선택)</span>
                </label>
                <input
                  type="date"
                  value={newGoal.startDate}
                  onChange={(e) => setNewGoal({ ...newGoal, startDate: e.target.value })}
                  className="input input-bordered"
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">종료일 (선택)</span>
                </label>
                <input
                  type="date"
                  value={newGoal.targetDate}
                  onChange={(e) => setNewGoal({ ...newGoal, targetDate: e.target.value })}
                  className="input input-bordered"
                />
              </div>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">연간목표 (선택)</span>
                </label>
                <select
                  value={newGoal.targetYear}
                  onChange={(e) => setNewGoal({ ...newGoal, targetYear: parseInt(e.target.value) })}
                  className="select select-bordered"
                >
                  {Array.from({ length: 6 }, (_, i) => {
                    const year = new Date().getFullYear() + i;
                    return (
                      <option key={year} value={year}>
                        {year}년
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">분기목표 (선택)</span>
                </label>
                <select
                  value={newGoal.targetQuarter}
                  onChange={(e) => setNewGoal({ ...newGoal, targetQuarter: parseInt(e.target.value) as 1 | 2 | 3 | 4 })}
                  className="select select-bordered"
                >
                  <option value={1}>1분기 (1~3월)</option>
                  <option value={2}>2분기 (4~6월)</option>
                  <option value={3}>3분기 (7~9월)</option>
                  <option value={4}>4분기 (10~12월)</option>
                </select>
              </div>
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
              {selectedGoals.map((goal, index) => {
                const statusLabels = {
                  not_started: '시작 안함',
                  in_progress: '진행중',
                  completed: '완료',
                  suspended: '중단',
                };

                // paraSelection 파싱
                let paraLabel: string | null = null;
                if (goal.paraSelection) {
                  if (goal.paraSelection.startsWith('area-')) {
                    const areaId = goal.paraSelection.replace('area-', '');
                    const area = areas.find((a) => a.id === areaId);
                    if (area) paraLabel = `영역: ${area.title}`;
                  } else if (goal.paraSelection.startsWith('resource-')) {
                    const resourceId = goal.paraSelection.replace('resource-', '');
                    const resource = resources.find((r) => r.id === resourceId);
                    if (resource) paraLabel = `자원: ${resource.title}`;
                  }
                }

                return (
                  <div key={index} className="card bg-base-200">
                    <div className="card-body p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold">{goal.title}</h3>
                            <span className="badge badge-sm badge-primary">
                              {statusLabels[goal.status]}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            {paraLabel && (
                              <span className="badge badge-sm">
                                {paraLabel}
                              </span>
                            )}
                            {goal.startDate && (
                              <span className="badge badge-sm badge-ghost">
                                시작: {new Date(goal.startDate).toLocaleDateString('ko-KR')}
                              </span>
                            )}
                            {goal.targetDate && (
                              <span className="badge badge-sm badge-ghost">
                                종료: {new Date(goal.targetDate).toLocaleDateString('ko-KR')}
                              </span>
                            )}
                            <span className="badge badge-sm badge-ghost">
                              {goal.timeframe === 'quarter' ? '분기' : goal.timeframe === 'year' ? '연간' : '5년'}
                            </span>
                            {goal.targetYear && (
                              <span className="badge badge-sm badge-accent">
                                {goal.targetYear}년
                              </span>
                            )}
                            {goal.targetQuarter && (
                              <span className="badge badge-sm badge-accent">
                                {goal.targetQuarter}분기
                              </span>
                            )}
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
                );
              })}
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
