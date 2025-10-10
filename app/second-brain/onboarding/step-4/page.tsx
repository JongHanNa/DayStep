'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useProjectStore } from '@/state/stores/secondBrain/projectStore';
import { useAreaStore } from '@/state/stores/secondBrain/areaStore';
import { useOnboardingStore } from '@/state/stores/secondBrain/onboardingStore';
import { Plus, X } from 'lucide-react';
import type { CreateProjectInput } from '@/types/second-brain';
import OnboardingStepNav from '@/components/onboarding/OnboardingStepNav';

export default function OnboardingStep4Page() {
  const router = useRouter();
  const { createProject, projects } = useProjectStore();
  const { areas, fetchAreas } = useAreaStore();
  const { completeStep, incrementCreatedCount } = useOnboardingStore();

  const [selectedProjects, setSelectedProjects] = useState<Array<{
    title: string;
    description: string;
    areaId?: string;
  }>>([]);

  const [newProject, setNewProject] = useState({
    title: '',
    description: '',
    areaId: '',
  });

  useEffect(() => {
    fetchAreas();
  }, [fetchAreas]);

  const handleAddProject = () => {
    if (!newProject.title.trim()) {
      alert('프로젝트 제목을 입력해주세요.');
      return;
    }

    setSelectedProjects([...selectedProjects, newProject]);
    setNewProject({
      title: '',
      description: '',
      areaId: '',
    });
  };

  const handleRemoveProject = (index: number) => {
    setSelectedProjects(selectedProjects.filter((_, i) => i !== index));
  };

  const handleNext = async () => {
    if (selectedProjects.length === 0) {
      // 프로젝트 없이 건너뛰기 허용
      await completeStep(4);
      router.push('/second-brain/onboarding/step-5');
      return;
    }

    try {
      // 프로젝트들을 생성
      for (const [index, project] of selectedProjects.entries()) {
        const projectData: CreateProjectInput = {
          title: project.title,
          description: project.description || undefined,
          area_id: project.areaId || undefined,
          status: 'active',
          icon: '📁',
          color: '#95E1D3',
          order_index: index,
        };
        await createProject(projectData);
      }

      // 온보딩 4단계에서 생성한 프로젝트 개수 업데이트
      incrementCreatedCount(4, selectedProjects.length);

      // 온보딩 4단계 완료
      await completeStep(4);

      // 다음 단계로 이동
      router.push('/second-brain/onboarding/step-5');
    } catch (error) {
      console.error('프로젝트 생성 실패:', error);
      alert('프로젝트 생성에 실패했습니다.');
    }
  };

  const handleSkip = async () => {
    await completeStep(4);
    router.push('/second-brain/onboarding/step-5');
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
          <h1 className="text-2xl font-bold mb-2">프로젝트 설정하기</h1>
          <p className="text-sm text-base-content/70">
            진행 중인 프로젝트를 추가하세요 (선택사항)
          </p>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="max-w-3xl mx-auto px-4 py-6 pb-24">
        {/* 이미 생성된 프로젝트 */}
        {projects.length > 0 && (
          <div className="card bg-base-200 mb-6">
            <div className="card-body">
              <h2 className="card-title">이미 생성된 프로젝트 ({projects.length}개)</h2>
              <div className="space-y-2">
                {projects.map((project) => (
                  <div key={project.id} className="flex items-center gap-2 p-2 bg-base-100 rounded">
                    <span>{project.icon}</span>
                    <span className="text-sm font-medium">{project.title}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 안내 메시지 */}
        <div className="alert alert-info mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm">
            <strong>프로젝트란?</strong> 두 단계 이상의 할일로 구성된 묶음입니다.
            <br />
            예: 앱 출시하기, 마라톤 완주, 자격증 합격
          </div>
        </div>

        {/* 프로젝트 추가 폼 */}
        <div className="card bg-base-200 mb-6">
          <div className="card-body">
            <h2 className="card-title">새 프로젝트 추가</h2>

            <div className="form-control">
              <label className="label">
                <span className="label-text">프로젝트 제목</span>
              </label>
              <input
                type="text"
                value={newProject.title}
                onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
                placeholder="예: DayStep 앱 출시하기"
                className="input input-bordered"
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">프로젝트 설명 (선택)</span>
              </label>
              <textarea
                value={newProject.description}
                onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                placeholder="프로젝트에 대한 자세한 설명을 입력하세요"
                className="textarea textarea-bordered h-20"
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">연결할 영역 (선택)</span>
              </label>
              <select
                value={newProject.areaId}
                onChange={(e) => setNewProject({ ...newProject, areaId: e.target.value })}
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

            <button onClick={handleAddProject} className="btn btn-primary mt-4">
              <Plus className="w-4 h-4" />
              프로젝트 추가
            </button>
          </div>
        </div>

        {/* 추가된 프로젝트 목록 */}
        {selectedProjects.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">추가된 프로젝트 ({selectedProjects.length}개)</h2>
            <div className="space-y-3">
              {selectedProjects.map((project, index) => (
                <div key={index} className="card bg-base-200">
                  <div className="card-body p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold">{project.title}</h3>
                        {project.description && (
                          <p className="text-sm text-base-content/70 mt-1">{project.description}</p>
                        )}
                        {project.areaId && (
                          <div className="mt-2">
                            <span className="badge badge-sm">
                              {areas.find((a) => a.id === project.areaId)?.title}
                            </span>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleRemoveProject(index)}
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

        {selectedProjects.length === 0 && (
          <div className="text-center py-8">
            <p className="text-base-content/50">아직 추가된 프로젝트가 없습니다</p>
            <p className="text-sm text-base-content/30 mt-2">
              프로젝트 없이도 건너뛸 수 있습니다
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
          {selectedProjects.length === 0 ? (
            <button onClick={handleSkip} className="btn btn-primary flex-1">
              건너뛰고 계속
            </button>
          ) : (
            <button onClick={handleNext} className="btn btn-primary flex-1">
              저장하고 계속 ({selectedProjects.length}개)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
