'use client';

import { useEffect } from 'react';
import { useGoalStore } from '@/state/stores/secondBrain/goalStore';
import { useProjectStore } from '@/state/stores/secondBrain/projectStore';
import SecondBrainBottomNav from '@/components/layout/SecondBrainBottomNav';
import { Target, Plus } from 'lucide-react';

export default function GoalsPage() {
  const { goals, fetchGoals } = useGoalStore();
  const { projects, fetchProjects } = useProjectStore();

  useEffect(() => {
    fetchGoals();
    fetchProjects();
  }, [fetchGoals, fetchProjects]);

  return (
    <div className="min-h-screen bg-base-100 pb-20">
      {/* 헤더 */}
      <div className="sticky top-0 z-10 bg-base-100 border-b border-base-300">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">목표 나침반</h1>
            <p className="text-sm text-base-content/70">
              {goals.length}개의 목표
            </p>
          </div>
          <button className="btn btn-primary btn-sm">
            <Plus className="w-4 h-4" />
            추가
          </button>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="max-w-3xl mx-auto px-4 py-6">
        {goals.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🎯</div>
            <p className="text-base-content/50">아직 설정된 목표가 없습니다</p>
            <p className="text-sm text-base-content/30 mt-2">
              + 버튼을 눌러 새로운 목표를 추가하세요
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {goals.map((goal) => {
              const relatedProjects = projects.filter((p) => p.area_id === goal.area_id);

              return (
                <div key={goal.id} className="card bg-gradient-to-br from-primary/10 to-secondary/10">
                  <div className="card-body">
                    <div className="flex items-start gap-3">
                      <div className="text-3xl">{goal.icon || '🎯'}</div>
                      <div className="flex-1">
                        <h2 className="card-title">{goal.title}</h2>
                        {goal.description && (
                          <p className="text-sm text-base-content/70 mt-1">{goal.description}</p>
                        )}

                        {/* 목표 메타 정보 */}
                        <div className="flex items-center gap-2 mt-3">
                          {goal.timeframe && (
                            <span className="badge badge-sm">
                              {goal.timeframe === 'quarter' ? '분기' :
                               goal.timeframe === 'year' ? '연간' : '5년'}
                            </span>
                          )}
                          {goal.area && (
                            <span className="badge badge-sm badge-ghost">
                              {goal.area.icon} {goal.area.title}
                            </span>
                          )}
                        </div>

                        {/* 진행도 */}
                        <div className="mt-4">
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="text-base-content/60">진행도</span>
                            <span className="font-semibold">{goal.progress}%</span>
                          </div>
                          <progress
                            className="progress progress-primary w-full"
                            value={goal.progress}
                            max="100"
                          />
                        </div>

                        {/* 연결된 프로젝트 */}
                        {relatedProjects.length > 0 && (
                          <div className="mt-4">
                            <p className="text-xs text-base-content/50 mb-2">
                              연결된 프로젝트 ({relatedProjects.length})
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {relatedProjects.slice(0, 3).map((project) => (
                                <span key={project.id} className="badge badge-sm">
                                  {project.icon} {project.title}
                                </span>
                              ))}
                              {relatedProjects.length > 3 && (
                                <span className="badge badge-sm badge-ghost">
                                  +{relatedProjects.length - 3}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 하단 네비게이션 */}
      <SecondBrainBottomNav />
    </div>
  );
}
