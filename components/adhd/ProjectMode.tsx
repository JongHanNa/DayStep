'use client';

import { useEffect, useState } from 'react';
import { Plus, FolderKanban, Check, Pause, Trash2, BookOpen, Play, Square, Bot, Brain, Sparkles } from 'lucide-react';
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
    holdProject,
    startProject,
    unstartProject,
    resumeProject,
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
    if (userId) {
      await completeProject(userId, projectId);
    }
  };

  // 프로젝트 중단
  const handleHold = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    if (userId && confirm('이 프로젝트를 중단하시겠습니까?')) {
      await holdProject(userId, projectId);
    }
  };

  // 프로젝트 시작 (not_started → in_progress)
  const handleStart = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    if (userId) {
      await startProject(userId, projectId);
    }
  };

  // 프로젝트 시작안함으로 되돌리기 (in_progress → not_started)
  const handleUnstart = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    if (userId) {
      await unstartProject(userId, projectId);
    }
  };

  // 프로젝트 재개 (on_hold → in_progress)
  const handleResume = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    if (userId) {
      await resumeProject(userId, projectId);
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
        {/* 메인 탭: 프로젝트 목록 vs 가이드 */}
        <div className="flex gap-2 px-4 pt-3 pb-2 border-b border-base-200">
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
        ) : (
          <>
            {/* AI 연동 권장 안내 (접는 구조) */}
            <div className="collapse collapse-arrow bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20 mb-4 rounded-xl">
              <input type="checkbox" defaultChecked />
              <div className="collapse-title font-semibold flex items-center gap-2 pr-10">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
                <span>AI와 함께 계획하면 더 쉬워요</span>
                <Sparkles className="w-4 h-4 text-warning" />
              </div>
              <div className="collapse-content">
                <div className="pt-2">
                  <p className="text-sm text-base-content/70 leading-relaxed">
                    DayStep MCP는 <span className="font-medium text-primary">중요·긴급한데 막연해서 미루던 일</span>을{' '}
                    <span className="font-medium text-accent">"뇌에 친절한 단위"</span>로 쪼개서
                    바로 실행할 수 있는 작은 단계로 만들어줍니다.
                  </p>
                  <p className="text-sm text-base-content/60 mt-2">
                    ADHD가 있어도 <span className="font-medium">"뭐부터 해야 하지?"</span> 없이 바로 시작!
                  </p>
                  <div className="mt-4">
                    <button
                      onClick={() => setCurrentTab('guide')}
                      className="btn btn-primary btn-sm rounded-full gap-1"
                    >
                      <BookOpen className="w-4 h-4" />
                      AI 연동하기
                    </button>
                  </div>
                </div>
              </div>
            </div>

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
                      막연한 계획, AI가 실행 가능한 단계로 바꿔드려요
                    </h3>
                    <p className="text-base-content/60 text-sm max-w-xs mx-auto leading-relaxed">
                      <span className="font-medium text-base-content/80">"취업 준비"</span> 같은 막막한 목표를{' '}
                      <span className="font-medium text-primary">"잡코리아 열기 → 이력서 편집 클릭 → ..."</span>{' '}
                      처럼 5분 안에 끝낼 수 있는 작은 행동으로 쪼개줍니다.
                    </p>
                    <p className="text-sm text-base-content/50 mt-3">
                      ADHD가 있어도 미루지 않고 바로 시작할 수 있어요!
                    </p>
                    <button
                      onClick={() => setCurrentTab('guide')}
                      className="btn btn-primary btn-sm mt-6 gap-1 rounded-full"
                    >
                      <BookOpen className="w-4 h-4" />
                      AI 연동 가이드 보기
                    </button>
                  </>
                ) : (
                  <>
                    <FolderKanban className="w-12 h-12 mx-auto text-base-300 mb-4" />
                    <p className="text-base-content/60">해당하는 프로젝트가 없습니다</p>
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

                      {/* 상태 버튼 - 항상 4개 표시 */}
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
          </>
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
