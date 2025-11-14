'use client';

import { useState, useEffect, useMemo } from 'react';
import { useGoalStore } from '@/state/stores/secondBrain/goalStore';
import { useAreaStore } from '@/state/stores/secondBrain/areaStore';
import { useResourceStore } from '@/state/stores/secondBrain/resourceStore';
import { useProjectStore } from '@/state/stores/secondBrain/projectStore';
import { Plus, Pencil, Tag, Palette, Activity, FileText, Layers, Calendar, Target, X } from 'lucide-react';
import SecondBrainBottomNav from '@/components/layout/SecondBrainBottomNav';
import type { CreateGoalInput, Goal, Project } from '@/types/second-brain';
import EnhancedIconBrowserModal from '@/components/ui/EnhancedIconBrowserModal';
import ProjectEditDialog from '@/components/second-brain/ProjectEditDialog';
import { getColorById } from '@/lib/color-palette';
import type { UnifiedIconKey } from '@/lib/icon-collection';
import { getUnifiedIcon } from '@/lib/icon-collection';
import { useModalStore } from '@/state/stores/modalStore';
import { useAuth } from '@/app/context/AuthContext';
import { AuthGuard } from '@/components/auth/AuthGuard';

export default function GoalsPage() {
  const { appUser } = useAuth();
  const { createGoal, updateGoal, deleteGoal, goals, fetchGoals } = useGoalStore();
  const { areas, fetchAreas } = useAreaStore();
  const { resources, fetchResources } = useResourceStore();
  const { projects, fetchProjects, createProject, updateProject, deleteProject } = useProjectStore();

  // 편집 관련 state
  const [editingGoal, setEditingGoal] = useState<(Goal & { isNew?: boolean; paraSelection?: string }) | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [iconBrowserOpen, setIconBrowserOpen] = useState(false);

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

  // 아이콘 변경 핸들러
  const handleIconChange = (iconKey: UnifiedIconKey) => {
    if (editingGoal) {
      setEditingGoal({ ...editingGoal, icon: iconKey });
    }
  };

  // 색상 변경 핸들러
  const handleColorChange = (colorId: string) => {
    if (editingGoal) {
      const color = getColorById(colorId).hex;
      setEditingGoal({ ...editingGoal, color });
    }
  };

  // 저장 핸들러
  const handleSaveEdit = async () => {
    if (!editingGoal || !editingGoal.title.trim() || !appUser?.id) {
      alert('제목을 입력해주세요.');
      return;
    }

    try {
      // paraSelection에서 area_id 또는 resource_id 추출
      let area_id: string | undefined;
      let resource_id: string | undefined;

      if (editingGoal.paraSelection) {
        if (editingGoal.paraSelection.startsWith('area-')) {
          area_id = editingGoal.paraSelection.replace('area-', '');
        } else if (editingGoal.paraSelection.startsWith('resource-')) {
          resource_id = editingGoal.paraSelection.replace('resource-', '');
        }
      }

      if (editingGoal.isNew) {
        // 새 목표 생성
        const goalData: CreateGoalInput = {
          title: editingGoal.title,
          icon: editingGoal.icon,
          color: editingGoal.color,
          status: editingGoal.status,
          area_id,
          resource_id,
          start_date: editingGoal.start_date || undefined,
          end_date: editingGoal.end_date || undefined,
          year_goal: editingGoal.year_goal || undefined,
          quarter_goal: editingGoal.quarter_goal || undefined,
        };
        await createGoal(appUser.id, goalData);
      } else {
        // 기존 목표 수정
        await updateGoal(appUser.id, editingGoal.id, {
          title: editingGoal.title,
          icon: editingGoal.icon,
          color: editingGoal.color,
          status: editingGoal.status,
          area_id,
          resource_id,
          start_date: editingGoal.start_date || undefined,
          end_date: editingGoal.end_date || undefined,
          year_goal: editingGoal.year_goal || undefined,
          quarter_goal: editingGoal.quarter_goal || undefined,
        });
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
          <div className={`max-w-3xl mx-auto px-4 ${process.env.BUILD_TARGET === 'mobile' ? 'pt-10 pb-2' : 'py-4'}`}>
            <h1 className="text-2xl font-bold">목표 (Goals)</h1>
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

      {/* 편집/추가 모달 - DaisyUI dialog */}
      {editDialogOpen && editingGoal && (
        <dialog open className="modal modal-open">
          <div className={`modal-box w-full max-w-7xl px-3 h-screen flex flex-col overflow-hidden ${process.env.BUILD_TARGET === 'web' ? 'pt-0' : ''}`}>
            <div className={`flex-shrink-0 flex items-center justify-between ${process.env.BUILD_TARGET === 'web' ? 'pt-2' : 'pt-[30px]'} pb-4 border-b border-base-300 sticky top-0 bg-base-100 z-10`}>
              <button onClick={handleCancelEdit} className="btn btn-primary btn-sm rounded-full">
                취소
              </button>
              <h3 className="text-lg font-semibold">
                {editingGoal.isNew ? '새 목표 추가' : '목표 편집'}
              </h3>
              <div className="flex gap-2">
                {!editingGoal.isNew && (
                  <button
                    onClick={() => {
                      setEditDialogOpen(false);
                      handleDeleteClick(editingGoal);
                    }}
                    className="btn btn-ghost btn-sm text-error rounded-full"
                  >
                    삭제
                  </button>
                )}
                <button onClick={handleSaveEdit} className="btn btn-primary btn-sm rounded-full">
                  저장
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="p-4">
                {editingGoal && (
                  <>
                    {/* 아이콘 및 제목 - 통합 패턴 적용 */}
                    <div className="my-4">
                      {/* 섹션 제목 */}
                      <label className="flex items-center gap-3 text-lg font-semibold mb-3" style={{ color: '#666666' }}>
                        <Tag className="h-5 w-5" style={{ color: editingGoal.color }} />
                        목표 아이콘 및 제목
                      </label>

                      {/* 아이콘 + 제목 입력 */}
                      <div className="p-3 rounded-lg bg-base-200 border border-base-300">
                        <div className="flex items-center gap-3">
                          {/* 아이콘 버튼 */}
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setIconBrowserOpen(true)}
                              className="flex items-center justify-center w-12 h-12 rounded-lg hover:opacity-80 transition-opacity cursor-pointer group"
                              style={{ backgroundColor: '#f3f4f6' }}
                              title="아이콘 변경하기"
                            >
                              {(() => {
                                const IconComponent = getUnifiedIcon(editingGoal.icon as UnifiedIconKey);
                                return <IconComponent
                                  className="group-hover:scale-110 transition-transform"
                                  style={{ color: editingGoal.color }}
                                  size={24}
                                />;
                              })()}
                            </button>

                            {/* 색상 인디케이터 */}
                            <div
                              className="absolute -bottom-1 -left-1 w-5 h-5 rounded-full flex items-center justify-center shadow-md"
                              style={{
                                backgroundColor: editingGoal.color,
                                border: '2px solid white'
                              }}
                            >
                              <Palette className="w-3 h-3 text-white" strokeWidth={2.5} />
                            </div>
                          </div>

                          {/* 제목 입력 */}
                          <input
                            type="text"
                            value={editingGoal.title}
                            onChange={(e) => setEditingGoal({ ...editingGoal, title: e.target.value })}
                            placeholder="목표 제목을 입력하세요"
                            className="flex-1 bg-base-100 border-0 border-b-2 rounded-none focus:outline-none transition-none"
                            style={{
                              fontSize: '20px',
                              color: '#333333',
                              borderBottomColor: '#D1D5DB',
                              outline: 'none',
                              boxShadow: 'none',
                              fontWeight: '600',
                              height: '44px',
                            }}
                            required
                          />
                        </div>
                      </div>
                    </div>

                    {/* 상태 */}
                    <div className="my-4">
                      {/* 섹션 제목 */}
                      <label className="flex items-center gap-3 text-lg font-semibold mb-3" style={{ color: '#666666' }}>
                        <Activity className="h-5 w-5" style={{ color: editingGoal.color }} />
                        상태
                      </label>

                      {/* 셀렉트 박스 */}
                      <div className="p-3 rounded-lg bg-base-200 border border-base-300">
                        <select
                          value={editingGoal.status}
                          onChange={(e) => setEditingGoal({ ...editingGoal, status: e.target.value as 'not_started' | 'in_progress' | 'completed' | 'suspended' | 'archived' })}
                          className="select select-bordered w-full"
                        >
                          <option value="not_started">시작 안함</option>
                          <option value="in_progress">진행중</option>
                          <option value="completed">완료</option>
                          <option value="suspended">중단</option>
                        </select>
                      </div>
                    </div>

                    {/* 영역/자원 */}
                    <div className="my-4">
                      {/* 섹션 제목 */}
                      <label className="flex items-center gap-3 text-lg font-semibold mb-3" style={{ color: '#666666' }}>
                        <Layers className="h-5 w-5" style={{ color: editingGoal.color }} />
                        영역/자원
                      </label>

                      {/* 셀렉트 박스 */}
                      <div className="p-3 rounded-lg bg-base-200 border border-base-300">
                        <select
                          value={editingGoal.paraSelection}
                          onChange={(e) => setEditingGoal({ ...editingGoal, paraSelection: e.target.value })}
                          className="select select-bordered w-full"
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
                    </div>

                    {/* 시작일/종료일 */}
                    <div className="my-4">
                      {/* 섹션 제목 */}
                      <label className="flex items-center gap-3 text-lg font-semibold mb-3" style={{ color: '#666666' }}>
                        <Calendar className="h-5 w-5" style={{ color: editingGoal.color }} />
                        시작일/종료일
                      </label>

                      {/* 날짜 입력 그리드 */}
                      <div className="p-3 rounded-lg bg-base-200 border border-base-300">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="form-control">
                            <label className="label">
                              <span className="label-text">시작일</span>
                            </label>
                            <input
                              type="date"
                              value={editingGoal.start_date || ''}
                              onChange={(e) => setEditingGoal({ ...editingGoal, start_date: e.target.value })}
                              className="input input-bordered w-full"
                            />
                          </div>

                          <div className="form-control">
                            <label className="label">
                              <span className="label-text">종료일</span>
                            </label>
                            <input
                              type="date"
                              value={editingGoal.end_date || ''}
                              onChange={(e) => setEditingGoal({ ...editingGoal, end_date: e.target.value })}
                              className="input input-bordered w-full"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 연간목표/분기목표 */}
                    <div className="my-4">
                      {/* 섹션 제목 */}
                      <label className="flex items-center gap-3 text-lg font-semibold mb-3" style={{ color: '#666666' }}>
                        <Target className="h-5 w-5" style={{ color: editingGoal.color }} />
                        연간목표/분기목표
                      </label>

                      {/* 입력 그리드 */}
                      <div className="p-3 rounded-lg bg-base-200 border border-base-300">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="form-control">
                            <label className="label">
                              <span className="label-text">연간목표</span>
                            </label>
                            <select
                              value={editingGoal.year_goal || new Date().getFullYear()}
                              onChange={(e) => setEditingGoal({ ...editingGoal, year_goal: parseInt(e.target.value) })}
                              className="select select-bordered w-full"
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
                              <span className="label-text">분기목표</span>
                            </label>
                            <select
                              value={editingGoal.quarter_goal || 'Q1'}
                              onChange={(e) => setEditingGoal({ ...editingGoal, quarter_goal: e.target.value as 'Q1' | 'Q2' | 'Q3' | 'Q4' })}
                              className="select select-bordered w-full"
                            >
                              <option value="Q1">1분기 (1~3월)</option>
                              <option value="Q2">2분기 (4~6월)</option>
                              <option value="Q3">3분기 (7~9월)</option>
                              <option value="Q4">4분기 (10~12월)</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 프로젝트 영역 */}
                    {!editingGoal.isNew && (
                      <div className="card bg-base-200 mb-4">
                        <div className="card-body">
                          <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold">연결된 프로젝트</h2>
                            <button
                              onClick={handleAddProject}
                              className="btn btn-ghost btn-sm"
                              disabled={isCreating}
                            >
                              {isCreating ? (
                                <span className="loading loading-spinner loading-xs" />
                              ) : (
                                <Plus className="w-4 h-4" />
                              )}
                              {isCreating ? '생성 중...' : '추가'}
                            </button>
                          </div>

                          {filteredProjects.length === 0 ? (
                            <div className="text-center py-8 text-base-content/60">
                              연결된 프로젝트가 없습니다.
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {filteredProjects.map((project) => {
                                const ProjectIconComponent = getUnifiedIcon(project.icon as UnifiedIconKey);
                                return (
                                  <div
                                    key={project.id}
                                    onClick={() => handleEditProject(project)}
                                    className="flex items-start gap-3 p-3 bg-base-100 rounded-lg transition-colors cursor-pointer"
                                  >
                                    <div
                                      className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                                      style={{
                                        backgroundColor: project.color,
                                      }}
                                    >
                                      <ProjectIconComponent className="w-5 h-5 text-white" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="font-medium truncate">{project.title}</div>
                                      <div className="text-sm text-base-content/60">
                                        {project.status === 'not_started' && '시작 안함'}
                                        {project.status === 'in_progress' && '진행중'}
                                        {project.status === 'paused' && '중단'}
                                        {project.status === 'completed' && '완료'}
                                      </div>
                                    </div>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteProjectClick(project);
                                      }}
                                      className="btn btn-ghost btn-sm btn-circle flex-shrink-0"
                                      aria-label="프로젝트 제거"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="modal-backdrop" onClick={handleCancelEdit} />
        </dialog>
      )}

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

      {/* 아이콘 브라우저 모달 */}
      <EnhancedIconBrowserModal
        open={iconBrowserOpen}
        onClose={() => setIconBrowserOpen(false)}
        onIconSelect={handleIconChange}
        selectedIcon={editingGoal?.icon}
        selectedColor={editingGoal?.color}
        onColorSelect={handleColorChange}
      />

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
