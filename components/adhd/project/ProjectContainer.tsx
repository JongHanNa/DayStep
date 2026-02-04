'use client';

import { useEffect, useState } from 'react';
import { Plus, FolderKanban, Check, Pause, Trash2, BookOpen, Play, Square, Bot, Brain, Sparkles, PenLine, HelpCircle, MessageSquare } from 'lucide-react';
import { useProjectStore, useFilteredProjects } from '@/state/stores/projectStore';
import { useAuth } from '@/app/context/AuthContext';
import { useADHDStore } from '@/state/stores/adhdStore';
import type { Project, ProjectStatus } from '@/types';
import ProjectEditModal from '../project/ProjectEditModal';
import MCPGuideView from '../project/MCPGuideView';
import { AIPlanningChat } from '../ai-planning';

interface ProjectContainerProps {
  onExit: () => void;
}

/**
 * 프로젝트 뷰 - AI 플래닝으로 생성된 프로젝트 관리
 *
 * ADHD 관점:
 * - 진행률 시각화: 각 프로젝트의 완료/전체 할일 수 표시
 * - 색상 구분: 프로젝트별 시각적 구분
 * - 간단한 UI: 핵심 정보만 표시
 */
export default function ProjectContainer({ onExit }: ProjectContainerProps) {
  const { user, loading: authLoading } = useAuth();
  const { currentUserId } = useADHDStore();

  // fallback: useAuth()가 user를 반환하지 않을 때 adhdStore의 currentUserId 사용
  // Capacitor 환경에서 타이밍 문제로 user가 null일 수 있음
  const userId = user?.id || currentUserId;

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
      console.log('📁 ProjectView: fetchProjects 호출', {
        userId,
        source: user?.id ? 'useAuth' : 'currentUserId',
      });
      fetchProjects(userId);
    }
  }, [userId, authLoading, user?.id, fetchProjects]);

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

  // adhdStore에서 currentSubView 가져오기
  const { currentSubView } = useADHDStore();

  // 서브뷰 ID를 탭 타입으로 매핑
  const getInitialTab = (): 'projects' | 'chat' | 'guide' => {
    if (currentSubView === 'ai-chat') return 'chat';
    if (currentSubView === 'guide') return 'guide';
    return 'projects'; // 'ai-plan' 또는 기본값
  };

  // 현재 탭: 프로젝트 목록 vs AI 채팅 vs 가이드
  const [currentTab, setCurrentTab] = useState<'projects' | 'chat' | 'guide'>(getInitialTab());

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
      {/* 헤더 - currentSubView가 없을 때만 탭 네비게이션 표시 */}
      <header className="sticky top-0 z-10 bg-base-100 border-b border-base-200">
        {/* 메인 탭: 프로젝트 목록 vs AI 채팅 vs 가이드 (currentSubView가 없을 때만) */}
        {!currentSubView && (
          <div className="flex gap-1 px-4 pt-3 pb-2 border-b border-base-200">
            {/* AI 계획 탭 영역 - 도움말 버튼과 탭 버튼을 형제로 분리 */}
            <div className={`flex-1 flex items-center justify-center gap-1 ${
              currentTab === 'projects'
                ? 'border-b-2 border-primary'
                : ''
            }`}>
              <button
                onClick={() => setShowHelpModal(true)}
                className="p-1 rounded-full hover:bg-base-300 transition-colors"
              >
                <HelpCircle className="w-4 h-4 text-base-content/60" />
              </button>
              <button
                onClick={() => setCurrentTab('projects')}
                className={`py-2 text-sm font-medium flex items-center gap-1 transition-colors ${
                  currentTab === 'projects'
                    ? 'text-primary'
                    : 'text-base-content/60 hover:text-base-content'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                AI 계획
              </button>
            </div>
            {/* AI 채팅 탭 */}
            <button
              onClick={() => setCurrentTab('chat')}
              className={`flex-1 py-2 text-sm font-medium transition-colors flex items-center justify-center gap-1 ${
                currentTab === 'chat'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-base-content/60 hover:text-base-content'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              AI 채팅
            </button>
            {/* 연동 가이드 탭 */}
            <button
              onClick={() => setCurrentTab('guide')}
              className={`flex-1 py-2 text-sm font-medium transition-colors flex items-center justify-center gap-1 ${
                currentTab === 'guide'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-base-content/60 hover:text-base-content'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              가이드
            </button>
          </div>
        )}

        {/* 상태 필터 (프로젝트 탭에서만 표시) */}
        {currentTab === 'projects' && !currentSubView && (
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
      <main className={`${currentTab === 'chat' ? 'p-0' : 'p-4'} pb-24`}>
        {currentTab === 'guide' ? (
          // 가이드 탭
          <MCPGuideView />
        ) : currentTab === 'chat' ? (
          // AI 채팅 탭
          <AIPlanningChat />
        ) : (
          <>
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

      {/* AI 계획 도움말 모달 */}
      {showHelpModal && (
        <dialog open className="modal z-[110]">
          <div className="modal-box max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Bot className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">AI와 함께 계획하면 더 쉬워요</h3>
              <Sparkles className="w-4 h-4 text-warning" />
            </div>

            <div className="space-y-3 text-sm text-base-content/80">
              <p className="font-medium text-primary">
                중요하고 긴급한데 시작이 어렵고 막연한 것들을 여기서 관리하세요.
              </p>
              <p>
                성인 ADHD의 <span className="text-primary">집행기능(executive function)</span> 특성상,
                중요한 일도 {'"어디서부터?"'}가 막연하면 미루게 됩니다.
              </p>
              <p>
                DayStep MCP는 막막한 계획을 {'"'}
                <span className="text-primary">폴더 열기 → 파일 1개 만들기 → ...</span>
                {'"'}처럼 {'"'}<span className="text-warning">뇌에 친절한 단위</span>{'"'}로 쪼개줍니다.
              </p>
              <p>작업 시작이 90% — 시작만 하면 나머지는 따라와요!</p>
            </div>

            <div className="modal-action">
              <button
                onClick={() => setShowHelpModal(false)}
                className="btn btn-primary rounded-full"
              >
                확인
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={() => setShowHelpModal(false)}>close</button>
          </form>
        </dialog>
      )}
    </div>
  );
}
