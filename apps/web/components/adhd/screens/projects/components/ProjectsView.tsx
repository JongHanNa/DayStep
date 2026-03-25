'use client';

import { useEffect, useState } from 'react';
import {
  Plus,
  FolderKanban,
  Check,
  Pause,
  Trash2,
  BookOpen,
  Play,
  Square,
  Bot,
  Brain,
  Sparkles,
  PenLine,
  HelpCircle,
} from 'lucide-react';
import { useProjectStore, useFilteredProjects } from '@/state/stores/projectStore';
import { useAuth } from '@/app/context/AuthContext';
import { useADHDStore } from '@/state/stores/adhdStore';
import type { Project, ProjectStatus } from '@/types';
import ProjectEditModal from '@/components/adhd/modals/ProjectEditModal';

interface ProjectsViewProps {
  userId: string;
}

/**
 * 프로젝트 목록 관리 뷰
 *
 * GenericTabContainer의 projects 탭에서 사용
 * ProjectContainer에서 프로젝트 목록 부분만 추출
 */
export function ProjectsView({ userId }: ProjectsViewProps) {
  const { loading: authLoading } = useAuth();

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
    holdProject,
    startProject,
    unstartProject,
    resumeProject,
  } = useProjectStore();

  const filteredProjects = useFilteredProjects();
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  // 데이터 로드
  useEffect(() => {
    if (userId && !authLoading) {
      fetchProjects(userId);
    }
  }, [userId, authLoading, fetchProjects]);

  // 프로젝트별 진행률 로드
  useEffect(() => {
    if (userId && !authLoading && projects.length > 0) {
      projects.forEach((project) => {
        if (!projectProgress.has(project.id)) {
          fetchProjectProgress(userId, project.id);
        }
      });
    }
  }, [userId, authLoading, projects, projectProgress, fetchProjectProgress]);

  // 상태 필터 버튼
  const filterButtons: { label: string; value: ProjectStatus | 'all' }[] = [
    { label: '전체', value: 'all' },
    { label: '시작안함', value: 'not_started' },
    { label: '진행중', value: 'in_progress' },
    { label: '중단', value: 'on_hold' },
    { label: '완료', value: 'completed' },
  ];

  // 상태별 배지 색상
  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'not_started':
        return <span className="badge badge-outline badge-xs">시작안함</span>;
      case 'on_hold':
        return <span className="badge badge-warning badge-xs">중단</span>;
      case 'completed':
        return <span className="badge badge-success badge-xs">완료</span>;
      case 'in_progress':
        return <span className="badge badge-primary badge-xs">진행중</span>;
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
    await completeProject(userId, projectId);
  };

  // 프로젝트 중단
  const handleHold = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    if (confirm('이 프로젝트를 중단하시겠습니까?')) {
      await holdProject(userId, projectId);
    }
  };

  // 프로젝트 시작
  const handleStart = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    await startProject(userId, projectId);
  };

  // 프로젝트 시작안함으로 되돌리기
  const handleUnstart = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    await unstartProject(userId, projectId);
  };

  // 프로젝트 재개
  const handleResume = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    await resumeProject(userId, projectId);
  };

  // 프로젝트 삭제
  const handleDelete = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    if (confirm('이 프로젝트를 삭제하시겠습니까? 연결된 할일은 프로젝트 연결만 해제됩니다.')) {
      await deleteProject(userId, projectId);
    }
  };

  return (
    <div className="min-h-full bg-base-100">
      {/* 상태 필터 */}
      <div className="flex gap-2 px-4 py-2 overflow-x-auto border-b border-base-200">
        {filterButtons.map((btn) => (
          <button
            key={btn.value}
            onClick={() => setStatusFilter(btn.value)}
            className={`btn btn-sm rounded-full ${
              statusFilter === btn.value ? 'btn-primary' : 'bg-base-200 text-base-content hover:bg-base-300'
            }`}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* 메인 콘텐츠 */}
      <main className="p-4 pb-24">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="loading loading-spinner loading-md" />
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="text-center py-12">
            {statusFilter === 'all' ? (
              <>
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                  <Brain className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">
                  막연한 계획을 {'"뇌에 친절한 단위"'}로 바꿔드려요
                </h3>
                <p className="text-base-content/60 text-sm max-w-xs mx-auto leading-relaxed">
                  <span className="font-medium text-base-content/80">{'"보고서 완성"'}</span> 같은 막막한 목표를{' '}
                  <span className="font-medium text-primary">{'"폴더 열기 → 파일 1개 만들기 → ..."'}</span>{' '}
                  처럼 바로 몸이 움직이는 작은 행동으로 쪼개줍니다.
                </p>
                <p className="text-sm text-base-content/50 mt-3">
                  <span className="font-medium">작업 시작이 90%</span> — 시작만 하면 나머지는 따라와요!
                </p>
              </>
            ) : (
              <>
                <FolderKanban className="w-12 h-12 mx-auto text-base-300 mb-4" />
                <p className="text-base-content/60">해당하는 계획이 없습니다</p>
              </>
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

                        {/* 출처 라벨 */}
                        <div className="flex items-center gap-1 mt-0.5">
                          {project.source === 'mcp' ? (
                            <>
                              <Sparkles className="w-3 h-3 text-warning" />
                              <span className="text-xs text-warning">AI 생성</span>
                            </>
                          ) : (
                            <>
                              <PenLine className="w-3 h-3 text-base-content/50" />
                              <span className="text-xs text-base-content/50">직접 작성</span>
                            </>
                          )}
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

                      {/* 상태 버튼 */}
                      <div className="flex gap-1 flex-shrink-0">
                        {/* 시작안함 버튼 */}
                        <button
                          onClick={(e) => handleUnstart(e, project.id)}
                          disabled={project.status === 'not_started' || project.status === 'on_hold' || project.status === 'completed'}
                          className={`btn btn-xs btn-circle ${
                            project.status === 'not_started'
                              ? 'bg-base-300 text-base-content'
                              : project.status === 'on_hold' || project.status === 'completed'
                              ? 'opacity-30 cursor-not-allowed'
                              : 'btn-ghost'
                          }`}
                          title="시작안함"
                        >
                          <Square className="w-4 h-4" />
                        </button>

                        {/* 진행중 버튼 */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (project.status === 'not_started') handleStart(e, project.id);
                            else if (project.status === 'on_hold') handleResume(e, project.id);
                          }}
                          disabled={project.status === 'in_progress' || project.status === 'completed'}
                          className={`btn btn-xs btn-circle ${
                            project.status === 'in_progress'
                              ? 'bg-primary/20 text-primary'
                              : project.status === 'completed'
                              ? 'opacity-30 cursor-not-allowed'
                              : 'btn-ghost'
                          }`}
                          title="진행중"
                        >
                          <Play className="w-4 h-4" />
                        </button>

                        {/* 중단 버튼 */}
                        <button
                          onClick={(e) => handleHold(e, project.id)}
                          disabled={project.status === 'on_hold' || project.status === 'not_started' || project.status === 'completed'}
                          className={`btn btn-xs btn-circle ${
                            project.status === 'on_hold'
                              ? 'bg-warning/20 text-warning'
                              : project.status === 'not_started' || project.status === 'completed'
                              ? 'opacity-30 cursor-not-allowed'
                              : 'btn-ghost'
                          }`}
                          title="중단"
                        >
                          <Pause className="w-4 h-4" />
                        </button>

                        {/* 완료 버튼 */}
                        <button
                          onClick={(e) => handleComplete(e, project.id)}
                          disabled={project.status === 'completed'}
                          className={`btn btn-xs btn-circle ${
                            project.status === 'completed'
                              ? 'bg-success/20 text-success'
                              : 'btn-ghost'
                          }`}
                          title="완료"
                        >
                          <Check className="w-4 h-4" />
                        </button>

                        {/* 삭제 버튼 */}
                        {project.status !== 'completed' && (
                          <button
                            onClick={(e) => handleDelete(e, project.id)}
                            className="btn btn-ghost btn-xs btn-circle"
                            title="삭제"
                          >
                            <Trash2 className="w-4 h-4 text-error" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* FAB - 새 프로젝트 */}
      <button
        onClick={() => setIsCreateModalOpen(true)}
        className="fixed bottom-24 right-4 btn btn-primary btn-circle shadow-lg z-20"
      >
        <Plus className="w-6 h-6" />
      </button>

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

export default ProjectsView;
