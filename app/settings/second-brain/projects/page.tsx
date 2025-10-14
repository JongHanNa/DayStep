'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useProjectStore } from '@/state/stores/secondBrain/projectStore';
import { Plus, ArrowLeft } from 'lucide-react';
import ProjectCard from '@/components/second-brain/ProjectCard';
import ProjectStatusTabs from '@/components/second-brain/ProjectStatusTabs';

export default function ProjectsSettingsPage() {
  const router = useRouter();
  const { projects, fetchProjects, createProject } = useProjectStore();
  const [selectedStatus, setSelectedStatus] = useState<'not_started' | 'active' | 'on_hold' | 'completed'>('not_started');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // 선택된 상태의 프로젝트 필터링 (useMemo로 캐싱)
  const filteredProjects = useMemo(() => {
    return projects.filter((project) => project.status === selectedStatus);
  }, [projects, selectedStatus]);

  // 새 프로젝트 즉시 생성 후 편집 페이지로 이동
  const handleAddProject = async () => {
    if (isCreating) return;

    try {
      setIsCreating(true);

      // 즉시 새 프로젝트 생성 (목록에 바로 표시됨)
      await createProject({
        title: '새 프로젝트',
        status: 'not_started',
        icon: 'lucide-FolderOpen',
        color: '#A8DADC',
        order_index: projects.length,
      });

      // 목록 페이지에 그대로 유지 (편집 페이지로 이동하지 않음)
    } catch (error) {
      console.error('프로젝트 생성 실패:', error);
      alert('프로젝트 생성에 실패했습니다.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-base-100 pb-20">
      {/* 헤더 */}
      <div className="sticky top-0 z-10 bg-base-100 border-b border-base-300">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="btn btn-ghost btn-sm btn-circle"
              aria-label="뒤로가기"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">프로젝트 (Projects)</h1>
              <p className="text-sm text-base-content/70">
                진행 중인 프로젝트를 관리하세요
              </p>
            </div>
            <button
              onClick={handleAddProject}
              className="btn btn-primary btn-sm"
              disabled={isCreating}
            >
              {isCreating ? (
                <span className="loading loading-spinner loading-xs"></span>
              ) : (
                <Plus className="w-4 h-4" />
              )}
              {isCreating ? '생성 중...' : '추가'}
            </button>
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* 상태별 탭 */}
        <ProjectStatusTabs
          projects={projects}
          selectedStatus={selectedStatus}
          onStatusChange={setSelectedStatus}
        />

        {/* 프로젝트 목록 */}
        <div className="mt-6 space-y-3">
          {filteredProjects.length === 0 ? (
            <div className="card bg-base-200">
              <div className="card-body text-center py-12">
                <p className="text-base-content/60">
                  {selectedStatus === 'not_started' && '시작 안함 프로젝트가 없습니다.'}
                  {selectedStatus === 'active' && '진행중인 프로젝트가 없습니다.'}
                  {selectedStatus === 'on_hold' && '중단된 프로젝트가 없습니다.'}
                  {selectedStatus === 'completed' && '완료된 프로젝트가 없습니다.'}
                </p>
                <button
                  onClick={handleAddProject}
                  className="btn btn-primary btn-sm mt-4 mx-auto"
                  disabled={isCreating}
                >
                  {isCreating ? (
                    <span className="loading loading-spinner loading-xs"></span>
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  {isCreating ? '생성 중...' : '새 프로젝트 추가'}
                </button>
              </div>
            </div>
          ) : (
            filteredProjects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
