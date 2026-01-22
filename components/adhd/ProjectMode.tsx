'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, Plus, FolderKanban, Check, Archive, Trash2, BookOpen } from 'lucide-react';
import { useProjectStore, useActiveProjects, useFilteredProjects } from '@/state/stores/projectStore';
import { useAuth } from '@/app/context/AuthContext';
import { useADHDModeStore } from '@/state/stores/adhdModeStore';
import type { Project, ProjectStatus } from '@/types';
import ProjectEditModal from './project/ProjectEditModal';
import MCPGuideContent from './project/MCPGuideContent';

interface ProjectModeProps {
  onExit: () => void;
}

/**
 * 프로젝트 모드 - AI 플래닝으로 생성된 프로젝트 관리
 *
 * ADHD 관점:
 * - 진행률 시각화: 각 프로젝트의 완료/전체 할일 수 표시
 * - 색상 구분: 프로젝트별 시각적 구분
 * - 간단한 UI: 핵심 정보만 표시
 */
export default function ProjectMode({ onExit }: ProjectModeProps) {
  const { user } = useAuth();
  const userId = user?.id;

  const {
    projects,
    fetchProjects,
    fetchProjectProgress,
    projectProgress,
    loading,
    statusFilter,
    setStatusFilter,
    deleteProject,
    completeProject,
    abandonProject,
  } = useProjectStore();

  const filteredProjects = useFilteredProjects();
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // 데이터 로드
  useEffect(() => {
    if (userId) {
      fetchProjects(userId);
    }
  }, [userId, fetchProjects]);

  // 프로젝트별 진행률 로드
  useEffect(() => {
    if (userId && projects.length > 0) {
      projects.forEach((project) => {
        if (!projectProgress.has(project.id)) {
          fetchProjectProgress(userId, project.id);
        }
      });
    }
  }, [userId, projects, projectProgress, fetchProjectProgress]);

  // 현재 탭: 프로젝트 목록 vs 가이드
  const [currentTab, setCurrentTab] = useState<'projects' | 'guide'>('projects');

  // 상태 필터 버튼
  const filterButtons: { label: string; value: ProjectStatus | 'all' }[] = [
    { label: '전체', value: 'all' },
    { label: '진행중', value: 'active' },
    { label: '완료', value: 'completed' },
    { label: '포기', value: 'abandoned' },
  ];

  // 상태별 배지 색상
  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'completed':
        return <span className="badge badge-success badge-xs">완료</span>;
      case 'abandoned':
        return <span className="badge badge-ghost badge-xs">포기</span>;
      default:
        return null;
    }
  };

  // 프로젝트 카드 클릭
  const handleProjectClick = (project: Project) => {
    setEditingProject(project);
  };

  // 프로젝트 완료
  const handleComplete = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    if (userId) {
      await completeProject(userId, projectId);
    }
  };

  // 프로젝트 포기
  const handleAbandon = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    if (userId && confirm('이 프로젝트를 포기하시겠습니까?')) {
      await abandonProject(userId, projectId);
    }
  };

  // 프로젝트 삭제
  const handleDelete = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    if (userId && confirm('이 프로젝트를 삭제하시겠습니까? 연결된 할일은 프로젝트 연결만 해제됩니다.')) {
      await deleteProject(userId, projectId);
    }
  };

  return (
    <div className="min-h-screen bg-base-100">
      {/* 헤더 */}
      <header className="sticky top-0 z-10 bg-base-100 border-b border-base-200">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={onExit}
            className="btn btn-ghost btn-circle"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold">프로젝트</h1>
          <div className="w-10" /> {/* 균형 맞추기 */}
        </div>

        {/* 메인 탭: 프로젝트 목록 vs 가이드 */}
        <div className="flex gap-2 px-4 pb-2 border-b border-base-200">
          <button
            onClick={() => setCurrentTab('projects')}
            className={`flex-1 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              currentTab === 'projects'
                ? 'text-primary border-b-2 border-primary'
                : 'text-base-content/60 hover:text-base-content'
            }`}
          >
            프로젝트 목록
          </button>
          <button
            onClick={() => setCurrentTab('guide')}
            className={`flex-1 py-2 text-sm font-medium rounded-t-lg transition-colors flex items-center justify-center gap-1 ${
              currentTab === 'guide'
                ? 'text-primary border-b-2 border-primary'
                : 'text-base-content/60 hover:text-base-content'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            AI 연동 가이드
          </button>
        </div>

        {/* 상태 필터 (프로젝트 탭에서만 표시) */}
        {currentTab === 'projects' && (
          <div className="flex gap-2 px-4 py-2 overflow-x-auto">
            {filterButtons.map((btn) => (
              <button
                key={btn.value}
                onClick={() => setStatusFilter(btn.value)}
                className={`btn btn-sm rounded-full ${
                  statusFilter === btn.value ? 'btn-primary' : 'btn-ghost'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* 메인 콘텐츠 */}
      <main className="p-4 pb-24">
        {currentTab === 'guide' ? (
          // 가이드 탭
          <MCPGuideContent />
        ) : loading ? (
          <div className="flex justify-center py-8">
            <div className="loading loading-spinner loading-md" />
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="text-center py-12">
            <FolderKanban className="w-12 h-12 mx-auto text-base-300 mb-4" />
            <p className="text-base-content/60">
              {statusFilter === 'all'
                ? 'AI와 함께 프로젝트를 계획해보세요'
                : '해당하는 프로젝트가 없습니다'}
            </p>
            {statusFilter === 'all' && (
              <button
                onClick={() => setCurrentTab('guide')}
                className="btn btn-primary btn-sm mt-4 gap-1"
              >
                <BookOpen className="w-4 h-4" />
                연동 가이드 보기
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredProjects.map((project) => {
              const progress = projectProgress.get(project.id);
              const progressPercent = progress?.progress ?? 0;

              return (
                <div
                  key={project.id}
                  onClick={() => handleProjectClick(project)}
                  className="card bg-base-200 cursor-pointer hover:shadow-md transition-shadow"
                >
                  <div className="card-body p-4">
                    <div className="flex items-start gap-3">
                      {/* 아이콘/색상 */}
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-lg flex-shrink-0"
                        style={{
                          backgroundColor: project.color ? `${project.color}20` : '#f3f4f6',
                          color: project.color || '#6b7280',
                        }}
                      >
                        {project.icon || <FolderKanban className="w-5 h-5" />}
                      </div>

                      {/* 내용 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium truncate">{project.title}</h3>
                          {getStatusBadge(project.status)}
                        </div>

                        {project.description && (
                          <p className="text-sm text-base-content/60 truncate mt-0.5">
                            {project.description}
                          </p>
                        )}

                        {/* 진행률 바 */}
                        {progress && (
                          <div className="mt-2">
                            <div className="flex items-center justify-between text-xs text-base-content/60 mb-1">
                              <span>{progress.completed}/{progress.total} 완료</span>
                              <span>{progressPercent}%</span>
                            </div>
                            <progress
                              className="progress progress-primary w-full h-1.5"
                              value={progressPercent}
                              max={100}
                            />
                          </div>
                        )}
                      </div>

                      {/* 액션 버튼 (활성 프로젝트만) */}
                      {project.status === 'active' && (
                        <div className="flex gap-1 flex-shrink-0">
                          <button
                            onClick={(e) => handleComplete(e, project.id)}
                            className="btn btn-ghost btn-xs btn-circle"
                            title="완료"
                          >
                            <Check className="w-4 h-4 text-success" />
                          </button>
                          <button
                            onClick={(e) => handleAbandon(e, project.id)}
                            className="btn btn-ghost btn-xs btn-circle"
                            title="포기"
                          >
                            <Archive className="w-4 h-4 text-base-content/40" />
                          </button>
                          <button
                            onClick={(e) => handleDelete(e, project.id)}
                            className="btn btn-ghost btn-xs btn-circle"
                            title="삭제"
                          >
                            <Trash2 className="w-4 h-4 text-error" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* FAB - 새 프로젝트 (프로젝트 탭에서만 표시) */}
      {currentTab === 'projects' && (
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="fixed bottom-24 right-4 btn btn-primary btn-circle shadow-lg z-20"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}

      {/* 프로젝트 편집 모달 */}
      {editingProject && (
        <ProjectEditModal
          project={editingProject}
          onClose={() => setEditingProject(null)}
        />
      )}

      {/* 프로젝트 생성 모달 */}
      {isCreateModalOpen && (
        <ProjectEditModal
          onClose={() => setIsCreateModalOpen(false)}
        />
      )}
    </div>
  );
}
