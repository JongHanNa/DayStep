'use client';

import { useState, useEffect, useMemo } from 'react';
import { useGoalStore } from '@/state/stores/secondBrain/goalStore';
import { useAreaStore } from '@/state/stores/secondBrain/areaStore';
import { useResourceStore } from '@/state/stores/secondBrain/resourceStore';
import { useProjectStore } from '@/state/stores/secondBrain/projectStore';
import { Plus, Pencil, X } from 'lucide-react';
import SecondBrainBottomNav from '@/components/layout/SecondBrainBottomNav';
import type { CreateGoalInput, Goal, Project } from '@/types/second-brain';
import GoalEditDialog from '@/components/second-brain/GoalEditDialog';
import ProjectEditDialog from '@/components/second-brain/ProjectEditDialog';
import type { UnifiedIconKey } from '@/lib/icon-collection';
import { getUnifiedIcon } from '@/lib/icon-collection';
import { useModalStore } from '@/state/stores/modalStore';
import { useAuth } from '@/app/context/AuthContext';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { saveLastVisitedRoute } from '@/lib/capacitor/lastVisitedRoute';

export default function GoalsPage() {
  const { appUser } = useAuth();
  const { createGoal, updateGoal, deleteGoal, goals, fetchGoals } = useGoalStore();
  const { areas, fetchAreas } = useAreaStore();
  const { resources, fetchResources } = useResourceStore();
  const { projects, fetchProjects, createProject, updateProject, deleteProject } = useProjectStore();

  // 편집 관련 state
  const [editingGoal, setEditingGoal] = useState<(Goal & { isNew?: boolean; paraSelection?: string }) | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // 삭제 확인 다이얼로그
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [goalToDelete, setGoalToDelete] = useState<Goal | null>(null);

  // 프로젝트 관련 state
  const [editingProject, setEditingProject] = useState<(Project & { isNew?: boolean; paraSelection?: string }) | null>(null);
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [projectDeleteConfirmOpen, setProjectDeleteConfirmOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isCreatingGoal, setIsCreatingGoal] = useState(false);

  const { openModal, closeModal } = useModalStore();

  // 경로 저장 (Capacitor 앱 복귀 시 마지막 페이지 복원용)
  useEffect(() => {
    saveLastVisitedRoute('/second-brain/goals');
  }, []);

  useEffect(() => {
    if (appUser?.id) {
      fetchGoals(appUser.id);
      fetchAreas(appUser.id);
      fetchResources(appUser.id);
      fetchProjects(appUser.id);
    }
  }, [appUser?.id, fetchGoals, fetchAreas, fetchResources, fetchProjects]);

  // 편집 모달 상태 관리 (하단 네비 숨김)
  useEffect(() => {
    if (editDialogOpen) {
      openModal();
    }
    return () => {
      closeModal();
    };
  }, [editDialogOpen, openModal, closeModal]);

  // 삭제 확인 모달 상태 관리 (하단 네비 숨김)
  useEffect(() => {
    if (deleteConfirmOpen) {
      openModal();
    }
    return () => {
      closeModal();
    };
  }, [deleteConfirmOpen, openModal, closeModal]);

  // 프로젝트 삭제 확인 모달 상태 관리 (하단 네비 숨김)
  useEffect(() => {
    if (projectDeleteConfirmOpen) {
      openModal();
    }
    return () => {
      closeModal();
    };
  }, [projectDeleteConfirmOpen, openModal, closeModal]);

  // 새 목표 추가 핸들러 - 즉시 생성
  const handleAddGoal = async () => {
    if (isCreatingGoal || !appUser?.id) return; // 중복 클릭 방지 + appUser 체크

    setIsCreatingGoal(true);
    try {
      // 목표 즉시 생성
      const createdGoal = await createGoal(appUser.id, {
        title: '새 목표',
        icon: 'lucide-Target',
        color: '#A8DADC',
        status: 'not_started',
        year_goal: new Date().getFullYear(),
        quarter_goal: 'Q1',
      });

      console.log('새 목표 생성 완료:', createdGoal);
    } catch (error) {
      console.error('목표 생성 실패:', error);
      alert('목표 생성에 실패했습니다.');
    } finally {
      setIsCreatingGoal(false);
    }
  };

  // 목표 편집 핸들러
  const handleEditGoal = (goal: Goal) => {
    // paraSelection 생성 (area_id 또는 resource_id에서)
    let paraSelection = '';
    if (goal.area_id) {
      paraSelection = `area-${goal.area_id}`;
    } else if (goal.resource_id) {
      paraSelection = `resource-${goal.resource_id}`;
    }

    setEditingGoal({ ...goal, paraSelection, isNew: false });
    setEditDialogOpen(true);
  };

  // 저장 핸들러
  const handleSaveEdit = async (goalData: Partial<Goal>, area_id?: string, resource_id?: string) => {
    if (!appUser?.id) return;

    try {
      console.log('🔍 저장 데이터 확인:', {
        year_goal: goalData.year_goal,
        quarter_goal: goalData.quarter_goal,
        year_goal_type: typeof goalData.year_goal,
        quarter_goal_type: typeof goalData.quarter_goal
      });

      if ((goalData as any).isNew) {
        // 새 목표 생성
        const createData: CreateGoalInput = {
          title: goalData.title!,
          icon: goalData.icon!,
          color: goalData.color!,
          status: goalData.status!,
          area_id,
          resource_id,
          start_date: goalData.start_date || undefined,
          end_date: goalData.end_date || undefined,
          year_goal: goalData.year_goal ?? null,
          quarter_goal: goalData.quarter_goal ?? null,
        };
        console.log('📝 생성 데이터:', createData);
        await createGoal(appUser.id, createData);
      } else {
        // 기존 목표 수정
        const updateData = {
          title: goalData.title!,
          icon: goalData.icon!,
          color: goalData.color!,
          status: goalData.status!,
          area_id,
          resource_id,
          start_date: goalData.start_date || undefined,
          end_date: goalData.end_date || undefined,
          year_goal: goalData.year_goal ?? null,
          quarter_goal: goalData.quarter_goal ?? null,
        };
        console.log('✏️ 수정 데이터:', updateData);
        await updateGoal(appUser.id, goalData.id!, updateData);
      }

      setEditDialogOpen(false);
      setEditingGoal(null);
      await fetchGoals(appUser.id);
    } catch (error) {
      console.error('목표 저장 실패:', error);
      alert('목표 저장에 실패했습니다.');
    }
  };

  // 취소 핸들러
  const handleCancelEdit = () => {
    setEditDialogOpen(false);
    setEditingGoal(null);
  };

  // 삭제 확인 다이얼로그 열기
  const handleDeleteClick = (goal: Goal) => {
    setGoalToDelete(goal);
    setDeleteConfirmOpen(true);
  };

  // 삭제 실행
  const handleConfirmDelete = async () => {
    if (!goalToDelete || !appUser?.id) return;

    try {
      await deleteGoal(appUser.id, goalToDelete.id);
      setDeleteConfirmOpen(false);
      setGoalToDelete(null);
      await fetchGoals(appUser.id);
    } catch (error) {
      console.error('목표 삭제 실패:', error);
      alert('목표 삭제에 실패했습니다.');
    }
  };

  // 삭제 취소
  const handleCancelDelete = () => {
    setDeleteConfirmOpen(false);
    setGoalToDelete(null);
  };

  // 현재 편집 중인 목표에 연결된 프로젝트 필터링
  const filteredProjects = useMemo(() => {
    if (!editingGoal || editingGoal.isNew) return [];
    return projects.filter((project) => project.goal_id === editingGoal.id);
  }, [projects, editingGoal]);

  // 프로젝트 추가 핸들러 - 즉시 생성
  const handleAddProject = async () => {
    if (!editingGoal || editingGoal.isNew) {
      alert('먼저 목표를 저장해주세요.');
      return;
    }

    if (isCreating || !appUser?.id) return; // 중복 클릭 방지 + appUser 체크

    setIsCreating(true);
    try {
      // 프로젝트 즉시 생성
      const createdProject = await createProject(appUser.id, {
        title: '새 프로젝트',
        icon: 'lucide-FolderOpen',
        color: '#A8DADC',
        status: 'not_started',
        goal_id: editingGoal.id,
        order_index: projects.length,
      });

      console.log('새 프로젝트 생성 완료:', createdProject);
    } catch (error) {
      console.error('프로젝트 생성 실패:', error);
      alert('프로젝트 생성에 실패했습니다.');
    } finally {
      setIsCreating(false);
    }
  };

  // 프로젝트 편집 핸들러
  const handleEditProject = (project: Project) => {
    console.log('🔍 프로젝트 편집 시작:', {
      id: project.id,
      title: project.title,
      start_date: project.start_date,
      end_date: project.end_date,
      start_date_type: typeof project.start_date,
      end_date_type: typeof project.end_date
    });

    // 날짜 형식 변환: ISO datetime을 YYYY-MM-DD로 변환
    const formatDateForInput = (dateString?: string) => {
      if (!dateString) return '';
      // ISO datetime 형식 (2025-01-15T00:00:00.000Z)을 date 형식 (2025-01-15)으로 변환
      return dateString.split('T')[0];
    };

    const editData = {
      ...project,
      paraSelection: '',
      isNew: false,
      start_date: formatDateForInput(project.start_date),
      end_date: formatDateForInput(project.end_date)
    };

    console.log('✅ 편집 데이터:', editData);

    setEditingProject(editData);
    setProjectDialogOpen(true);
  };

  // 프로젝트 저장 핸들러
  const handleSaveProject = async (projectData: Partial<Project>) => {
    if (!appUser?.id) return;

    try {
      if ((projectData as any).isNew) {
        await createProject(appUser.id, {
          title: projectData.title!,
          description: projectData.description || '',
          icon: projectData.icon!,
          color: projectData.color!,
          status: projectData.status!,
          goal_id: projectData.goal_id || undefined,
          start_date: projectData.start_date || undefined,
          end_date: projectData.end_date || undefined,
          order_index: projectData.order_index!,
        });
      } else {
        if (!appUser?.id) return;
        await updateProject(appUser.id, projectData.id!, {
          title: projectData.title!,
          description: projectData.description || '',
          icon: projectData.icon!,
          color: projectData.color!,
          status: projectData.status!,
          goal_id: projectData.goal_id || undefined,
          start_date: projectData.start_date || undefined,
          end_date: projectData.end_date || undefined,
        });
      }

      setProjectDialogOpen(false);
      setEditingProject(null);
    } catch (error) {
      console.error('프로젝트 저장 실패:', error);
      alert('프로젝트 저장에 실패했습니다.');
    }
  };

  // 프로젝트 편집 취소 핸들러
  const handleCancelProjectEdit = () => {
    setProjectDialogOpen(false);
    setEditingProject(null);
  };

  // 프로젝트 삭제 확인 다이얼로그 열기
  const handleDeleteProjectClick = (project: Project) => {
    setProjectToDelete(project);
    setProjectDeleteConfirmOpen(true);
  };

  // 프로젝트 삭제 실행
  const handleConfirmProjectDelete = async () => {
    if (!projectToDelete || !appUser?.id) return;

    try {
      await deleteProject(appUser.id, projectToDelete.id);
      setProjectDeleteConfirmOpen(false);
      setProjectToDelete(null);
    } catch (error) {
      console.error('프로젝트 삭제 실패:', error);
      alert('프로젝트 삭제에 실패했습니다.');
    }
  };

  // 프로젝트 삭제 취소
  const handleCancelProjectDelete = () => {
    setProjectDeleteConfirmOpen(false);
    setProjectToDelete(null);
  };

  return (
    <AuthGuard requireAuth={true}>
      <div className="min-h-screen bg-base-200 pb-20">
        {/* 헤더 */}
        <div className="sticky top-0 z-10 bg-base-200 border-b border-base-300">
          <div className={`max-w-3xl mx-auto px-4 ${process.env.BUILD_TARGET === 'mobile' ? 'pt-2 pb-2' : 'py-4'}`}>
            <p className="text-sm text-base-content/70 mt-1">
              장기 목표를 설정하고 관리하세요
            </p>
          </div>
        </div>

      {/* 메인 콘텐츠 */}
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* 목표 목록 */}
        <div className="space-y-4 mb-8">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">목표 목록 ({goals.length}개)</h2>
            <button
              onClick={handleAddGoal}
              className="btn btn-primary btn-sm rounded-full"
              disabled={isCreatingGoal}
            >
              {isCreatingGoal ? (
                <span className="loading loading-spinner loading-xs" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              {isCreatingGoal ? '생성 중...' : '새 목표 추가'}
            </button>
          </div>

          {goals.length === 0 ? (
            <div className="card bg-base-100">
              <div className="card-body text-center py-12">
                <p className="text-base-content/60">
                  아직 목표가 없습니다. 새 목표를 추가해보세요.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {goals.map((goal) => {
                const IconComponent = getUnifiedIcon(goal.icon as UnifiedIconKey);
                return (
                  <div
                    key={goal.id}
                    onClick={() => handleEditGoal(goal)}
                    className="flex flex-col p-3 sm:p-4 md:p-3 lg:p-2.5 bg-base-100 rounded-lg aspect-square transition-all cursor-pointer hover:shadow-md group"
                  >
                    {/* 상단: 제목 */}
                    <div className="font-bold text-left text-xl sm:text-lg md:text-base lg:text-sm mb-5 sm:mb-4 md:mb-3 lg:mb-2 line-clamp-2">
                      {goal.title}
                    </div>

                    {/* 하단: 아이콘(왼쪽) + 버튼(오른쪽) */}
                    <div className="flex items-end justify-between flex-1">
                      {/* 왼쪽: 아이콘 */}
                      <div
                        className="w-16 h-16 sm:w-18 sm:h-18 md:w-16 md:h-16 lg:w-14 lg:h-14 rounded-full flex items-center justify-center transition-transform group-hover:scale-105"
                        style={{
                          backgroundColor: goal.color,
                        }}
                      >
                        <IconComponent className="w-8 h-8 sm:w-9 sm:h-9 md:w-8 md:h-8 lg:w-7 lg:h-7 text-white" />
                      </div>

                      {/* 오른쪽: 액션 버튼 */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditGoal(goal);
                        }}
                        className="btn btn-md sm:btn-md md:btn-md lg:btn-sm btn-circle bg-black text-white hover:bg-black/80 border-none"
                      >
                        <Pencil className="w-4.5 h-4.5 sm:w-4.5 sm:h-4.5 md:w-5 md:h-5 lg:w-4 lg:h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 목표 편집 모달 */}
      <GoalEditDialog
        open={editDialogOpen}
        editingGoal={editingGoal}
        areas={areas}
        resources={resources}
        projects={filteredProjects}
        onSave={handleSaveEdit}
        onCancel={handleCancelEdit}
        onDelete={handleDeleteClick}
        onGoalChange={setEditingGoal}
        onAddProject={handleAddProject}
        onEditProject={handleEditProject}
        onDeleteProject={handleDeleteProjectClick}
        isCreatingProject={isCreating}
      />

      {/* 삭제 확인 모달 - DaisyUI dialog */}
      {deleteConfirmOpen && goalToDelete && (
        <dialog open className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">목표 삭제</h3>
            <p className="mb-6">
              <strong>{goalToDelete.title}</strong> 목표를 삭제하시겠습니까?
              <br />
              <span className="text-sm text-base-content/60">
                이 작업은 되돌릴 수 없습니다.
              </span>
            </p>
            <div className="modal-action">
              <button onClick={handleCancelDelete} className="btn btn-ghost">
                취소
              </button>
              <button onClick={handleConfirmDelete} className="btn btn-error">
                삭제
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={handleCancelDelete} />
        </dialog>
      )}

      {/* 프로젝트 편집 다이얼로그 */}
      <ProjectEditDialog
        open={projectDialogOpen}
        editingProject={editingProject}
        goals={goals}
        areas={areas}
        resources={resources}
        onSave={handleSaveProject}
        onCancel={handleCancelProjectEdit}
        onDelete={handleDeleteProjectClick}
        onProjectChange={setEditingProject}
      />

      {/* 프로젝트 삭제 확인 모달 - DaisyUI dialog */}
      {projectDeleteConfirmOpen && projectToDelete && (
        <dialog open className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">프로젝트 삭제</h3>
            <p className="mb-6">
              <strong>{projectToDelete.title}</strong> 프로젝트를 삭제하시겠습니까?
              <br />
              <span className="text-sm text-base-content/60">
                이 작업은 되돌릴 수 없습니다.
              </span>
            </p>
            <div className="modal-action">
              <button onClick={handleCancelProjectDelete} className="btn btn-ghost">
                취소
              </button>
              <button onClick={handleConfirmProjectDelete} className="btn btn-error">
                삭제
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={handleCancelProjectDelete} />
        </dialog>
      )}

        {/* 하단 네비게이션 */}
        <SecondBrainBottomNav />
      </div>
    </AuthGuard>
  );
}
